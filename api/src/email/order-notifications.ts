import type { ApiEnv } from "../types/env.js";
import { squareApi } from "../services/square-api.js";
import {
  renderCustomerOrderEmail,
  renderInternalOrderEmail,
  type OrderEmailData,
  type OrderEmailAddresses,
} from "./order-templates.js";
import { emailSendingEnabled, sendEmailWithSmtp } from "./smtp.js";

type SquareMoney = { amount?: number; currency?: string };
type SquareRecipient = {
  display_name?: string;
  email_address?: string;
  phone_number?: string;
};
type SquareOrder = {
  id: string;
  version: number;
  reference_id?: string;
  customer_id?: string;
  total_money?: SquareMoney;
  metadata?: Record<string, string>;
  line_items?: Array<{
    name?: string;
    variation_name?: string;
    quantity?: string;
    note?: string;
    total_money?: SquareMoney;
    gross_sales_money?: SquareMoney;
    base_price_money?: SquareMoney;
    modifiers?: Array<{ name?: string }>;
  }>;
  fulfillments?: Array<{
    pickup_details?: {
      pickup_at?: string;
      recipient?: SquareRecipient;
    };
  }>;
};
type SquareCustomer = {
  given_name?: string;
  family_name?: string;
  email_address?: string;
  phone_number?: string;
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    address_line_3?: string;
    locality?: string;
    administrative_district_level_1?: string;
    postal_code?: string;
    country?: string;
  };
};
type EmailState = {
  claim?: string;
  at?: string;
  customer?: boolean;
  internal?: boolean;
};

const claimDurationMs = 10 * 60 * 1000;

function emailAddresses(env: ApiEnv): OrderEmailAddresses {
  const hello = env.SMTP_HELLO_USERNAME?.trim().toLowerCase();
  const orders = env.SMTP_ORDERS_USERNAME?.trim().toLowerCase();
  if (!hello || !orders) throw new Error("Order email addresses are not configured");
  return { hello, orders };
}

function parseState(value: string | undefined): EmailState {
  if (!value) return {};
  try {
    const state = JSON.parse(value) as EmailState;
    return state && typeof state === "object" ? state : {};
  } catch {
    return {};
  }
}

export function formatPickup(order: SquareOrder, timeZone: string): string {
  const metadata = order.metadata ?? {};
  if (metadata.cc_event_date) return metadata.cc_event_date;
  if (metadata.pickup_local) {
    // pickup_local is already the customer-selected Perth wall time. Parse it
    // as a display-only UTC value so formatting cannot apply Perth's +08:00 a
    // second time (08:08 must stay 08:08 in the email).
    const value = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(metadata.pickup_local)
      ? new Date(`${metadata.pickup_local}:00Z`)
      : new Date(Number.NaN);
    if (!Number.isNaN(value.getTime())) {
      return new Intl.DateTimeFormat("en-AU", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(value);
    }
    return metadata.pickup_local;
  }
  const pickupAt = order.fulfillments?.find((entry) => entry.pickup_details?.pickup_at)
    ?.pickup_details?.pickup_at;
  if (pickupAt) {
    return new Intl.DateTimeFormat("en-AU", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone,
    }).format(new Date(pickupAt));
  }
  return "Pickup details will be confirmed separately";
}

function orderType(order: SquareOrder): string {
  if (order.metadata?.cc_order_type === "host") return "Host / Event Package";
  if (order.metadata?.pickup_local) return "Custom Cake";
  return "Daily Menu";
}

function formatCustomerAddress(address: SquareCustomer["address"]): string {
  if (!address) return "";
  const region = [
    address.administrative_district_level_1,
    address.postal_code,
  ].filter(Boolean).join(" ");
  const country = address.country && address.country !== "AU"
    ? address.country
    : "";
  return [
    address.address_line_1,
    address.address_line_2,
    address.address_line_3,
    address.locality,
    region,
    country,
  ].map((part) => part?.trim()).filter(Boolean).join(", ");
}

async function customerForOrder(env: ApiEnv, order: SquareOrder): Promise<SquareCustomer> {
  if (!order.customer_id) return {};
  try {
    const response = await squareApi<{ customer?: SquareCustomer }>(
      env,
      `/v2/customers/${encodeURIComponent(order.customer_id)}`,
    );
    return response.customer ?? {};
  } catch {
    return {};
  }
}

