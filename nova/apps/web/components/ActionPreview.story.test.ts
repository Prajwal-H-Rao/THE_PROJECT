/**
 * Task 20.20 — Storybook interaction tests for ActionPreview.
 * Verifies approve/reject/edit callback invocation via user interaction.
 */

import { expect } from "@storybook/jest";
import { within } from "@storybook/testing-library";
import { ActionPreview } from "./ActionPreview";

test("approve button fires onApprove callback", async () => {
  const onApprove = jest.fn();
  const onReject = vi.fn();
  const onEdit = vi.fn();

  const { getByRole } = render(
    <ActionPreview
      connector_id="greenhouse:acme"
      canonical_uri="https://boards.greenhouse.io/acme/jobs/123"
      employer="Acme Corp"
      title="Backend Engineer"
      employer_id="emp-001"
      location="Bengaluru, IN"
      work_mode="hybrid"
      posted_at="2026-11-01T00:00:00Z"
      expires_at="2026-12-01T00:00:00Z"
      fingerprint="a".repeat(64)
      last_verified_at="2026-11-13T10:00:00Z"
      terms_classification="public_ats_board"
      source_job_id="123"
      retrieved_at="2026-11-13T10:00:00Z"
      freshness_state="current"
      listing_status="open"
      onApprove={onApprove}
      onReject={onReject}
      onEdit={onEdit}
    />
  );

  const approveButton = getByRole("button", { name: /approve/i });
  await fireEvent.click(approveButton);
  expect(onApprove).toHaveBeenCalledTimes(1);
});

test("reject button fires onReject callback", async () => {
  const onApprove = vi.fn();
  const onReject = vi.fn();
  const onEdit = vi.fn();

  const { getByRole } = render(
    <ActionPreview
      connector_id="greenhouse:acme"
      canonical_uri="https://boards.greenhouse.io/acme/jobs/123"
      employer="Acme Corp"
      title="Backend Engineer"
      employer_id="emp-001"
      location="Bengaluru, IN"
      work_mode="hybrid"
      posted_at="2026-11-01T00:00:00Z"
      expires_at="2026-12-01T00:00:00Z"
      fingerprint="a".repeat(64)
      last_verified_at="2026-11-13T10:00:00Z"
      terms_classification="public_ats_board"
      source_job_id="123"
      retrieved_at="2026-11-13T10:00:00Z"
      freshness_state="current"
      listing_status="open"
      onApprove={onApprove}
      onReject={onReject}
      onEdit={onEdit}
    />
  );

  const rejectButton = getByRole("button", { name: /reject/i });
  await fireEvent.click(rejectButton);
  expect(onReject).toHaveBeenCalledTimes(1);
});

test("edit button fires onEdit callback", async () => {
  const onApprove = vi.fn();
  const onReject = vi.fn();
  const onEdit = vi.fn();

  const { getByRole } = render(
    <ActionPreview
      connector_id="greenhouse:acme"
      canonical_uri="https://boards.greenhouse.io/acme/jobs/123"
      employer="Acme Corp"
      title="Backend Engineer"
      employer_id="emp-001"
      location="Bengaluru, IN"
      work_mode="hybrid"
      posted_at="2026-11-01T00:00:00Z"
      expires_at="2026-12-01T00:00:00Z"
      fingerprint="a".repeat(64)
      last_verified_at="2026-11-13T10:00:00Z"
      terms_classification="public_ats_board"
      source_job_id="123"
      retrieved_at="2026-11-13T10:00:00Z"
      freshness_state="current"
      listing_status="open"
      onApprove={onApprove}
      onReject={onReject}
      onEdit={onEdit}
    />
  );

  const editButton = getByRole("button", { name: /edit/i });
  await fireEvent.click(editButton);
  expect(onEdit).toHaveBeenCalledTimes(1);
});
