/**
 * Nova design system - OFX parser test (task 11.2, module 11).
 * Test-first: written before the parser. Confirmed failing, then passing.
 * Each fixture imports: OFX STMTTRN blocks map to integer minor units,
 * ISO dates, merchant/memo, FITID as stable sourceReference.
 * Spec:826 integer minor units only; Spec:741 isolated parser.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { parseOFX } from "./ofx-parser.js";

const OFX_HEADER = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
FILETYPE:OFX
`;
const SIGNON = `<SONRS><STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS></SONRS>`;

function stmttrn(trntype: string, dtposted: string, trnamt: string, name: string, memo: string, fitid: string): string {
  return `<STMTTRN><TRNTYPE>${trntype}</TRNTYPE><DTPOSTED>${dtposted}</DTPOSTED><TRNAMT>${trnamt}</TRNAMT><NAME>${name}</NAME><MEMO>${memo}</MEMO><FITID>${fitid}</FITID></STMTTRN>`;
}

function ofxBody(...trns: string[]): string {
  return `<STMTTRNRS><STMTRS><BANKACCTFROM><BANKID>123</BANKID><ACCTID>456</ACCTID><ACCTTYPE>CHECKING</ACCTTYPE></BANKACCTFROM></STMTRS>${trns.join("")}</STMTTRNRS>`;
}

function ofx(fixtures: string[]): string {
  return `${OFX_HEADER}<OFX>${SIGNON}<BANKMSGSRSV1>${ofxBody(...fixtures)}</BANKMSGSRSV1></OFX>`;
}

function first<T>(arr: T[]): T {
  assert.ok(arr.length > 0, "expected at least one row");
  return arr[0]!;
}

describe("parseOFX", () => {
  it("imports an OFX fixture with debit and credit transactions", () => {
    const ofxText = ofx([
      stmttrn("DEBIT", "20261105120000", "-1234.56", "Grocery Store", "Weekly shop", "FITID-001"),
      stmttrn("CREDIT", "20261106090000", "75.00", "Employer", "Salary", "FITID-002"),
    ]);
    const txns = parseOFX(ofxText);
    assert.strictEqual(txns.length, 2);
    const t0 = first(txns);
    const t1 = txns[1]!;
    assert.strictEqual(t0.amountMinor, -123456);
    assert.strictEqual(t0.currency, "USD");
    assert.strictEqual(t0.transactionDate, "2026-11-05");
    assert.strictEqual(t0.merchant, "Grocery Store");
    assert.strictEqual(t0.sourceReference, "FITID-001");
    assert.strictEqual(t1.amountMinor, 7500);
    assert.strictEqual(t1.transactionDate, "2026-11-06");
    assert.strictEqual(t1.merchant, "Employer");
  });

  it("parses OFX DTPOSTED with fractional seconds and timezone", () => {
    const ofxText = ofx([stmttrn("DEBIT", "20261105120000.500[-5:EST]", "-10.00", "Shop", "m", "FITID-tz")]);
    const txns = parseOFX(ofxText);
    assert.strictEqual(txns.length, 1);
    const t0 = first(txns);
    assert.strictEqual(t0.amountMinor, -1000);
    assert.strictEqual(t0.transactionDate, "2026-11-05");
    assert.strictEqual(t0.sourceReference, "FITID-tz");
  });

  it("returns an empty array for an OFX with no STMTTRN blocks", () => {
    const ofxText = `${OFX_HEADER}<OFX>${SIGNON}</OFX>`;
    const txns = parseOFX(ofxText);
    assert.strictEqual(txns.length, 0);
  });
});
