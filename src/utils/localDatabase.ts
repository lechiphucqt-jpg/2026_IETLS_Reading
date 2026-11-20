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
 * Save backup file by opening Windows File Explorer Save-As Dialog (User can choose Drive D:, E:, etc.)
 */
export async function saveBackupWithFilePicker(
  passages: ReadingPassage[],
  vocab: VocabEntry[],
  annotations: TextAnnotation[],
  brandName = 'Tiếng Anh Thầy Phúc'
): Promise<{ success: boolean; method: 'picker' | 'download'; fileName: string; canceled?: boolean }> {
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
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `Du_Lieu_Thay_Phuc_Backup_${dateStr}.json`;

  // Try native Save As Picker so user can choose Drive D:, E:, or any folder
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const picker = (window as unknown as {
        showSaveFilePicker: (options: unknown) => Promise<{
          createWritable: () => Promise<{
            write: (data: string) => Promise<void>;
            close: () => Promise<void>;
          }>;
          name: string;
        }>;
      }).showSaveFilePicker;

      const fileHandle = await picker({
        suggestedName: fileName,
        types: [
          {
            description: 'Tệp dữ liệu JSON Tiếng Anh Thầy Phúc',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });

      const writable = await fileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();

      return { success: true, method: 'picker', fileName: fileHandle.name };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, method: 'picker', fileName, canceled: true };
      }
      console.warn('showSaveFilePicker error, falling back to standard download:', err);
    }
  }

  // Fallback to standard download
  exportBackupToFile(passages, vocab, annotations, brandName);
  return { success: true, method: 'download', fileName };
}

/**
 * Open Windows folder selection dialog to bind a dedicated local folder/drive for app data
 */
export async function chooseDirectoryOnDisk(): Promise<{
  handle: unknown;
  name: string;
} | null> {
  if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
    throw new Error(
      'Trình duyệt này chưa hỗ trợ chọn thư mục trực tiếp (File System Access). Bạn có thể dùng tính năng [Chọn ổ đĩa & Lưu tệp sao lưu] để lưu vào Ổ D:, E:.'
    );
  }

  const picker = (window as unknown as {
    showDirectoryPicker: (options?: unknown) => Promise<{
      name: string;
      queryPermission?: (desc: { mode: string }) => Promise<string>;
      requestPermission?: (desc: { mode: string }) => Promise<string>;
      getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<unknown>;
    }>;
  }).showDirectoryPicker;

  try {
    const dirHandle = await picker({
      mode: 'readwrite',
      startIn: 'documents',
    });

    // Save handle to IndexedDB
    try {
      const db = await openDatabase();
      const tx = db.transaction('meta', 'readwrite');
      const store = tx.objectStore('meta');
      store.put({
        key: 'custom_directory_handle',
        handle: dirHandle,
        name: dirHandle.name,
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Could not persist dir handle to idb:', e);
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('lexiband_custom_dir_name', dirHandle.name);
    }

    return { handle: dirHandle, name: dirHandle.name };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

/**
 * Retrieve saved directory info from IndexedDB and localStorage
 */
export async function getSavedDirectoryInfo(): Promise<{
  handle: unknown | null;
  name: string | null;
}> {
  let name: string | null = null;
  if (typeof window !== 'undefined') {
    name = window.localStorage.getItem('lexiband_custom_dir_name');
  }

  try {
    const db = await openDatabase();
    const tx = db.transaction('meta', 'readonly');
    const store = tx.objectStore('meta');
    return new Promise((resolve) => {
      const req = store.get('custom_directory_handle');
      req.onsuccess = () => {
        const record = req.result as { handle: unknown; name?: string } | undefined;
        if (record && record.handle) {
          resolve({ handle: record.handle, name: record.name || name });
        } else {
          resolve({ handle: null, name });
        }
      };
      req.onerror = () => resolve({ handle: null, name });
    });
  } catch {
    return { handle: null, name };
  }
}

/**
 * Clear saved directory from local computer binding
 */
export async function clearSavedDirectory(): Promise<void> {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('lexiband_custom_dir_name');
    window.localStorage.removeItem('lexiband_custom_dir_path_label');
  }
  try {
    const db = await openDatabase();
    const tx = db.transaction('meta', 'readwrite');
    tx.objectStore('meta').delete('custom_directory_handle');
  } catch {
    // ignore
  }
}

/**
 * Save data directly into the user-selected folder on the computer
 */
export async function saveDataToSavedDirectory(
  dirHandle: unknown,
  passages: ReadingPassage[],
  vocab: VocabEntry[],
  annotations: TextAnnotation[],
  brandName = 'Tiếng Anh Thầy Phúc'
): Promise<{ fileName: string; size: number }> {
  const typedHandle = dirHandle as {
    requestPermission?: (opts: { mode: string }) => Promise<string>;
    getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<{
      createWritable: () => Promise<{
        write: (data: string) => Promise<void>;
        close: () => Promise<void>;
      }>;
      name: string;
    }>;
  };

  if (typedHandle.requestPermission) {
    const perm = await typedHandle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      throw new Error('Chưa được cấp quyền ghi vào thư mục này.');
    }
  }

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
  const fileName = 'Du_Lieu_Thay_Phuc.json';
  const fileHandle = await typedHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(jsonString);
  await writable.close();

  return { fileName, size: jsonString.length };
}

/**
 * Load data directly from the user-selected folder on the computer
 */
export async function loadDataFromSavedDirectory(
  dirHandle: unknown
): Promise<BackupDataPayload> {
  const typedHandle = dirHandle as {
    requestPermission?: (opts: { mode: string }) => Promise<string>;
    getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<{
      getFile: () => Promise<File>;
    }>;
  };

  if (typedHandle.requestPermission) {
    const perm = await typedHandle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      throw new Error('Chưa được cấp quyền đọc thư mục này.');
    }
  }

  const fileName = 'Du_Lieu_Thay_Phuc.json';
  let fileHandle;
  try {
    fileHandle = await typedHandle.getFileHandle(fileName, { create: false });
  } catch {
    throw new Error(
      `Không tìm thấy tệp "${fileName}" trong thư mục này. Vui lòng bấm "Lưu dữ liệu ngay vào thư mục" trước khi nạp.`
    );
  }

  const file = await fileHandle.getFile();
  const text = await file.text();
  return validateBackupJson(text);
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
