import { test } from "node:test";
import assert from "node:assert/strict";

import {
  renderCustomerOrderEmail,
  renderCustomerSubmissionEmail,
  renderInternalOrderEmail,
  renderInternalSubmissionEmail,
} from "../dist/email/order-templates.js";
import { buildMimeMessage } from "../dist/email/smtp.js";
import { formatPickup, sendPaidOrderNotifications } from "../dist/email/order-notifications.js";

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
  hello: "customer-orders@example.test",
  orders: "internal-orders@example.test",
};

test("customer and internal order emails use the configured mailboxes", () => {
  const customer = renderCustomerOrderEmail(order, addresses);
  const internal = renderInternalOrderEmail(order, addresses);

  assert.equal(customer.to, "buyer@example.com");
  assert.match(customer.subject, /CC-TEST/);
  assert.match(customer.from, /customer-orders@example\.test/);
  assert.equal(customer.replyTo, "info@cake-cloud.com.au");
  assert.equal(internal.to, "internal-orders@example.test");
  assert.match(internal.subject, /CC-TEST/);
  assert.match(internal.from, /internal-orders@example\.test/);
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

test("email MIME contains both text and HTML alternatives", () => {
  const mime = buildMimeMessage(renderCustomerOrderEmail(order, addresses));
  assert.match(mime, /Content-Type: multipart\/alternative/);
  assert.match(mime, /Content-Type: text\/plain; charset=UTF-8/);
  assert.match(mime, /Content-Type: text\/html; charset=UTF-8/);
  assert.match(mime, /To: buyer@example\.com/);
});

test("form submissions email Orders and confirm the customer from Hello", () => {
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

  assert.equal(customer.from, "Cake Cloud <customer-orders@example.test>");
  assert.equal(customer.to, "customer@example.com");
  assert.match(customer.subject, /FC-12AB34CD/);
  assert.match(customer.text, /contact you within 24 hours/i);
  assert.equal(internal.from, "Cake Cloud Orders <internal-orders@example.test>");
  assert.equal(internal.to, "internal-orders@example.test");
  assert.equal(internal.replyTo, "customer@example.com");
  assert.match(internal.subject, /FC-12AB34CD/);
  assert.match(internal.text, /briefs\/test-id\//);
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
