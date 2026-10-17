let database;

function openDatabase() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open('ilbi-account-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(error => { database = null; throw error; });
  return database;
}

export async function draftFile(key, value) {
  if (!key) return null;
  const writing = arguments.length > 1;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('files', writing ? 'readwrite' : 'readonly');
    const store = transaction.objectStore('files');
    const request = writing ? (value ? store.put(value, key) : store.delete(key)) : store.get(key);
    transaction.oncomplete = () => resolve(writing ? value : request.result || null);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Draft file storage failed'));
  });
}
