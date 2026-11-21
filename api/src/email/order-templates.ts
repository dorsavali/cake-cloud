export type OrderEmailItem = {
  name: string;
  details?: string;
  quantity: number;
  total: number;
};

export type OrderEmailData = {
  orderNumber: string;
  orderType: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  pickup: string;
  total: number;
  currency: string;
  items: OrderEmailItem[];
  notes?: string;
};

export type RenderedEmail = {
  subject: string;
  from: string;
  replyTo: string;
  to: string;
  html: string;
  text: string;
};

export type OrderEmailAddresses = {
  hello: string;
  orders: string;
};

const publicContactEmail = "info@cake-cloud.com.au";
const emailFooterLogoUrl = "https://cake-cloud.com.au/images/logo/logoEmail.png";
const googleReviewsUrl =
  "https://www.google.com/maps/search/?api=1&query=Cake+Cloud+181+Adelaide+Terrace+Perth+WA+6004";

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );

const money = (amount: number, currency: string) =>
  `${new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100)} ${currency}`;

const itemRows = (data: OrderEmailData) =>
  data.items
    .map(
      (item) => `
        <tr>
          <td class="item-cell" style="padding:16px 0;border-bottom:1px solid #e4dac7;vertical-align:top;">
            <div class="item-name" style="font-size:15px;font-weight:600;color:#464248;">${escapeHtml(item.name)}</div>
            ${item.details ? `<div class="item-details" style="padding-top:4px;font-size:13px;line-height:19px;color:#777177;">${escapeHtml(item.details)}</div>` : ""}
          </td>
          <td class="item-quantity" style="padding:16px 12px;border-bottom:1px solid #e4dac7;text-align:center;vertical-align:top;font-size:14px;color:#777177;">×${item.quantity}</td>
          <td class="item-price" style="padding:16px 0;border-bottom:1px solid #e4dac7;text-align:right;vertical-align:top;white-space:nowrap;font-size:14px;font-weight:600;color:#464248;">${escapeHtml(money(item.total, data.currency))}</td>
        </tr>`,
    )
    .join("");

const detailRow = (label: string, value: string) => `
  <tr>
    <td class="detail-label" style="padding:7px 0;color:#777177;font-size:13px;vertical-align:top;">${escapeHtml(label)}</td>
    <td class="detail-value" style="padding:7px 0 7px 20px;color:#464248;font-size:14px;font-weight:600;text-align:right;vertical-align:top;">${escapeHtml(value)}</td>
  </tr>`;

