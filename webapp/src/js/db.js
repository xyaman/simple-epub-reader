import { EpubBook } from "./epub.js";
import { openDB } from "./libs/umd.js";
import settings from "./settings.js";

const DATABASE_NAME = "epub-reader"
const STORE_NAME = "books-collection"

/** This method needs to be called in order to create the db */
async function getAllBooks() {
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

async function getBookById(key) {
  const db = await openDB(DATABASE_NAME, 1);
  return await db.get(STORE_NAME, key)
}

/** Adds a new book to the database, then it returns the book key
 * @returns {number} The book's new id
 */
async function addBook(book) {
  const db = await openDB(DATABASE_NAME, 1);
  // TODO: if the book title is already in the db, skip
  return await db.add(STORE_NAME, book.object)
}

/** Removes a book to the database.
 * @param {number} key The book's id (key)
 */
async function removeBook(key) {
  const db = await openDB(DATABASE_NAME, 1);
  return await db.delete(STORE_NAME, key);
}

/**
 * @param {import("./epub.js").EpubBook} book The book to update
 */
async function updateBookPosition(book) {
  const db = await openDB(DATABASE_NAME, 1);
  book.updatedAt = Date.now();
  await db.put(STORE_NAME, book.object, book.id);
}

async function syncWithServer() {
  // TODO: remove this (improve)
  // we need to map every book to the user_uuid

  const result = {
    "uploaded": [],
    "downloaded": [],
  };

  const uuid = settings.load().uuid;
  const serverAddress = settings.load().serverAddress;
  const db = await openDB(DATABASE_NAME, 1);

  /** @type {EpubBook[]} */
  let clientBooks = await getAllBooks()
  clientBooks = clientBooks.map(b => ({
    "id": b.key,
    "user_id": uuid,
    "creator": b.value.creator,
    "language": b.value.language,
    "last_read_index": b.value.lastReadIndex,
    "title": b.value.title,
    "total_index": b.value.totalIndex,
    "updated_at": b.value.updatedAt || 0,
  }));

  const booksMap = {}
  for (const book of clientBooks) {
    booksMap[book.title] = book
  }

  const res = await fetch(`${serverAddress}/user/sync`, {
    method: "POST",
    body: JSON.stringify({ "user_uuid": uuid, "data": clientBooks })
  });

  const resJSON = await res.json();
  const serverBooks = resJSON.updated_books;

  result.uploaded = resJSON.server_updates;

  for (const serverBook of serverBooks) {
    if (serverBook.title in booksMap) {
      const clientBook = booksMap[serverBook.title]
      if (serverBook.updated_at > clientBook.updated_at) {

        const dbBook = await getBookById(clientBook.id);
        dbBook.updatedAt = serverBook.updated_at;
        dbBook.lastReadIndex = serverBook.last_read_index;
        dbBook.totalIndex = serverBook.total_index;
        dbBook.id = clientBook.id

        await db.put(STORE_NAME, dbBook, dbBook.id);
        result.downloaded.push(dbBook.title);
      }
    }
  }

  return result;
}

export default { getAllBooks, getBookById, addBook, removeBook, updateBookPosition, syncWithServer };
