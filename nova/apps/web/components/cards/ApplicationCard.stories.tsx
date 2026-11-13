/**
 * Task 20.20 — Storybook interaction tests for ApplicationCard.
 * Stories for the ApplicationCard component showing job card states.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { ApplicationCard } from "./ApplicationCard";

const meta: Meta<typeof ApplicationCard> = {
  title: "Components/ApplicationCard",
  component: ApplicationCard,
  tags: ["autodocs"],
  argTypes: {
    state: { control: "select", options: ["default", "loading", "empty", "error", "denied"] },
  },
};

export default meta;
type Story = StoryObj<typeof ApplicationCard>;

export const Default: Story = {
  args: {
    state: "default",
    title: "Backend Engineer",
    employer: "Acme Corp",
    location: "Bengaluru, IN",
    status: "open",
  },
};

export const Loading: Story = {
  args: {
    state: "loading",
  },
};

export const Empty: Story = {
  args: {
    state: "empty",
    emptyMessage: "No jobs available",
  },
};

export const Error: Story = {
  args: {
    state: "error",
    errorMessage: "Failed to load job data",
  },
};

export const Denied: Story = {
  args: {
    state: "denied",
    deniedMessage: "Access denied to this job",
  },
};