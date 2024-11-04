import { EpubBook } from "./epub.js";
import { openDB } from "./libs/umd.js";

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
  await db.put(STORE_NAME, book.object, book.id);
}

export default { getAllBooks, getBookById, addBook, removeBook, updateBookPosition };
