/**
 * Nova design system - API client for tasks and notes.
 * Fetch client for backend task and note endpoints.
 * Base URL and user id come from environment variables.
 */

import type { Draft, FinanceTransaction, Task, Note, Trip } from "./api-types.js";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const USER_ID = process.env.NEXT_PUBLIC_USER_ID ?? "dev-user";

function headers(): HeadersInit {
  return { "x-user-id": USER_ID, "Accept": "application/json" };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function fetchTasks(): Promise<Task[]> {
  return fetchJson<Task[]>(`${BASE_URL}/tasks`);
}

export async function fetchNotes(): Promise<Note[]> {
  return fetchJson<Note[]>(`${BASE_URL}/notes`);
}

export async function fetchDraft(draftId: string): Promise<Draft> {
  return fetchJson<Draft>(`${BASE_URL}/drafts/${draftId}`);
}

export async function sendDraft(
  draftId: string,
  grantNonce: string,
  payload: { to: string; subject: string; body: string },
  target: string,
): Promise<{ messageId: string }> {
  const res = await fetch(`${BASE_URL}/drafts/${draftId}/send`, {
    method: "POST",
    headers: {
      ...headers(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grantNonce, payload, target }),
  });
  if (!res.ok) {
    throw new Error(`Send failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as { messageId: string };
}

export async function fetchTransactions(): Promise<FinanceTransaction[]> {
  return fetchJson<FinanceTransaction[]>(`${BASE_URL}/transactions`);
}

export async function fetchTrips(): Promise<Trip[]> {
  return fetchJson<Trip[]>(`${BASE_URL}/trips`);
}

