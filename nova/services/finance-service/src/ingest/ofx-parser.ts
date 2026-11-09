/**
 * Nova design system - OFX import parser (task 11.2, module 11).
 * Parses OFX SGML bank statement exports. Pure function: text ->
 * NormalizedTransaction[], no pg, no credentials.
 * Spec:826 integer minor units; Spec:741 isolated import parser.
 */

import { parseAmount, parseDate, NormalizedTransaction } from "./normalize.js";

// Purpose: extract all <STMTTRN>...</STMTTRN> blocks from OFX text.
function stmttrnBlocks(text: string): string[] {
  const blocks: string[] = [];
  let idx = 0;
  const open = "<STMTTRN>";
  const close = "</STMTTRN>";
  while (true) {
    const start = text.indexOf(open, idx);
    if (start === -1) break;
    const end = text.indexOf(close, start);
    if (end === -1) break;
    blocks.push(text.slice(start + open.length, end));
    idx = end + close.length;
  }
  return blocks;
}

// Purpose: extract the inner text of a single XML-like tag within a block.
function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  return m ? (m[1] ?? "").trim() : "";
}

// Purpose: parse OFX text into NormalizedTransaction[].
export function parseOFX(text: string): NormalizedTransaction[] {
  const txns: NormalizedTransaction[] = [];
  for (const block of stmttrnBlocks(text)) {
    const trntype = tag(block, "TRNTYPE").toUpperCase();
    const dtposted = tag(block, "DTPOSTED");
    const trnamt = tag(block, "TRNAMT");
    const name = tag(block, "NAME");
    const fitid = tag(block, "FITID");

    if (!dtposted || !trnamt) continue;

    const amountMinor = parseAmount(trnamt, "en-US");
    const transactionDate = parseDate(dtposted, "en-US");
    const postedAt = transactionDate;
    const merchant = name || "Unknown";
    const sourceReference = fitid || `ofx-${dtposted}-${trnamt}-${merchant}`;

    txns.push({
      amountMinor,
      currency: "USD",
      transactionDate,
      postedAt,
      merchant,
      sourceReference,
      rawJson: {},
    });
  }
  return txns;
}
