// IndexedDB wrapper using idb library
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { DB_CONFIG } from './constants';
import type {
  StudentProfile,
  AttendanceRecord,
  SessionData,
  SyncMeta,
  TimetableEntry,
} from './types';

// Database schema
interface SHCAttendDB extends DBSchema {
  auth: {
    key: string;
    value: SessionData;
  };
  profile: {
    key: string;
    value: StudentProfile;
  };
  attendance: {
    key: string; // Composite: `${month}:${subject}`
    value: AttendanceRecord;
    indexes: { month: string; subject: string };
  };
  sync_meta: {
    key: string;
    value: SyncMeta;
  };
  crypto_key: {
    key: string;
    value: { id: string; key: string };
  };
  timetable: {
    key: string; // Composite: `${day}:${period}`
    value: TimetableEntry;
  };
}

let dbInstance: IDBPDatabase<SHCAttendDB> | null = null;

/**
 * Open or create the database
 */
export async function getDB(): Promise<IDBPDatabase<SHCAttendDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<SHCAttendDB>(DB_CONFIG.NAME, DB_CONFIG.VERSION, {
    upgrade(db) {
      // Auth store
      if (!db.objectStoreNames.contains('auth')) {
        db.createObjectStore('auth');
      }

      // Profile store
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile');
      }

      // Attendance store with indexes
      if (!db.objectStoreNames.contains('attendance')) {
        const attendanceStore = db.createObjectStore('attendance');
        attendanceStore.createIndex('month', 'month', { unique: false });
        attendanceStore.createIndex('subject', 'subject', { unique: false });
      }

      // Sync metadata store
      if (!db.objectStoreNames.contains('sync_meta')) {
        db.createObjectStore('sync_meta');
      }

      // Crypto key store
      if (!db.objectStoreNames.contains('crypto_key')) {
        db.createObjectStore('crypto_key');
      }

      // Timetable store
      if (!db.objectStoreNames.contains('timetable')) {
        db.createObjectStore('timetable');
      }
    },
  });

  return dbInstance;
}

// ===== AUTH OPERATIONS =====

export async function getSession(): Promise<SessionData | null> {
  const db = await getDB();
  const session = await db.get('auth', 'session');
  return session || null;
}

export async function setSession(data: SessionData): Promise<void> {
  const db = await getDB();
  await db.put('auth', data, 'session');
}

export async function clearSession(): Promise<void> {
  const db = await getDB();
  await db.delete('auth', 'session');
}

// ===== PROFILE OPERATIONS =====

export async function getCachedProfile(): Promise<StudentProfile | null> {
  const db = await getDB();
  const profile = await db.get('profile', 'student');
  return profile || null;
}

export async function setCachedProfile(profile: StudentProfile): Promise<void> {
  const db = await getDB();
  await db.put('profile', profile, 'student');
}

export async function clearProfile(): Promise<void> {
  const db = await getDB();
  await db.delete('profile', 'student');
}

// ===== ATTENDANCE OPERATIONS =====

export async function getCachedAttendance(): Promise<Map<string, AttendanceRecord[]>> {
  const db = await getDB();
  const allRecords = await db.getAll('attendance');

  const groupedByMonth = new Map<string, AttendanceRecord[]>();

  for (const record of allRecords) {
    if (!record.month) continue;

    if (!groupedByMonth.has(record.month)) {
      groupedByMonth.set(record.month, []);
    }
    groupedByMonth.get(record.month)!.push(record);
  }

  return groupedByMonth;
}

export async function getAttendanceByMonth(month: string): Promise<AttendanceRecord[]> {
  const db = await getDB();
  const tx = db.transaction('attendance', 'readonly');
  const index = tx.store.index('month');
  const records = await index.getAll(month);
  return records;
}

export async function upsertAttendance(month: string, records: AttendanceRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('attendance', 'readwrite');

  for (const record of records) {
    const key = `${month}:${record.subject}`;
    const recordWithMonth = { ...record, month };
    await tx.store.put(recordWithMonth, key);
  }

  await tx.done;
}

export async function clearAttendance(): Promise<void> {
  const db = await getDB();
  await db.clear('attendance');
}

// ===== SYNC METADATA OPERATIONS =====

export async function getLastSyncTime(): Promise<number | null> {
  const db = await getDB();
  const meta = await db.get('sync_meta', 'lastSync');
  return meta?.timestamp || null;
}

export async function getSyncMeta(): Promise<SyncMeta | null> {
  const db = await getDB();
  const meta = await db.get('sync_meta', 'lastSync');
  return meta || null;
}

export async function setSyncMeta(meta: SyncMeta): Promise<void> {
  const db = await getDB();
  await db.put('sync_meta', meta, 'lastSync');
}

export async function clearSyncMeta(): Promise<void> {
  const db = await getDB();
  await db.delete('sync_meta', 'lastSync');
}

// ===== CLEAR ALL DATA =====

export async function clearAllData(): Promise<void> {
  const db = await getDB();

  const tx = db.transaction(
    ['auth', 'profile', 'attendance', 'sync_meta', 'crypto_key'],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore('auth').clear(),
    tx.objectStore('profile').clear(),
    tx.objectStore('attendance').clear(),
    tx.objectStore('sync_meta').clear(),
    tx.objectStore('crypto_key').clear(),
  ]);

  await tx.done;
}

// ===== TIMETABLE OPERATIONS =====

export async function getCachedTimetable(): Promise<TimetableEntry[]> {
  const db = await getDB();
  const allEntries = await db.getAll('timetable');
  return allEntries;
}

export async function upsertTimetable(entries: TimetableEntry[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('timetable', 'readwrite');

  // Clear existing timetable first
  await tx.store.clear();

  // Insert new entries
  for (const entry of entries) {
    const key = `${entry.day}:${entry.period}`;
    await tx.store.put(entry, key);
  }

  await tx.done;
}

export async function clearTimetable(): Promise<void> {
  const db = await getDB();
  await db.clear('timetable');
}

// ===== DATABASE UTILITIES =====

export async function getDatabaseSize(): Promise<number> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return 0;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  } catch (error) {
    console.error('Failed to get storage estimate:', error);
    return 0;
  }
}
