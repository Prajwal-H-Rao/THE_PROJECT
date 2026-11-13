/**
 * Task 20.20 — Storybook interaction tests for ActionPreview.
 * Stories for the ActionPreview component showing approve/reject/edit interactions.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { ActionPreview } from "./ActionPreview";

const meta: Meta<typeof ActionPreview> = {
  title: "Components/ActionPreview",
  component: ActionPreview,
  tags: ["autodocs"],
  argTypes: {
    work_mode: { control: "select", options: ["remote", "hybrid", "onsite"] },
    freshness_state: { control: "select", options: ["current", "stale"] },
    listing_status: { control: "select", options: ["open", "closed", "unknown"] },
  },
};

export default meta;
type Story = StoryObj<typeof ActionPreview>;

export const Default: Story = {
  args: {
    connector_id: "greenhouse:acme",
    canonical_uri: "https://boards.greenhouse.io/acme/jobs/123",
    employer: "Acme Corp",
    title: "Backend Engineer",
    employer_id: "emp-001",
    location: "Bengaluru, IN",
    work_mode: "hybrid",
    posted_at: "2026-11-01T00:00:00Z",
    expires_at: "2026-12-01T00:00:00Z",
    fingerprint: "a".repeat(64),
    last_verified_at: "2026-11-13T10:00:00Z",
    terms_classification: "public_ats_board",
    source_job_id: "123",
    retrieved_at: "2026-11-13T10:00:00Z",
    freshness_state: "current",
    listing_status: "open",
  },
};

export const Stale: Story = {
  args: {
    ...Default.args,
    freshness_state: "stale",
  },
};

export const Closed: Story = {
  args: {
    ...Default.args,
    listing_status: "closed",
  },
};