import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'openpitch-db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_SNAPSHOTS = 'snapshots';
const STORE_FLASHCARDS = 'flashcards';

export interface SavedFlashcard {
  id: string;
  title: string;
  note: string;
  tags: string[];
  createdAt: string;
}

export interface SavedPitchProject {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> | null {
  if (!dbPromise && typeof window !== 'undefined' && 'indexedDB' in window) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_FLASHCARDS)) {
          db.createObjectStore(STORE_FLASHCARDS, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProjectToIdb(project: SavedPitchProject): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.put(STORE_PROJECTS, {
      ...project,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Fallback silenzioso in contesti senza IndexedDB
  }
}

export async function loadProjectFromIdb(id: string): Promise<SavedPitchProject | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const item = await db.get(STORE_PROJECTS, id);
    return (item as SavedPitchProject) || null;
  } catch {
    return null;
  }
}

export async function listProjectsFromIdb(): Promise<SavedPitchProject[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const items = await db.getAll(STORE_PROJECTS);
    return (items as SavedPitchProject[]) || [];
  } catch {
    return [];
  }
}

export async function deleteProjectFromIdb(id: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.delete(STORE_PROJECTS, id);
  } catch {
    // Fallback silenzioso
  }
}

export async function saveFlashcardToIdb(card: SavedFlashcard): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.put(STORE_FLASHCARDS, card);
  } catch {
    // Fallback silenzioso
  }
}

export async function listFlashcardsFromIdb(): Promise<SavedFlashcard[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const items = await db.getAll(STORE_FLASHCARDS);
    return (items as SavedFlashcard[]) || [];
  } catch {
    return [];
  }
}

export async function deleteFlashcardFromIdb(id: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.delete(STORE_FLASHCARDS, id);
  } catch {
    // Fallback silenzioso
  }
}

