/**
 * Tests for the ExtractionReview component (task 12.8).
 * Verifies fields render with provenance and unknown fields are marked.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ExtractionReview } from "./extraction-review";
import type { ProfileCandidateFields } from "@/lib/api-types";

afterEach(() => {
  document.body.innerHTML = "";
});

function makeField<T>(
  value: T,
  sourceRef: string,
  method: string,
  confidence: number,
): { value: T; sourceRef: string; method: string; confidence: number } {
  return { value, sourceRef, method, confidence };
}

const baseFields: ProfileCandidateFields = {
  headline: makeField("Backend Engineer", "span:p1/par1/c0-17", "parser", 0.9),
  summary: makeField("Experienced engineer", "span:p1/par2/c0-18", "parser", 0.9),
  skills: makeField(["Go", "Kubernetes"], "span:p1/par3/c0-21", "parser", 0.85),
  experience: makeField("5 years", "span:p1/par4/c0-6", "parser", 0.9),
  education: makeField("BS Computer Science", "span:p1/par5/c0-17", "parser", 0.9),
  location: makeField("Bengaluru", "span:p1/par6/c0-9", "parser", 0.9),
};

describe("ExtractionReview", () => {
  it("renders all candidate fields with values and source spans", () => {
    render(
      <ExtractionReview
        fields={baseFields}
        supportingText="Backend Engineer with 5 years of experience."
        onConfirm={vi.fn()}
        onMarkUnknown={vi.fn()}
      />,
    );

    expect(screen.getByText("Headline")).toBeInTheDocument();
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("span:p1/par1/c0-17")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
  });

  it("marks unknown fields and shows no source span", () => {
    const unknownFields: ProfileCandidateFields = {
      ...baseFields,
      location: makeField("", "", "unknown", 0),
    };
    render(
      <ExtractionReview
        fields={unknownFields}
        supportingText="Backend Engineer with 5 years of experience."
        onConfirm={vi.fn()}
        onMarkUnknown={vi.fn()}
      />,
    );

    expect(screen.getAllByText("unknown").length).toBeGreaterThan(0);
    const sourceSpans = screen.queryAllByText(/span:p\d/);
    expect(sourceSpans.some((s) => s.textContent?.includes("c0-9"))).toBe(false);
  });

  it("shows supporting text", () => {
    render(
      <ExtractionReview
        fields={baseFields}
        supportingText="Backend Engineer with 5 years of experience in Go and Kubernetes."
        onConfirm={vi.fn()}
        onMarkUnknown={vi.fn()}
      />,
    );

    expect(screen.getByText("Supporting text")).toBeInTheDocument();
    expect(
      screen.getByText("Backend Engineer with 5 years of experience in Go and Kubernetes."),
    ).toBeInTheDocument();
  });

  it("shows unknown count in summary badge", () => {
    const unknownFields: ProfileCandidateFields = {
      ...baseFields,
      location: makeField("", "", "unknown", 0),
      education: makeField("", "", "unknown", 0),
    };
    render(
      <ExtractionReview
        fields={unknownFields}
        supportingText="Backend Engineer."
        onConfirm={vi.fn()}
        onMarkUnknown={vi.fn()}
      />,
    );

    const unknownBadges = screen.getAllByText("unknown");
    expect(unknownBadges.length).toBeGreaterThan(0);
    expect(screen.getByText("4 of 6 confirmed, 2 unknown")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ExtractionReview
        fields={baseFields}
        supportingText="Backend Engineer."
        onConfirm={onConfirm}
        onMarkUnknown={vi.fn()}
      />,
    );

    const confirmButtons = screen.getAllByText("Confirm");
    expect(confirmButtons).toHaveLength(6);
    fireEvent.click(confirmButtons[0]);
    expect(onConfirm).toHaveBeenCalledWith("headline");
  });

  it("calls onMarkUnknown when mark unknown button is clicked", () => {
    const onMarkUnknown = vi.fn();
    const unknownFields: ProfileCandidateFields = {
      ...baseFields,
      location: makeField("", "", "unknown", 0),
    };
    render(
      <ExtractionReview
        fields={unknownFields}
        supportingText="Backend Engineer."
        onConfirm={vi.fn()}
        onMarkUnknown={onMarkUnknown}
      />,
    );

    const markUnknownButtons = screen.getAllByText("Mark unknown");
    expect(markUnknownButtons).toHaveLength(1);
    fireEvent.click(markUnknownButtons[0]);
    expect(onMarkUnknown).toHaveBeenCalledWith("location");
  });
});
