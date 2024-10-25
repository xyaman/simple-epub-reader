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

  return await db.getAll(STORE_NAME);
}

export async function addBook(book) {
  const db = await openDB(DATABASE_NAME, 1);
  await db.add(STORE_NAME, book)
}

function removeBookById(id) { }

export default { getAllBooks, addBook };
