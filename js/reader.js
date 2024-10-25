import db from "./db.js"

class Reader {
  constructor(readerElem, charsCounterElem) {
    // Corresponds to the index of the current book
    this.current_book = null;
    this.bookID = null;

    this.paragraphs = [];
    this.paragraphsCharsAcum = [];

    this.readerElem = readerElem
    this.charsCounterElem = charsCounterElem;

    this.preferences = {
      fontSize: 25,
    };

    this.updateElemStyle();
  }

  // Updates the elements css based on the reader preferences
  updateElemStyle() {
    this.readerElem.style.fontSize = `${this.preferences.fontSize}px`;
  }

  setCurrentBook(book) {
    this.book = book
    this.readerElem.innerHTML = '';
    this.paragraphsCharsAcum = []
    this.paragraphs = []

    for (const html of this.book.textHTML) {
      this.readerElem.append(html);
    }

    // Get all characters per paragraph
    this.paragraphs = this.readerElem.querySelectorAll("p");
    for (let i = 0; i < this.paragraphs.length; i++) {
      this.paragraphs[i].setAttribute("data-index", i);
      this.book.totalIndex = i;
    }

    const isNotJapaneseRegex =
      /[^0-9A-Z○◯々-〇〻ぁ-ゖゝ-ゞァ-ヺー０-９Ａ-Ｚｦ-ﾝ\p{Radical}\p{Unified_Ideograph}]+/gimu;

    function getRawCharacterCount(node) {
      if (!node.textContent) return 0;
      return countUnicodeCharacters(node.textContent.replace(isNotJapaneseRegex, ''));
    }

    function countUnicodeCharacters(s) {
      return Array.from(s).length;
    }

    let totalChars = 0;
    this.paragraphs.forEach(p => {
      const clone = p.cloneNode(true);

      const rttags = clone.getElementsByTagName("rt");
      for (let i = 0; i < rttags.length; i++) {
        rttags[i].parentNode.removeChild(rttags[i]);
      }

      totalChars += getRawCharacterCount(clone);
      this.paragraphsCharsAcum.push(totalChars); // Guarda la cantidad total de caracteres hasta este párrafo
    });

    // Move the reader to the current position
    if (this.book.lastReadIndex) {
      this.paragraphs[this.book.lastReadIndex].scrollIntoView();
    }

    this.charsCounterElem.innerText = `0/${totalChars} (0%)`

    document.removeEventListener("scroll", this.handleScroll.bind(this));
    document.addEventListener("scroll", this.handleScroll.bind(this));
  }

  handleScroll() {
    let lastReadIndex = 0;

    for (let i = 0; i < this.paragraphs.length; i++) {
      const rect = this.paragraphs[i].getBoundingClientRect();
      // When the element is no longer visible, we count as readed
      if (rect.bottom <= 0) {
        lastReadIndex = parseInt(this.paragraphs[i].getAttribute("data-index"));
        continue
      }
      break
    }

    if (lastReadIndex != this.book.lastReadIndex) {
      const progressPercentage = this.paragraphsCharsAcum[lastReadIndex] / this.paragraphsCharsAcum.slice(-1)[0] * 100;
      this.charsCounterElem.innerText = `${this.paragraphsCharsAcum[lastReadIndex]}/${this.paragraphsCharsAcum.slice(-1)[0]} (${progressPercentage.toFixed(2)}%)`
      this.book.lastReadIndex = lastReadIndex;

      // Update into the db every time?
      db.updateBookPosition(this.bookID, this.book);
    }

  }
}

const reader = new Reader(document.getElementById("reader"), document.getElementById("character-counter"));
// get id
const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get("id");

// Improve this to avoid fetching all books
const books = await db.getAllBooks();

const book = new EpubBook(parseInt(id))
await book.loadFromFile(books[id].value.file);
await book.loadContent();
reader.bookID = books[id].key;
book.lastReadIndex = books[id].value.lastReadIndex;

reader.setCurrentBook(book);

