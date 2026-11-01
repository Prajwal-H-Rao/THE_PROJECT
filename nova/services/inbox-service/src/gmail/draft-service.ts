/**
 * DraftService for creating email drafts.
 * Stores draft data and returns draft_id.
 * Does NOT send - separation from send is enforced by SendService.
 */

import { GmailAdapter } from "./gmail-adapter.js";

export interface DraftServiceOptions {
  readonly userId: string;
}

export class DraftService {
  private adapter: GmailAdapter;
  private userId: string;

  constructor(adapter: GmailAdapter, options: DraftServiceOptions) {
    this.adapter = adapter;
    this.userId = options.userId;
  }

  /** Create a draft email.
   *  Stores draft data (to, subject, body) and returns draft_id.
   *  Does NOT send the email.
   */
  async draft(to: string, subject: string, body: string): Promise<{ draftId: string }> {
    return this.adapter.draft(this.userId, to, subject, body);
  }
}
