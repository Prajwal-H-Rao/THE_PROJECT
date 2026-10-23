# Document Parsing

## Chosen (spec:438)

**PyMuPDF/pdfplumber, python-docx, pandas; OCR only if needed**

## Rationale

- Text/native extraction first (highest fidelity, fastest).
- Scanned documents use isolated OCR workers.
- Parsers are untrusted-input attack surface; use size/page limits and isolated workers.

## Rejected

| Option | Reason |
|--------|--------|
| Browser rendering as the primary parser | High resource usage, slow, introduces browser attack surface. Native extraction libraries are faster, more accurate for digital documents, and have smaller attack surface. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row. Parser libraries and OCR engines update regularly.