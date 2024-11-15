import { openDB } from "idb";

// @ts-ignore
import { EpubBook } from "./epub";
import * as settings from "./settings";

// CONSTANTS
const DATABASE_NAME = "epub-reader"
const STORE_NAME = "books-collection"

interface CollectionItem {
  key: IDBValidKey;
  value: EpubBook;
}

/** This method NEEDS to be called in order to create the db */
export async function getAllBooks(): Promise<CollectionItem[]> {
  const db = await openDB(DATABASE_NAME, 1, {
    upgrade(db) {
      console.log("Books database created");
      db.createObjectStore(STORE_NAME, { autoIncrement: true });
    }
  });

  const keys = await db.getAllKeys(STORE_NAME);
  const values = await db.getAll(STORE_NAME);

  return keys.map((key, index) => ({ key, value: values[index] }));
}


export async function getBookById(key: IDBValidKey): Promise<EpubBook | undefined> {
  const db = await openDB(DATABASE_NAME, 1);
  const book = await db.get(STORE_NAME, key);
  if (!book) return undefined;

  return EpubBook.newFromExistingObject(key, book);
}


/** @throws Will throws an error if the book is already in the collection */
export async function addBook(book: EpubBook): Promise<IDBValidKey> {
  const db = await openDB(DATABASE_NAME, 1);
  // TODO: if the book title is already in the db, skip

  const books: EpubBook[] = await db.getAll(STORE_NAME);
  const titles = books.map(b => b.title);

  if (titles.includes(book.title)) {
    throw new Error("Book is already in the collection.");
  }

  return await db.add(STORE_NAME, book.object)
}

export async function removeBook(key: IDBValidKey) {
  const db = await openDB(DATABASE_NAME, 1);
  await db.delete(STORE_NAME, key);
}

/** This function also manages the timestamp (used to sync with the server) */
export async function updateBookPosition(book: EpubBook): Promise<IDBValidKey> {
  const db = await openDB(DATABASE_NAME, 1);
  book.updatedAt = Date.now();

  return await db.put(STORE_NAME, book.object, book.id);
}


interface SyncResponse {
  success: boolean;
  error: string;
  updated_books: SyncBook[];
  server_updates: string[];
}

interface SyncBook {
  id: IDBValidKey;
  creator: string;
  language: string;
  title: string;
  last_read_index: number;
  total_index: number;
  updated_at: number;
}

/** This function will sync book progress with the server.
 * If the book is not present in the indexedDB, it will be ignored.*/
export async function syncWithServer() {
  const result: { uploaded: string[], downloaded: string[] } = {
    uploaded: [],
    downloaded: [],
  };

  const uuid = settings.load().uuid;
  const serverAddress = settings.load().serverAddress;
  if (uuid === "" || serverAddress === "") {
    throw new Error("Server is not configured.")
  }
  const clientBooks = (await getAllBooks()).map(b => ({
    id: b.key,
    creator: b.value.creator,
    language: b.value.language,
    last_read_index: b.value.lastReadIndex,
    title: b.value.title,
    total_index: b.value.totalIndex,
    updated_at: b.value.updatedAt || 0,
  }));

  const booksMap: { [key: string]: SyncBook } = {}
  for (const book of clientBooks) {
    booksMap[book.title] = book
  }

  const res = await fetch(`${serverAddress}/user/sync`, {
    method: "POST",
    body: JSON.stringify({ "user_uuid": uuid, "data": clientBooks })
  });

  const resJSON: SyncResponse = await res.json();
  result.uploaded = resJSON.server_updates;

  for (const serverBook of resJSON.updated_books) {
    if (serverBook.title in booksMap) {
      const clientBook = booksMap[serverBook.title]

      // we update the book if the server update timestamp is bigger than
      // client timestamp. 
      // Note: the server should already manage this, but just in case
      if (serverBook.updated_at > clientBook.updated_at) {

        const dbBook = await getBookById(clientBook.id);
        if (dbBook) {
          dbBook.updatedAt = serverBook.updated_at;
          dbBook.lastReadIndex = serverBook.last_read_index;
          dbBook.totalIndex = serverBook.total_index;
          dbBook.id = clientBook.id as number;

          const db = await openDB(DATABASE_NAME, 1);
          await db.put(STORE_NAME, dbBook, dbBook.id);
          result.downloaded.push(dbBook.title);
        }
      }
    }
  }

  return result;
}
