import { test } from "node:test";
import assert from "node:assert/strict";

import {
  renderCustomerOrderEmail,
  renderCustomerSubmissionEmail,
  renderInternalOrderEmail,
  renderInternalSubmissionEmail,
} from "../dist/email/order-templates.js";
import { sendEmail } from "../dist/email/delivery.js";
import { formatPickup, sendPaidOrderNotifications } from "../dist/email/order-notifications.js";
import { sendSubmissionNotifications } from "../dist/email/submission-notifications.js";

const order = {
  orderNumber: "CC-TEST",
  orderType: "Daily Menu",
  customerName: "Test <Buyer>",
  customerEmail: "buyer@example.com",
  customerPhone: "+61 400 000 000",
  customerAddress: "1 <Cloud> Street & East Perth",
  pickup: "Friday at 10:00 AM",
  total: 1250,
  currency: "AUD",
  items: [{ name: "Cloud Cake", quantity: 1, total: 1250 }],
};
const addresses = {
  sender: "welcome@example.test",
  orders: "internal-orders@example.test",
};

test("customer and internal order emails use the configured mailboxes", () => {
  const customer = renderCustomerOrderEmail(order, addresses);
  const internal = renderInternalOrderEmail(order, addresses);

  assert.equal(customer.to, "buyer@example.com");
  assert.match(customer.subject, /CC-TEST/);
  assert.deepEqual(customer.from, { email: addresses.sender, name: "Cake Cloud" });
  assert.equal(customer.replyTo, "info@cake-cloud.com.au");
  assert.equal(internal.to, "internal-orders@example.test");
  assert.match(internal.subject, /CC-TEST/);
  assert.deepEqual(internal.from, { email: addresses.sender, name: "Cake Cloud Orders" });
  assert.equal(internal.replyTo, "buyer@example.com");
  assert.match(internal.html, /Address/);
  assert.match(internal.html, /1 &lt;Cloud&gt; Street &amp; East Perth/);
  assert.match(internal.text, /Address: 1 <Cloud> Street & East Perth/);
  assert.match(customer.html, /Test &lt;Buyer&gt;/);
  assert.doesNotMatch(customer.html, /Test <Buyer>/);
  assert.match(customer.html, /@media only screen and \(max-width: 600px\)/);
  assert.match(customer.html, /a\[x-apple-data-detectors\]/);
  assert.match(customer.html, /font-size: 18px !important/);
  assert.match(customer.html, /images\/logo\/logoEmail\.png/);
  assert.match(customer.html, /Please do not reply/);
  assert.match(customer.html, /mailto:info@cake-cloud\.com\.au/);
  assert.match(customer.text, /Need help\? Email info@cake-cloud\.com\.au/);
  assert.match(customer.html, /Rate us on Google/);
  assert.match(customer.html, /google\.com\/maps\/search/);
  assert.match(customer.text, /leave us a review on Google/);
  assert.doesNotMatch(internal.html, /Rate us on Google/);
});

test("Cloudflare EMAIL receives the rendered order message", async () => {
  const messages = [];
  const message = renderCustomerOrderEmail(order, addresses);
  await sendEmail({
    EMAIL_ENABLED: "true",
    EMAIL: { async send(payload) {
      messages.push(payload);
      return { messageId: "test-id" };
    } },
  }, message);
  assert.deepEqual(messages, [message]);
  assert.match(messages[0].html, /Order number/);
  assert.match(messages[0].text, /payment was successful/i);
  assert.equal(messages[0].to, order.customerEmail);
});

test("form submissions send to Orders and the customer through the same binding", async () => {
  const submission = {
    reference: "FC-12AB34CD",
    submissionType: "Custom cake brief",
    customerName: "Test Customer",
    customerEmail: "customer@example.com",
    customerPhone: "+61 412 345 678",
    requestedDate: "2026-12-01",
    details: [{ label: "Reference images", value: "2" }],
    storagePath: "briefs/test-id/",
  };
  const customer = renderCustomerSubmissionEmail(submission, addresses);
  const internal = renderInternalSubmissionEmail(submission, addresses);

  assert.deepEqual(customer.from, { name: "Cake Cloud", email: addresses.sender });
  assert.equal(customer.to, "customer@example.com");
  assert.match(customer.subject, /FC-12AB34CD/);
  assert.match(customer.text, /contact you within 24 hours/i);
  assert.deepEqual(internal.from, { name: "Cake Cloud Orders", email: addresses.sender });
  assert.equal(internal.to, "internal-orders@example.test");
  assert.equal(internal.replyTo, "customer@example.com");
  assert.match(internal.subject, /FC-12AB34CD/);
  assert.match(internal.text, /briefs\/test-id\//);

  const messages = [];
  await sendSubmissionNotifications({
    EMAIL_ENABLED: "true",
    EMAIL_FROM: addresses.sender,
    EMAIL_ORDERS_TO: addresses.orders,
    EMAIL: { async send(payload) {
      messages.push(payload);
      return { messageId: "test-id" };
    } },
  }, submission);
  assert.deepEqual(messages, [internal, customer]);
});

test("paid-order notifications do nothing until email is enabled", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Square should not be called while email is disabled");
  });
  await sendPaidOrderNotifications({ EMAIL_ENABLED: "false" }, "order-id");
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("custom cake email preserves the customer-entered Perth pickup time", () => {
  const pickup = formatPickup(
    { metadata: { pickup_local: "2026-11-27T08:08" } },
    "Australia/Perth",
  );
  assert.match(pickup, /8:08\s*am/i);
  assert.doesNotMatch(pickup, /4:08\s*pm/i);
});
