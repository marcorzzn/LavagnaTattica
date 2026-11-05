/**
 * LavagnaTattica — Local-First Privacy Logger (IndexedDB)
 * Registra diagnostica e tracce esclusivamente in locale sul browser dell'analista.
 * Zero telemetria esterna, zero leak di dati.
 */

import { openDB } from 'idb';

const LOG_DB_NAME = 'lavagnatattica-logs-db';
const LOG_STORE_NAME = 'diagnostic_logs';

export interface DiagnosticLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'audit';
  source: string;
  message: string;
  details?: any;
}

async function getLogDb() {
  return openDB(LOG_DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(LOG_STORE_NAME)) {
        db.createObjectStore(LOG_STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function logLocalEvent(
  level: 'info' | 'warn' | 'error' | 'audit',
  source: string,
  message: string,
  details?: any
): Promise<void> {
  const entry: DiagnosticLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    details: details ? JSON.parse(JSON.stringify(details)) : undefined,
  };

  try {
    const db = await getLogDb();
    await db.put(LOG_STORE_NAME, entry);
  } catch (err) {
    console.error('[LavagnaTattica Logger Fallback]', entry, err);
  }
}

export async function exportLogsJSON(): Promise<void> {
  try {
    const db = await getLogDb();
    const logs = await db.getAll(LOG_STORE_NAME);
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lavagnatattica_diagnostic_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export logs', err);
  }
}

export async function clearLocalLogs(): Promise<void> {
  const db = await getLogDb();
  await db.clear(LOG_STORE_NAME);
}
