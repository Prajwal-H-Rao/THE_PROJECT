/**
 * Nova design system - Card entity.
 * Represents one user-owned card with domain-specific state.
 */

export interface Card {
  readonly cardId: string;
  readonly userId: string;
  readonly type: string;
  readonly title: string;
  readonly content: string | null;
  readonly status: string;
  readonly domain: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCardInput {
  readonly title: string;
  readonly type: string;
  readonly content?: string;
  readonly tags?: string[];
}

export interface UpdateCardInput {
  readonly title?: string;
  readonly type?: string;
  readonly content?: string | null;
  readonly tags?: string[] | null;
}

export interface CardListFilter {
  type?: string;
  status?: string;
}