async function toEmailData(env: ApiEnv, order: SquareOrder): Promise<OrderEmailData> {
  const customer = await customerForOrder(env, order);
  const recipient = order.fulfillments?.find((entry) => entry.pickup_details?.recipient)
    ?.pickup_details?.recipient;
  const customerName = recipient?.display_name?.trim() ||
    [customer.given_name, customer.family_name].filter(Boolean).join(" ") ||
    "Customer";
  const customerEmail = recipient?.email_address?.trim().toLowerCase() ||
    customer.email_address?.trim().toLowerCase() ||
    "";
  const customerPhone = recipient?.phone_number?.trim() ||
    customer.phone_number?.trim() ||
    "Not provided";
  const currency = order.total_money?.currency ?? "AUD";
  const notes = (order.line_items ?? [])
    .map((item) => item.note?.trim())
    .filter((note): note is string => Boolean(note))
    .join("\n");

  return {
    orderNumber: order.reference_id || order.id,
    orderType: orderType(order),
    customerName,
    customerEmail,
    customerPhone,
    customerAddress: formatCustomerAddress(customer.address) || undefined,
    pickup: formatPickup(order, env.SQUARE_TIMEZONE || "Australia/Perth"),
    total: order.total_money?.amount ?? 0,
    currency,
    items: (order.line_items ?? []).map((item) => {
      const quantity = Math.max(1, Number.parseInt(item.quantity ?? "1", 10) || 1);
      const amount = item.total_money?.amount ??
        item.gross_sales_money?.amount ??
        (item.base_price_money?.amount ?? 0) * quantity;
      const details = [
        item.variation_name,
        item.modifiers?.map((modifier) => modifier.name).filter(Boolean).join(", "),
      ].filter(Boolean).join(" · ");
      return {
        name: item.name || "Order item",
        details: details || undefined,
        quantity,
        total: amount,
      };
    }),
    notes: notes || undefined,
  };
}

async function getOrder(env: ApiEnv, orderId: string): Promise<SquareOrder> {
  const response = await squareApi<{ order: SquareOrder }>(
    env,
    `/v2/orders/${encodeURIComponent(orderId)}`,
  );
  return response.order;
}

async function writeState(
  env: ApiEnv,
  order: SquareOrder,
  state: EmailState,
): Promise<SquareOrder> {
  const response = await squareApi<{ order: SquareOrder }>(env, `/v2/orders/${encodeURIComponent(order.id)}`, {
    idempotency_key: crypto.randomUUID(),
    order: {
      version: order.version,
      location_id: env.SQUARE_LOCATION_ID,
      metadata: {
        ...(order.metadata ?? {}),
        cc_email_state: JSON.stringify(state),
      },
    },
  });
  return response.order;
}

async function updateClaimState(
  env: ApiEnv,
  orderId: string,
  claim: string,
  patch: Partial<EmailState>,
): Promise<SquareOrder> {
  const order = await getOrder(env, orderId);
  const current = parseState(order.metadata?.cc_email_state);
  if (current.claim !== claim) throw new Error("Email notification claim was lost");
  return writeState(env, order, { ...current, ...patch, claim });
}

export async function sendPaidOrderNotifications(
  env: ApiEnv,
  orderId: string,
): Promise<void> {
  if (!emailSendingEnabled(env)) return;

  let order = await getOrder(env, orderId);
  const existing = parseState(order.metadata?.cc_email_state);
  if (existing.customer && existing.internal) return;
  if (
    existing.claim &&
    existing.at &&
    Date.now() - new Date(existing.at).getTime() < claimDurationMs
  ) {
    throw new Error("Email notification is already in progress");
  }

  const claim = crypto.randomUUID();
  order = await writeState(env, order, {
    ...existing,
    claim,
    at: new Date().toISOString(),
  });

  try {
    const data = await toEmailData(env, order);
    const addresses = emailAddresses(env);
    let state = parseState(order.metadata?.cc_email_state);

    if (!state.customer) {
      if (data.customerEmail) {
        await sendEmailWithSmtp(env, renderCustomerOrderEmail(data, addresses));
      }
      order = await updateClaimState(env, orderId, claim, { customer: true });
      state = parseState(order.metadata?.cc_email_state);
    }

    if (!state.internal) {
      await sendEmailWithSmtp(env, renderInternalOrderEmail(data, addresses));
      await updateClaimState(env, orderId, claim, { internal: true });
    }
  } catch (error) {
    try {
      const latest = await getOrder(env, orderId);
      const state = parseState(latest.metadata?.cc_email_state);
      if (state.claim === claim) {
        await writeState(env, latest, { ...state, claim: "", at: "" });
      }
    } catch {
      // The webhook will retry; a stale claim can be recovered after its timeout.
    }
    throw error;
  }
}
