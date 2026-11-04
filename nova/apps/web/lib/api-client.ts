/**
 * Nova design system - API client for tasks and notes.
 * Fetch client for backend task and note endpoints.
 * Base URL and user id come from environment variables.
 */

import type { Task, Note } from "./api-types.js";

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
