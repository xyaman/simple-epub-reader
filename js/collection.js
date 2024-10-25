import db from "./db.js"

/** Represents the collection of books 
 * @param {HTMLElement} elem 
 * */
class Collection {
  constructor(elem) {
    this.books = []

    /** @type {HTMLElement} */
    this.elem = elem;

    (async () => {

      // Loads books from database 
      const books = await db.getAllBooks();
      console.log(books);
      for (const book of books) {
        const classBook = new EpubBook(book.key);
        await classBook.loadFromFile(book.value.file);
        this.books.push(classBook);
        console.log("All books have been loaded");
      }

      await this.render();
    })().then(() => console.log("collection loaded"));

  }

  /** Loads a book from a file */
  async addBookFromFile(file) {
    const book = new EpubBook();
    await book.loadFromFile(file);
    this.books[book.title] = book;

    // Book (Cover) element
    db.addBook(book);
    console.log("book added succesfully");

    await book.loadContent();
    this.books.push(book);
    await this.render();
  }

  async render() {
    this.elem.innerHTML = "";

    // Main container
    const columns = document.createElement("div");
    columns.classList.add("columns", "is-mobile");

    for (let i = 0; i < this.books.length; i++) {

      const column = document.createElement("div");
      column.classList.add("column", "is-one-quarter-fullhd");

      const card = document.createElement("a");
      column.appendChild(card);
      card.classList.add("card");
      card.href = "/simple-epub-reader/reader.html?id=" + i

      const cardImage = document.createElement("div");
      card.appendChild(cardImage);
      cardImage.classList.add("card-image");

      const cardFigure = document.createElement("figure")
      cardImage.appendChild(cardFigure);
      cardFigure.classList.add("image", "is-4by5");

      const cardImg = document.createElement("img");
      cardFigure.appendChild(cardImg);
      cardImg.src = await this.books[i].getCoverBlob();

      columns.appendChild(column);
    }

    this.elem.appendChild(columns);
  }

}

const collection = new Collection(document.getElementById("books-container"));

// Process the epub file
document.getElementById("file-input").addEventListener('change', async function(e) {
  if (e.target.files[0]) {
    console.log('EPUB file: ' + e.target.files[0].name);
    collection.addBookFromFile(e.target.files[0]);
  }
});

