import { openDB } from "./libs/umd.js";

const DATABASE_NAME = "epub-reader"
const STORE_NAME = "books-collection"

/** This method needs to be called in order to create the db */
export async function getAllBooks() {
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

export async function addBook(book) {
  const db = await openDB(DATABASE_NAME, 1);
  await db.add(STORE_NAME, book)
}

async function updateBookPosition(id, book) {
  const db = await openDB(DATABASE_NAME, 1);
  await db.put(STORE_NAME, book.asObject(), id);
  console.log(book.asObject());
}

export default { getAllBooks, addBook, updateBookPosition };
