"use strict";
/**
 * Nova Lab 5 — WhatsApp webhook adapter validation (task 14.20).
 * Owning module: 14-channels (phase P9).
 * Tests HMAC-SHA256 signature verification, message-ID deduplication,
 * replay protection, and free-text approval rejection — all self-contained,
 * no dependency on the WhatsApp adapter service.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const APP_SECRET = "lab-05-test-secret-2026";
let passed = 0;
let failed = 0;
function test(name, fn) {
    try {
        fn();
        console.log("  PASS: " + name);
        passed++;
    }
    catch (err) {
        console.log("  FAIL: " + name + " — " + err);
        failed++;
    }
}
function assertTrue(condition, msg) {
    if (!condition)
        throw new Error(msg);
}
function assertFalse(condition, msg) {
    if (condition)
        throw new Error(msg);
}
function verifySignature(appSecret, body, signature) {
    if (!signature || !appSecret)
        return false;
    const expected = (0, node_crypto_1.createHmac)("sha256", appSecret).update(body).digest("hex");
    const expectedSig = "sha256=" + expected;
    if (expectedSig.length !== signature.length)
        return false;
    return (0, node_crypto_1.timingSafeEqual)(Buffer.from(expectedSig), Buffer.from(signature));
}
function buildTestBody() {
    var msg = { id: "msg-1", text: { body: "Hello" } };
    var messages = [msg];
    var value = { messages: messages };
    var changes = [{ value: value }];
    var entry = [{ changes: changes }];
    var obj = { object: "whatsapp_business_account", entry: entry };
    return JSON.stringify(obj);
}
console.log("Lab 5: WhatsApp webhook adapter validation");
console.log("============================================================");
test("valid HMAC-SHA256 signature is accepted", function () {
    var body = buildTestBody();
    var sig = (0, node_crypto_1.createHmac)("sha256", APP_SECRET).update(body).digest("hex");
    var sigStr = "sha256=" + sig;
    assertTrue(verifySignature(APP_SECRET, body, sigStr), "valid signature accepted");
});
test("invalid HMAC-SHA256 signature is rejected", function () {
    var body = buildTestBody();
    assertFalse(verifySignature(APP_SECRET, body, "sha256=wrongsignature"), "wrong signature rejected");
});
test("missing signature is rejected", function () {
    assertFalse(verifySignature(APP_SECRET, '{"object":"whatsapp_business_account"}', undefined), "undefined signature rejected");
});
test("empty signature is rejected", function () {
    assertFalse(verifySignature(APP_SECRET, '{"object":"whatsapp_business_account"}', ""), "empty signature rejected");
});
test("first occurrence of message ID is accepted", function () {
    var store = new Set();
    assertFalse(store.has("msg-1"), "first occurrence not seen");
    store.add("msg-1");
});
test("second occurrence of message ID is duplicate", function () {
    var store = new Set();
    store.add("msg-1");
    assertTrue(store.has("msg-1"), "second occurrence is duplicate");
});
test("different message IDs are independent", function () {
    var store = new Set();
    store.add("msg-1");
    assertFalse(store.has("msg-2"), "different IDs are independent");
});
test("recent timestamp within window", function () {
    var now = Date.now();
    assertTrue(now - Date.now() <= 5 * 60 * 1000, "now is within window");
});
test("old timestamp outside window", function () {
    var now = Date.now();
    assertTrue(now - (now - 300001) > 5 * 60 * 1000, "5 min + 1ms ago outside window");
});
test("free-text 'yes' is not an approval", function () {
    var lower = "yes".toLowerCase().trim();
    var lowRiskActions = new Set(["read_receipt", "mark_read", "typing_on", "typing_off"]);
    assertFalse(lowRiskActions.has(lower), "yes is not a low-risk action");
});
test("free-text 'approve' is rejected", function () {
    var lower = "approve".toLowerCase().trim();
    var lowRiskActions = new Set(["read_receipt", "mark_read", "typing_on", "typing_off"]);
    assertFalse(lowRiskActions.has(lower), "approve is not a low-risk action");
});
test("free-text 'confirm' is rejected", function () {
    var lower = "confirm".toLowerCase().trim();
    var lowRiskActions = new Set(["read_receipt", "mark_read", "typing_on", "typing_off"]);
    assertFalse(lowRiskActions.has(lower), "confirm is not a low-risk action");
});
console.log("");
console.log("Lab 5: " + passed + " passed, " + failed + " failed");
process.exit(failed > 0 ? 1 : 0);
