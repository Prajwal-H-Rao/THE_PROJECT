/**
 * Notification templates (task 14.14).
 * Template rendering for outbound WhatsApp messages. Templates carry
 * placeholder variables that are substituted at send time.
 */

import { createHash } from "node:crypto";

/** One notification template. */
export interface NotificationTemplate {
  readonly templateId: string;
  readonly name: string;
  readonly language: string;
  readonly category: string;
  readonly components: readonly TemplateComponent[];
}

/** One component within a template. */
export interface TemplateComponent {
  readonly type: "header" | "body" | "footer" | "button";
  readonly text: string;
}

/** Render a template with the given values. */
export function renderTemplate(template: NotificationTemplate, values: Record<string, string>): string {
  const components = template.components.map((c) => {
    let text = c.text;
    for (const [key, value] of Object.entries(values)) {
      text = text.replace(new RegExp("{{\\s*" + key + "\\s*}}", "g"), value);
    }
    return text;
  });
  return components.join("\n");
}

/** Hash a template for caching. */
export function templateHash(template: NotificationTemplate): string {
  return createHash("sha256").update(JSON.stringify(template)).digest("hex");
}

/** Sample templates. */
export const SAMPLE_TEMPLATES: readonly NotificationTemplate[] = [
  {
    templateId: "welcome_message",
    name: "welcome_message",
    language: "en_US",
    category: "marketing",
    components: [
      { type: "header", text: "Welcome to {{company_name}}!" },
      { type: "body", text: "Hi {{customer_name}}, welcome to {{company_name}}. Your account {{account_id}} is now active." },
      { type: "footer", text: "Reply STOP to opt out" },
    ],
  },
  {
    templateId: "approval_request",
    name: "approval_request",
    language: "en_US",
    category: "utility",
    components: [
      { type: "header", text: "Approval Required" },
      { type: "body", text: "Job {{job_id}} at {{company_name}} needs your approval. Salary: {{salary}}. Reply APPROVE or REJECT." },
      { type: "footer", text: "Reply STOP to opt out" },
    ],
  },
];
