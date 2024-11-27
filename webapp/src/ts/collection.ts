// @ts-ignore
import { EpubBook } from "./epub.js"

import * as db from "./db.js"

class Collection {
  elem: HTMLElement;
  modalElem: HTMLElement;

  books: EpubBook[] = [];

  constructor(elem: HTMLElement, modalElem: HTMLElement) {
    this.elem = elem;
    this.modalElem = modalElem;
    this.loadBooks().then(() => console.log("[Collection] All books have been loaded"));
  }

  // Loads books from database 
  private async loadBooks() {
    const books = await db.getAllBooks();

    for (const book of books) {
      const classBook = await EpubBook.newFromExistingObject(book.key, book.value);
      this.books.push(classBook);
    }
    await this.render();
    console.log(books);
  }

  /** Loads a book from a file */
  async addBookFromFile(file: File) {
    const book = await EpubBook.newFromFile(file);
    const key = await db.addBook(book);
    book.id = key as number;

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
      card.href = "/reader.html?id=" + this.books[i].id

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
      progress.setAttribute("value", `${this.books[i].lastReadIndex || 0}`);
      progress.setAttribute("max", `${this.books[i].totalIndex || 1}`);

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

  showModal(content: string) {
    this.modalElem.innerHTML = '';
    this.modalElem.classList.add("modal", "is-active", "is-clipped");

    const overlay = document.createElement("div");
    overlay.classList.add("modal-background");
    this.modalElem.appendChild(overlay);
    overlay.onclick = this.hideModal.bind(this);

    const modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");
    this.modalElem.appendChild(modalContent);

    const contentDiv = document.createElement("div");
    contentDiv.classList.add("content", "box");
    modalContent.appendChild(contentDiv);

    const p = document.createElement("p");
    contentDiv.appendChild(p);
    p.innerHTML = content;

    const closeButton = document.createElement("button");
    closeButton.classList.add("modal-close", "is-large");
    this.modalElem.appendChild(closeButton);
    closeButton.onclick = this.hideModal.bind(this);
  }

  hideModal() {
    this.modalElem.innerHTML = '';
    this.modalElem.setAttribute("class", "");
  }

  async syncWithServer() {
    this.showModal(`Starting sync`)

    try {
      const res = await db.syncWithServer()
      if (res.downloaded.length + res.uploaded.length > 0) {
        this.showModal(`<strong>Succesfully synced</strong><br> ↑ ${res.uploaded.length} book(s) uploaded<br> ↓ ${res.downloaded.length} book(s) downloaded`)

        // reaload books and render
        await this.loadBooks();
        await this.render();
      } else {
        this.showModal("<strong>Succesfully synced</strong><br> No changes");
      }
    } catch (e) {
      this.showModal(`An error has ocurred: ${e}`);
    }
  }
}


// Main function
document.addEventListener("DOMContentLoaded", () => {
  let collection: Collection;

  const mainElem = document.getElementById("books-container");
  const modal = document.getElementById("modal");

  // This shouldn't fail NEVER when used with index.html
  if (mainElem && modal) {
    collection = new Collection(mainElem, modal);
  }

  // Process the epub file
  document.getElementById("file-input")?.addEventListener('change', async function(e) {
    const files = (e.target as HTMLInputElement).files

    if (files && files.length > 0) {
      collection.addBookFromFile(files[0]);
    }
  });

  document.getElementById("sync")?.addEventListener('click', async function() {
    await collection.syncWithServer();
  });
});

