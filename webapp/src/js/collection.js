import { EpubBook } from "./epub.js"
import db from "./db.js"

/** Represents the collection of books 
 * @param {HTMLElement} elem 
 * */
class Collection {
  constructor(elem) {

    /** @type {EpubBook[]} */
    this.books = []

    /** @type {HTMLElement} */
    this.elem = elem;

    (async () => {

      // Loads books from database 
      const books = await db.getAllBooks();
      console.log(books);


      for (const book of books) {
        const classBook = await EpubBook.newFromExistingObject(book.key, book.value);
        this.books.push(classBook);
      }
      console.log("All books have been loaded");

      await this.render();
    })().then(() => console.log("collection loaded"));

  }

  /** Loads a book from a file */
  async addBookFromFile(file) {
    const book = await EpubBook.newFromFile(file);
    const key = await db.addBook(book);
    book.id = key;

    // Book (Cover) element
    console.log("book added succesfully");

    await book.loadContent();
    this.books.push(book);
    await this.render();
  }

  async render() {
    this.elem.innerHTML = "";

    // Main container
    const columns = document.createElement("div");
    columns.classList.add("columns", "is-multiline", "is-mobile");

    for (let i = 0; i < this.books.length; i++) {

      const column = document.createElement("div");
      column.classList.add("column", "is-half-mobile", "is-one-third-tablet", "is-one-quarter-desktop", "is-one-fifth-fullhd");

      const cardContainer = document.createElement("div");
      cardContainer.setAttribute("id", "card-container");
      column.appendChild(cardContainer);

      const card = document.createElement("a");
      cardContainer.appendChild(card);
      card.classList.add("card");
      card.href = "./reader.html?id=" + this.books[i].id

      const cardImage = document.createElement("div");
      card.appendChild(cardImage);
      cardImage.classList.add("card-image");

      const cardFigure = document.createElement("figure")
      cardImage.appendChild(cardFigure);
      cardFigure.classList.add("image", "is-3by4");

      const cardImg = document.createElement("img");
      cardFigure.appendChild(cardImg);
      cardImg.style.objectFit = "cover";
      cardImg.src = await this.books[i].getCoverBlob();

      const removeButton = document.createElement("a");
      removeButton.classList.add("tag", "is-delete"); // style.css
      removeButton.setAttribute("id", "delete-button");
      cardContainer.appendChild(removeButton);

      const progress = document.createElement("progress");
      progress.classList.add("progress", "is-radiusless");
      progress.setAttribute("value", this.books[i].lastReadIndex || 0);
      progress.setAttribute("max", this.books[i].totalIndex || 1);

      cardContainer.appendChild(progress);

      removeButton.onclick = async () => {
        await db.removeBook(this.books[i].id);
        this.books.splice(i, 1);
        await this.render();
      };

      columns.appendChild(column);
    }

    this.elem.appendChild(columns);
  }

}


// MAIN
let collection;

document.addEventListener("DOMContentLoaded", () => {
  collection = new Collection(document.getElementById("books-container"));
});

// Process the epub file
document.getElementById("file-input").addEventListener('change', async function(e) {
  if (e.target.files[0]) {
    console.log('EPUB file: ' + e.target.files[0].name);
    collection.addBookFromFile(e.target.files[0]);
  }
});

document.getElementById("sync").addEventListener('click', async function(e) {
  await db.syncWithServer()
});
