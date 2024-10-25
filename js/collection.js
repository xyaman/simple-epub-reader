/** Represents the collection of books 
 * @param {HTMLElement} elem 
 * */
class Collection {
  constructor(elem) {
    this.books = []

    /** @type {HTMLElement} */
    this.elem = elem;

    // Loads books from database 
    const request = window.indexedDB.open("books-collection");
    request.onerror = e => alert("couldn't load books collection database", e);
    request.onsuccess = e => {
      const db = e.target.result;
      console.log("books collection db opened correctly")

      const transaction = db.transaction(["books"])
      const store = transaction.objectStore("books");

      const query = store.getAll();
      query.onsuccess = async e => {
        const books = e.target.result

        console.log(e, books);
        for (const book of books) {
          const classBook = new EpubBook();
          await classBook.loadFromFile(book.file);
          this.books.push(classBook);
          console.log("All books have been loaded");
        }

        this.render();
      };
    };

    // DB setup (this is only called when there is no database, or the database
    // version has been updated).
    request.onupgradeneeded = e => {
      console.log("here");
      const db = e.target.result;
      db.createObjectStore("books", { autoIncrement: true });
    };

  }

  /** Loads a book from a file */
  async addBookFromFile(file) {
    const book = new EpubBook();
    await book.loadFromFile(file);
    this.books[book.title] = book;

    // Book (Cover) element
    const request = window.indexedDB.open("books-collection");
    request.onsuccess = e => {

      const db = e.target.result;
      const transaction = db.transaction(["books"], "readwrite")
      const store = transaction.objectStore("books");
      const query = store.add(book);

      query.onsuccess = async () => {
        console.log("book added succesfully");

        await book.loadContent();
        this.books.push(book);
        await this.render();
      }
      query.onerror = e => console.log(e.target.error.message);
    };

  }

  async render() {
    this.elem.innerHTML = "";

    // Main container
    const columns = document.createElement("div");
    columns.classList.add("columns", "is-mobile");

    for (let i = 0; i < this.books.length; i++) {
      const card = document.createElement("a");
      card.classList.add("card", "column");
      card.href = "../reader.html?id=" + i

      const cardImage = document.createElement("div");
      card.appendChild(cardImage);
      cardImage.classList.add("card-image");

      const cardFigure = document.createElement("figure")
      cardImage.appendChild(cardFigure);
      cardFigure.classList.add("image", "is-4by3");

      const cardImg = document.createElement("img");
      cardFigure.appendChild(cardImg);
      cardImg.src = await this.books[i].getCoverBlob();

      columns.appendChild(card);
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

