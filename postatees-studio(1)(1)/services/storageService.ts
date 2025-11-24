
import { SavedProject } from '../types';

const DB_NAME = 'PostaTeesDB';
const STORE_NAME = 'projects';
// Incrementing version to force schema update/check
const DB_VERSION = 2;

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("IndexedDB is not supported in this browser."));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB open error:", request.error);
            reject(new Error(`Database error: ${request.error?.message || 'Unknown error'}`));
        };

        request.onblocked = () => {
            reject(new Error("Database is blocked. Please close other tabs of this app and reload."));
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const getAllProjects = async (): Promise<SavedProject[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                // Sort by timestamp descending (newest first)
                const projects = request.result as SavedProject[];
                resolve(projects.sort((a, b) => b.timestamp - a.timestamp));
            };
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to get projects", e);
        // Return empty array instead of throwing to prevent app crash on load
        return [];
    }
};

export const saveProjectToDB = async (project: SavedProject): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // Handle transaction-level errors (like quota exceeded during commit)
            transaction.oncomplete = () => {
                resolve();
            };

            transaction.onerror = (event) => {
                const error = (event.target as IDBTransaction).error;
                if (error?.name === 'QuotaExceededError') {
                    reject(new Error("Vault is full! Delete some old projects to make space."));
                } else {
                    reject(new Error(`Transaction failed: ${error?.message}`));
                }
            };

            const request = store.put(project);

            request.onerror = () => {
                // This usually bubbles to transaction.onerror, but we catch it just in case
                if (request.error?.name === 'QuotaExceededError') {
                    reject(new Error("Vault is full! Delete some old projects."));
                } else {
                    reject(request.error);
                }
            };
        });
    } catch (err) {
        throw err;
    }
};

export const deleteProjectFromDB = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