function emailDocument({
  preheader,
  eyebrow,
  title,
  introduction,
  content,
  supportEmail,
  reviewUrl,
}: {
  preheader: string;
  eyebrow: string;
  title: string;
  introduction: string;
  content: string;
  supportEmail: string;
  reviewUrl?: string;
}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      a[x-apple-data-detectors],
      u + #body a,
      #MessageViewBody a {
        color: inherit !important;
        font-family: inherit !important;
        font-size: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
        text-decoration: none !important;
      }
      .support-link,
      .support-link:visited {
        color: #f0dfb9 !important;
        text-decoration: none !important;
      }
      @media only screen and (max-width: 600px) {
        .page-pad { padding: 8px 4px !important; }
        .email-card { border-radius: 12px !important; }
        .brand { padding: 18px 14px 16px !important; }
        .brand-title { font-size: 22px !important; line-height: 26px !important; }
        .brand-location { padding-top: 4px !important; font-size: 8px !important; letter-spacing: 1.7px !important; }
        .email-header { padding: 20px 17px 6px !important; }
        .email-eyebrow { font-size: 8px !important; letter-spacing: 1.2px !important; }
        .email-title { margin-top: 6px !important; font-size: 18px !important; line-height: 23px !important; }
        .email-intro { margin-top: 9px !important; font-size: 11px !important; line-height: 17px !important; }
        .email-content { padding: 10px 17px 22px !important; }
        .detail-card { margin-bottom: 15px !important; }
        .detail-card-cell { padding: 10px 12px !important; }
        .detail-label { padding: 4px 0 !important; font-size: 9px !important; }
        .detail-value { padding: 4px 0 4px 10px !important; font-size: 10px !important; }
        .item-cell, .item-quantity, .item-price { padding-top: 9px !important; padding-bottom: 9px !important; }
        .item-name { font-size: 11px !important; line-height: 15px !important; }
        .item-details { padding-top: 2px !important; font-size: 9px !important; line-height: 13px !important; }
        .item-quantity { padding-left: 5px !important; padding-right: 5px !important; font-size: 10px !important; }
        .item-price { font-size: 10px !important; }
        .total-label { padding-top: 11px !important; font-size: 10px !important; }
        .total-value { padding-top: 11px !important; font-size: 14px !important; }
        .email-note { margin-top: 15px !important; padding: 10px 11px !important; font-size: 10px !important; line-height: 15px !important; }
        .email-footer { padding: 16px 14px !important; }
        .email-footer, .email-footer a { font-size: 9px !important; line-height: 14px !important; }
      }
    </style>
  </head>
  <body id="body" style="margin:0;padding:0;background:#eee8dc;color:#464248;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eee8dc;">
      <tr>
        <td class="page-pad" align="center" style="padding:28px 12px;">
          <table class="email-card" role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;background:#faf7f0;border:1px solid #d8c9aa;border-radius:18px;overflow:hidden;box-shadow:0 8px 26px rgba(70,66,72,.08);">
            <tr>
              <td class="brand" align="center" style="padding:30px 24px 26px;background:#718d7f;border-bottom:4px solid #b9a47a;">
                <div class="brand-title" style="font-family:kalnia;font-size:30px;line-height:34px;letter-spacing:.5px;color:#faf7f0;">Cake Cloud</div>
                <div class="brand-location" style="padding-top:7px;font-size:10px;letter-spacing:2.6px;text-transform:uppercase;color:#f1eadc;">East Perth · Western Australia</div>
              </td>
            </tr>
            <tr>
              <td class="email-header" style="padding:34px 34px 10px;">
                <div class="email-eyebrow" style="font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#718d7f;">${escapeHtml(eyebrow)}</div>
                <h1 class="email-title" style="margin:9px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:33px;font-weight:500;color:#464248;">${escapeHtml(title)}</h1>
                <p class="email-intro" style="margin:15px 0 0;font-size:14px;line-height:22px;color:#6f696f;">${escapeHtml(introduction)}</p>
              </td>
            </tr>
            <tr>
              <td class="email-content" style="padding:16px 34px 36px;">${content}</td>
            </tr>
            <tr>
              <td class="email-footer" align="center" style="padding:24px 28px;background:#464248;color:#faf7f0;">
                <img src="${emailFooterLogoUrl}" width="80" alt="Cake Cloud" style="display:block;width:80px;height:auto;margin:0 auto 15px;border:0;outline:none;text-decoration:none;">
                ${reviewUrl ? `<div style="margin:0 0 17px;padding:0 0 17px;border-bottom:1px solid rgba(250,247,240,.18);">
                  <div style="font-size:12px;line-height:18px;color:#faf7f0;">If you enjoyed your order, don&#39;t forget to leave us a review on Google.</div>
                  <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;margin-top:10px;padding:9px 17px;border:1px solid #b9a47a;border-radius:999px;background:#718d7f;color:#faf7f0!important;font-size:12px;font-weight:700;line-height:16px;text-decoration:none;">Rate us on Google</a>
                </div>` : ""}
                <div style="font-size:12px;line-height:18px;color:#d7d0c8;">This email was sent automatically. Please do not reply, as this inbox is not monitored.</div>
                <div style="padding-top:8px;font-size:12px;line-height:18px;color:#faf7f0;">Need help? Email us at</div>
                <a class="support-link" href="mailto:${escapeHtml(supportEmail)}" style="display:inline-block;padding-top:4px;color:#f0dfb9!important;font-size:13px;font-weight:700;text-decoration:none;">${escapeHtml(supportEmail)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const orderTable = (data: OrderEmailData) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
    <tr>
      <td colspan="3" style="padding:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8a8174;">Order summary</td>
    </tr>
    ${itemRows(data)}
    <tr>
      <td class="total-label" colspan="2" style="padding:18px 12px 0 0;text-align:right;font-size:14px;font-weight:700;color:#464248;">Total paid</td>
      <td class="total-value" style="padding:18px 0 0;text-align:right;white-space:nowrap;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#718d7f;">${escapeHtml(money(data.total, data.currency))}</td>
    </tr>
  </table>`;

export function renderCustomerOrderEmail(
  data: OrderEmailData,
  addresses: OrderEmailAddresses,
): RenderedEmail {
  const subject = `Your Cake Cloud order ${data.orderNumber} is confirmed`;
  const html = emailDocument({
    preheader: `We have received your paid order ${data.orderNumber}.`,
    eyebrow: "Order confirmed",
    title: `Thank you, ${data.customerName}!`,
    introduction: "Your payment was successful and your order is now with our kitchen. Please keep this email handy for pickup.",
    supportEmail: publicContactEmail,
    reviewUrl: googleReviewsUrl,
    content: `
      <table class="detail-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-bottom:24px;background:#f3eee5;border:1px solid #ded1b8;border-radius:12px;">
        <tr><td class="detail-card-cell" style="padding:18px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${detailRow("Order number", data.orderNumber)}
            ${detailRow("Order type", data.orderType)}
            ${detailRow("Pickup", data.pickup)}
          </table>
        </td></tr>
      </table>
      ${orderTable(data)}
      <div class="email-note" style="margin-top:26px;padding:17px 19px;border-left:4px solid #b9a47a;background:#f3eee5;font-size:13px;line-height:21px;color:#6f696f;">
        Pickup is from <strong style="color:#464248;">181 Adelaide Terrace, Perth WA 6004</strong>. Please have your order number ready.
      </div>`,
  });

  const text = [
    `Your Cake Cloud order ${data.orderNumber} is confirmed`,
    `Hi ${data.customerName}, your payment was successful.`,
    `Pickup: ${data.pickup}`,
    ...data.items.map((item) => `${item.quantity} x ${item.name} — ${money(item.total, data.currency)}`),
    `Total paid: ${money(data.total, data.currency)}`,
    "If you enjoyed your order, don't forget to leave us a review on Google.",
    `Rate us on Google: ${googleReviewsUrl}`,
    "This email was sent automatically. Please do not reply, as this inbox is not monitored.",
    `Need help? Email ${publicContactEmail}`,
  ].join("\n");

  return {
    subject,
    from: `Cake Cloud <${addresses.hello}>`,
    replyTo: publicContactEmail,
    to: data.customerEmail,
    html,
    text,
  };
}

export function renderInternalOrderEmail(
  data: OrderEmailData,
  addresses: OrderEmailAddresses,
): RenderedEmail {
  const subject = `New paid order ${data.orderNumber} · ${data.customerName}`;
  const html = emailDocument({
    preheader: `${data.orderType} order paid by ${data.customerName}.`,
    eyebrow: "New paid order",
    title: `${data.orderNumber} is ready to prepare`,
    introduction: "Square has confirmed payment. The complete customer and preparation details are below.",
    supportEmail: publicContactEmail,
    content: `
      <table class="detail-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-bottom:24px;background:#f3eee5;border:1px solid #ded1b8;border-radius:12px;">
        <tr><td class="detail-card-cell" style="padding:18px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${detailRow("Order number", data.orderNumber)}
            ${detailRow("Type", data.orderType)}
            ${detailRow("Pickup", data.pickup)}
            ${detailRow("Customer", data.customerName)}
            ${detailRow("Email", data.customerEmail)}
            ${detailRow("Phone", data.customerPhone)}
            ${data.customerAddress ? detailRow("Address", data.customerAddress) : ""}
          </table>
        </td></tr>
      </table>
      ${orderTable(data)}
      ${data.notes ? `<div class="email-note" style="margin-top:26px;padding:17px 19px;border-left:4px solid #b9a47a;background:#fff8ea;font-size:13px;line-height:21px;color:#6f696f;"><strong style="display:block;padding-bottom:5px;color:#464248;">Customer notes</strong>${escapeHtml(data.notes)}</div>` : ""}`,
  });

  const text = [
    `New paid order ${data.orderNumber}`,
    `${data.customerName} · ${data.customerEmail} · ${data.customerPhone}`,
    data.customerAddress ? `Address: ${data.customerAddress}` : "",
    `Pickup: ${data.pickup}`,
    ...data.items.map((item) => `${item.quantity} x ${item.name} — ${money(item.total, data.currency)}`),
    `Total paid: ${money(data.total, data.currency)}`,
    data.notes ? `Notes: ${data.notes}` : "",
  ].filter(Boolean).join("\n");

  return {
    subject,
    from: `Cake Cloud Orders <${addresses.orders}>`,
    replyTo: data.customerEmail,
    to: addresses.orders,
    html,
    text,
  };
}
