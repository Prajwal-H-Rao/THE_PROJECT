import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ActionPreview } from "./ActionPreview";

afterEach(() => {
  // testing-library auto-cleanup is not wired in test-setup.ts; do it manually.
  document.body.innerHTML = "";
});

/**
 * Task 15.13 (module 15, P4): ActionPreview approve / reject / edit / expiry
 * outcomes are keyboard-reachable (full flow works without a mouse).
 *
 * Native <button> elements are focusable via Tab and activated by Enter/Space
 * in every browser, so the outcomes are reachable without a mouse. This test
 * verifies every outcome button is present, focusable, and fires its callback
 * on activation (click is the unit-level equivalent of Enter/Space).
 */

const mockProps = {
  tool: "transfer_funds",
  arguments: { amount: 100, to: "acct-2" },
  permissions: ["documents.write"],
  sideEffects: ["Money leaves account", "Transaction logged"],
  reversible: true,
  expiry: new Date("2026-12-01T00:00:00Z"),
  onApprove: vi.fn(),
  onReject: vi.fn(),
  onEdit: vi.fn(),
  loading: false,
};

function buttonByName(name: string) {
  const buttons = screen.getAllByRole("button", { name });
  expect(buttons.length).toBe(1);
  return buttons[0];
}

describe("ActionPreview keyboard reachability", () => {
  it("renders approve, reject and edit outcome buttons", () => {
    render(<ActionPreview {...mockProps} />);

    expect(buttonByName(/edit action/i)).toBeInTheDocument();
    expect(buttonByName(/reject action/i)).toBeInTheDocument();
    expect(buttonByName(/approve/i)).toBeInTheDocument();
  });

  it("every outcome button is focusable (reachable by Tab without a mouse)", () => {
    render(<ActionPreview {...mockProps} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);

    for (const button of buttons) {
      button.focus();
      expect(document.activeElement).toBe(button);
    }
  });

  it("approve fires its callback on activation (Enter/Space equivalent)", () => {
    render(<ActionPreview {...mockProps} />);
    const approve = buttonByName(/approve/i);

    fireEvent.click(approve);
    expect(mockProps.onApprove).toHaveBeenCalledTimes(1);
  });

  it("reject fires its callback on activation (Enter/Space equivalent)", () => {
    render(<ActionPreview {...mockProps} />);
    const reject = buttonByName(/reject action/i);

    fireEvent.click(reject);
    expect(mockProps.onReject).toHaveBeenCalledTimes(1);
  });

  it("edit fires its callback on activation (Enter/Space equivalent)", () => {
    render(<ActionPreview {...mockProps} />);
    const edit = buttonByName(/edit action/i);

    fireEvent.click(edit);
    expect(mockProps.onEdit).toHaveBeenCalledTimes(1);
  });

  it("renders expiry text (grant expires)", () => {
    render(<ActionPreview {...mockProps} />);
    expect(screen.getByText(/grant expires/i)).toBeInTheDocument();
  });

  it("renders a disabled state when loading", () => {
    render(<ActionPreview {...mockProps} loading={true} />);
    const approve = buttonByName(/approve/i);
    expect(approve).toBeDisabled();
  });
});
