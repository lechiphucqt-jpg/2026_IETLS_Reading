import { ReadingPassage, TextAnnotation, VocabEntry } from '../types/ielts';

const DB_NAME = 'TiengAnhThayPhuc_LocalDB';
const DB_VERSION = 1;

/**
 * Initialize IndexedDB for high-capacity local computer storage
 */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('Trình duyệt không hỗ trợ IndexedDB'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('passages')) {
        db.createObjectStore('passages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('vocab')) {
        db.createObjectStore('vocab', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('annotations')) {
        db.createObjectStore('annotations', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save all passages to IndexedDB
 */
export async function savePassagesToIndexedDB(passages: ReadingPassage[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('passages', 'readwrite');
    const store = tx.objectStore('passages');
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        passages.forEach((p) => store.put(p));
        resolve();
      };
      clearReq.onerror = () => reject(clearReq.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Không thể ghi passages:', err);
  }
}

/**
 * Load all passages from IndexedDB
 */
export async function loadPassagesFromIndexedDB(): Promise<ReadingPassage[] | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('passages', 'readonly');
      const store = tx.objectStore('passages');
      const request = store.getAll();
      request.onsuccess = () => {
        const result = request.result as ReadingPassage[];
        resolve(result && result.length > 0 ? result : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Không thể đọc passages:', err);
    return null;
  }
}

/**
 * Save all vocabulary to IndexedDB
 */
export async function saveVocabToIndexedDB(vocab: VocabEntry[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('vocab', 'readwrite');
    const store = tx.objectStore('vocab');
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        vocab.forEach((v) => store.put(v));
        resolve();
      };
      clearReq.onerror = () => reject(clearReq.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Không thể ghi vocab:', err);
  }
}

/**
 * Load all vocabulary from IndexedDB
 */
export async function loadVocabFromIndexedDB(): Promise<VocabEntry[] | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vocab', 'readonly');
      const store = tx.objectStore('vocab');
      const request = store.getAll();
      request.onsuccess = () => {
        const result = request.result as VocabEntry[];
        resolve(result && result.length > 0 ? result : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Không thể đọc vocab:', err);
    return null;
  }
}

/**
 * Save all annotations to IndexedDB
 */
export async function saveAnnotationsToIndexedDB(annotations: TextAnnotation[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('annotations', 'readwrite');
    const store = tx.objectStore('annotations');
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        annotations.forEach((a) => store.put(a));
        resolve();
      };
      clearReq.onerror = () => reject(clearReq.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Không thể ghi annotations:', err);
  }
}

/**
 * Load all annotations from IndexedDB
 */
export async function loadAnnotationsFromIndexedDB(): Promise<TextAnnotation[] | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('annotations', 'readonly');
      const store = tx.objectStore('annotations');
      const request = store.getAll();
      request.onsuccess = () => {
        const result = request.result as TextAnnotation[];
        resolve(result && result.length > 0 ? result : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Không thể đọc annotations:', err);
    return null;
  }
}

export interface BackupDataPayload {
  app: string;
  version: string;
  exportedAt: string;
  brandName: string;
  passages: ReadingPassage[];
  vocab: VocabEntry[];
  annotations: TextAnnotation[];
}

/**
 * Export full application data into a .json backup file for offline local computer storage
 */
export function exportBackupToFile(
  passages: ReadingPassage[],
  vocab: VocabEntry[],
  annotations: TextAnnotation[],
  brandName = 'Tiếng Anh Thầy Phúc'
) {
  const payload: BackupDataPayload = {
    app: 'TiengAnhThayPhuc_IELTS_Reading',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    brandName,
    passages,
    vocab,
    annotations,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `Du_Lieu_Thay_Phuc_Backup_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate an imported backup JSON file
 */
export function validateBackupJson(jsonString: string): BackupDataPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Tệp không đúng định dạng JSON hợp lệ.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Cấu trúc tệp sao lưu không hợp lệ.');
  }

  const data = parsed as Record<string, unknown>;

  if (!Array.isArray(data.passages)) {
    throw new Error('Không tìm thấy danh sách bài đọc (passages) trong tệp sao lưu.');
  }

  if (!Array.isArray(data.vocab)) {
    throw new Error('Không tìm thấy danh sách từ vựng (vocab) trong tệp sao lưu.');
  }

  return {
    app: String(data.app || 'TiengAnhThayPhuc_IELTS_Reading'),
    version: String(data.version || '1.0.0'),
    exportedAt: String(data.exportedAt || new Date().toISOString()),
    brandName: String(data.brandName || 'Tiếng Anh Thầy Phúc'),
    passages: data.passages as ReadingPassage[],
    vocab: data.vocab as VocabEntry[],
    annotations: Array.isArray(data.annotations) ? (data.annotations as TextAnnotation[]) : [],
  };
}
