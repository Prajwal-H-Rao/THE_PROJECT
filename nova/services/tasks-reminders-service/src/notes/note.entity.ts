/**
 * Note entity defines Note, CreateNoteInput, UpdateNoteInput, NoteListFilter interfaces.
 * It represents one user-owned note.
 */

export interface Note {
  readonly noteId: string;
  readonly userId: string;
  readonly title: string;
  readonly content: string | null;
  readonly tags: string[];
  readonly sourceType: string | null;
  readonly sourceRef: string | null;
  readonly isArchived: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly objectStorePointer: string | null;
  readonly embedding: number[] | null;
}

export interface CreateNoteInput {
  readonly title: string;
  readonly content: string;
  readonly tags?: string[];
  readonly sourceType?: string;
  readonly sourceRef?: string;
}

export interface UpdateNoteInput {
  readonly title?: string;
  readonly content?: string | null;
  readonly tags?: string[] | null;
  readonly sourceType?: string | null;
  readonly sourceRef?: string | null;
  readonly isArchived?: boolean;
}

export interface NoteListFilter {
  tags?: string[];
  isArchived?: boolean;
}

export interface NoteVersion {
  readonly noteVersionId: string;
  readonly noteId: string;
  readonly title: string;
  readonly content: string;
  readonly tags: string[];
  readonly sourceType: string | null;
  readonly sourceRef: string | null;
  readonly isArchived: boolean;
  readonly createdAt: string;
  readonly createdBy: string;
}

export interface RestoreVersionInput {
  readonly noteVersionId: string;
}

export interface NoteSearchResult {
  readonly noteId: string;
  readonly title: string;
  readonly score: number;
}
