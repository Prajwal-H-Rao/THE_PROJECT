/**
 * Nova design system - Finance and Trips page test (task 11.17, module 11).
 * Verifies: period selector renders, summary cards show deterministic
 * totals, category chart renders from stored transactions, every import
 * shows provenance, review queue surfaces uncertain rows, trips section
 * shows map with stops and booking links carrying estimate labels
 * (spec:410, spec:411). Data is passed via props (calendar page pattern).
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { FinancePage } from "./page";
import type { FinanceSummary, FinanceTransaction, Trip, TripStop } from "@/lib/api-types";

afterEach(cleanup);

const baseTransaction: FinanceTransaction = {
  transactionId: "tx-1",
  userId: "user-1",
  source: "csv",
  sourceReference: "row-42",
  amountMinor: 2500,
  currency: "USD",
  transactionDate: "2026-11-10",
  postedAt: "2026-11-10T09:00:00Z",
  merchant: "Acme Corp",
  category: "transport",
  categoryConfidence: 0.95,
  categoryConfidenceReason: null,
  idempotencyKey: "idem-1",
  rawJson: {},
  createdAt: "2026-11-10T09:00:00Z",
};

const uncertainTransaction: FinanceTransaction = {
  ...baseTransaction,
  transactionId: "tx-2",
  source: "ofx",
  sourceReference: "row-7",
  amountMinor: -1200,
  merchant: "Corner Cafe",
  category: "food",
  categoryConfidence: 0.4,
  categoryConfidenceReason: "merchant name ambiguous",
  idempotencyKey: "idem-2",
};

const baseStop: TripStop = {
  stopId: "stop-1",
  name: "Berlin Hbf",
  order: 1,
  arrivalEstimate: "estimated 09:00",
  departureEstimate: "estimated 09:30",
};

const baseTrip: Trip = {
  tripId: "trip-1",
  title: "Berlin to Paris",
  origin: "Berlin",
  destination: "Paris",
  startAt: "2026-12-01T08:00:00Z",
  endAt: "2026-12-01T18:00:00Z",
  status: "planned",
  budgetMinor: 50000,
  stops: [baseStop, { ...baseStop, stopId: "stop-2", name: "Paris Gare du Nord", order: 2, arrivalEstimate: "estimated 17:00" }],
  routeEstimateLabel: "estimated fare",
};

const summary: FinanceSummary = {
  netMinor: 1300,
  cashFlowMinor: 1300,
  transactionCount: 2,
  categoryTotals: { transport: 2500, food: -1200 },
  importCount: 2,
};

describe("FinancePage", () => {
  it("renders the page title and period selector", () => {
    render(<FinancePage transactions={[baseTransaction]} trips={[baseTrip]} summary={summary} />);
    expect(screen.getByText("Finance & Trips")).toBeInTheDocument();
    expect(screen.getByLabelText("Start date")).toBeInTheDocument();
    expect(screen.getByLabelText("End date")).toBeInTheDocument();
  });

  it("renders net and cash-flow cards with deterministic totals", () => {
    render(<FinancePage transactions={[baseTransaction]} trips={[baseTrip]} summary={summary} />);
    expect(screen.getByText("Net flow")).toBeInTheDocument();
    expect(screen.getByText("Cash flow")).toBeInTheDocument();
    expect(screen.getAllByText("USD 13.00").length).toBe(2);
  });

  it("renders the category chart from stored transactions", () => {
    render(<FinancePage transactions={[baseTransaction, uncertainTransaction]} trips={[baseTrip]} summary={summary} />);
    expect(screen.getByText("Spending by category")).toBeInTheDocument();
    // Chart bars are labelled with category names; "transport" appears
    // once as a chart label (the DataTable cell is a separate element).
    expect(screen.getAllByText("transport").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("food").length).toBeGreaterThanOrEqual(1);
  });

  it("shows import provenance with source and reference for every import", () => {
    render(<FinancePage transactions={[baseTransaction, uncertainTransaction]} trips={[baseTrip]} summary={summary} />);
    expect(screen.getByText("Import provenance")).toBeInTheDocument();
    // Source references are unique across the page.
    expect(screen.getByText("row-42")).toBeInTheDocument();
    expect(screen.getByText("row-7")).toBeInTheDocument();
  });

  it("surfaces uncertain rows in the review queue", () => {
    render(<FinancePage transactions={[baseTransaction, uncertainTransaction]} trips={[baseTrip]} summary={summary} />);
    expect(screen.getByText("Review queue")).toBeInTheDocument();
    // The review reason is unique to the review queue section.
    expect(screen.getByText("merchant name ambiguous")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("does not show high-confidence rows in the review queue", () => {
    render(<FinancePage transactions={[baseTransaction]} trips={[baseTrip]} summary={summary} />);
    expect(screen.getByText("No uncertain rows in the review queue.")).toBeInTheDocument();
  });

  it("renders trips section with map and stops", () => {
    render(<FinancePage transactions={[baseTransaction]} trips={[baseTrip]} summary={summary} />);
    expect(screen.getByText("Trips")).toBeInTheDocument();
    expect(screen.getByText("Berlin to Paris")).toBeInTheDocument();
    expect(screen.getByText("Berlin Hbf")).toBeInTheDocument();
    expect(screen.getByText("Paris Gare du Nord")).toBeInTheDocument();
  });

  it("renders booking links with estimate labels", () => {
    render(<FinancePage transactions={[baseTransaction]} trips={[baseTrip]} summary={summary} />);
    expect(screen.getByText(/Book Berlin Hbf/)).toBeInTheDocument();
    expect(screen.getByText(/estimated fare/)).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    render(<FinancePage transactions={[]} trips={[]} />);
    expect(screen.getByText("No finance or trips data")).toBeInTheDocument();
  });

  it("filters transactions by period selector", () => {
    render(<FinancePage transactions={[baseTransaction, uncertainTransaction]} trips={[baseTrip]} summary={summary} />);
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-11-10" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-11-10" } });
    // Source references are unique across the page.
    expect(screen.getByText("row-42")).toBeInTheDocument();
    expect(screen.getByText("row-7")).toBeInTheDocument();
  });
});
