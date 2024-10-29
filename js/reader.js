import db from "./db.js"
import settings from "./settings.js"

class Reader {
  constructor(readerElem, bookContentElem, charsCounterElem) {
    // Corresponds to the index of the current book
    this.current_book = null;
    this.bookID = null;

    this.paragraphs = [];
    this.paragraphsCharsAcum = [];

    this.pages = [];
    this.currentPageIndex = 0;

    this.readerElem = readerElem
    this.bookContentElem = bookContentElem;
    this.charsCounterElem = charsCounterElem;

    // This variable is used to not update the database position
    // on the first call of scroll
    // TODO: consider using a timeout
    this.shouldUpdateChars = false;

    /** @type {settings.Setting} */
    this.preferences = settings.load();

    this.updateElemStyle();
  }

  // Updates the elements css based on the reader preferences
  updateElemStyle() {
    this.readerElem.style.fontSize = `${this.preferences.fontSize}px`;
  }

  async setCurrentBook(book) {

    await book.loadContent();

    this.book = book
    this.paragraphsCharsAcum = []
    this.paragraphs = []

    for (const html of this.book.textHTML) {
      this.bookContentElem.append(html);
    }

    // Get all characters per paragraph
    this.paragraphs = this.bookContentElem.querySelectorAll("p");
    this.book.totalIndex = this.paragraphs.length - 1;
    for (let i = 0; i < this.paragraphs.length; i++) {
      this.paragraphs[i].setAttribute("data-index", i);
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
    if (this.preferences.isContinuousReader && this.book.lastReadIndex && this.book.lastReadIndex !== -1) {
      this.paragraphs[this.book.lastReadIndex].scrollIntoView();
    }

    this.charsCounterElem.innerText = `0/${totalChars} (0%)`

    if (this.preferences.isContinuousReader) {
      document.removeEventListener("scroll", this.handleScroll.bind(this));
      document.addEventListener("scroll", this.handleScroll.bind(this));
    } else {
      this.readerElem.style.overflow = "hidden";
      this.readerElem.style.height = "85vh";

      this.setupPaginated();
      this.goToPage(this.currentPageIndex);
    }
  }

  setupPaginated() {

    this.paginateContent();

    // Prev/Next page keybinds
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        this.goToPage(this.currentPageIndex + 1);  // Página siguiente
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        this.goToPage(this.currentPageIndex - 1);  // Página anterior
      }
    });

    // Listen resize to render pages again
  }

  paginateContent() {
    const totalHeight = this.readerElem.clientHeight;
    let currentPageHeight = 0;
    let currentPage = [];

    // Recorre cada párrafo y calcula su altura
    this.bookContentElem.querySelectorAll("p, img, svg").forEach(elem => {

      const paragraphHeight = elem.offsetHeight;
      const currentNode = elem.cloneNode(true);

      // We keep the image inside limits
      if (currentNode.localName === "svg" || currentNode.localName === "img") {
        currentNode.style.maxHeight = `${totalHeight}px`;
      }

      // If the current paragraph is going to be complete visible.
      // We add to the page, and calculate the new height
      if (currentPageHeight + paragraphHeight <= totalHeight) {
        currentPage.push(currentNode);
        currentPageHeight += paragraphHeight;
      } else {
        // Otherwise, we create the page with the current nodes and save
        // the node for the next page.
        this.createPage(currentPage);
        currentPage = [currentNode];
        currentPageHeight = paragraphHeight;
      }
    });

    // After the loop, we add the page if there is content
    if (currentPage.length > 0) {
      this.createPage(currentPage);
    }
  }

  /** Creates a page and push it to this.page
   * @param {HTMLElement} elems
   */
  createPage(elems) {

    // Avoid empty pages. (bug? but sometimes there is a empty page at the beginning)
    if (elems.length === 0) return;

    const pageDiv = document.createElement("div");
    pageDiv.classList.add("page");

    for (let i = 0; i < elems.length; i++) {
      const dataIndex = elems[i].getAttribute("data-index");
      // this.book.lastReadIndex > 0; otherwise if may skip the cover image
      if (dataIndex && this.book.lastReadIndex > 0 && parseInt(dataIndex) === this.book.lastReadIndex) {
        this.currentPageIndex = this.pages.length;
      }
      pageDiv.appendChild(elems[i]);
    }

    this.bookContentElem.appendChild(pageDiv);
    this.pages.push(pageDiv);
  }

  handleScroll() {

    let lastReadIndex = 0;

    if (this.preferences.isContinuousReader) {

      for (let i = 0; i < this.paragraphs.length; i++) {
        const rect = this.paragraphs[i].getBoundingClientRect();
        // When the element is no longer visible, we count as readed
        if (rect.bottom <= 0) {
          const index = this.paragraphs[i].getAttribute("data-index");
          lastReadIndex = parseInt(index);
          continue
        }
        break
      }
    } else {
      const lastParagraph = this.pages[this.currentPageIndex].querySelector("p");
      if (lastParagraph) {
        const lastIndex = lastParagraph.getAttribute("data-index") || null;
        lastReadIndex = lastIndex ? Math.max(parseInt(lastIndex) - 1, 0) : this.book.lastReadIndex;

        // This happens when the element is an image or svg. In this case we dont update
        // the index.
      } else {
        lastReadIndex = this.book.lastReadIndex;
      }
    }

    if (lastReadIndex != this.book.lastReadIndex) {
      const progressPercentage = this.paragraphsCharsAcum[lastReadIndex] / this.paragraphsCharsAcum.slice(-1)[0] * 100;
      this.charsCounterElem.innerText = `${this.paragraphsCharsAcum[lastReadIndex]}/${this.paragraphsCharsAcum.slice(-1)[0]} (${progressPercentage.toFixed(2)}%)`

      if (this.shouldUpdateChars) {
        // Update into the db every time?
        this.book.lastReadIndex = lastReadIndex;
        db.updateBookPosition(this.book.id, this.book);
      }
      this.shouldUpdateChars = true;
    }

  }

  // Cambia a la página especificada
  goToPage(pageIndex) {
    this.currentPageIndex = Math.max(0, Math.min(pageIndex, this.pages.length - 1));  // Limita el índice
    this.bookContentElem.innerHTML = "";  // Limpia el contenido actual
    this.bookContentElem.appendChild(this.pages[this.currentPageIndex]);  // Añade la nueva página
    this.handleScroll();
  }

}

const reader = new Reader(document.getElementById("reader"), document.getElementById("book-content"), document.getElementById("character-counter"));

// TODO: Handle invalid (or null) id
const urlParams = new URLSearchParams(window.location.search);
const id = parseInt(urlParams.get("id"));

// Improve this to avoid fetching all books
const bookObject = await db.getBookById(id);
if (bookObject) {
  const book = await EpubBook.newFromExistingObject(id, bookObject)
  await reader.setCurrentBook(book);
} else {
  // TODO: Show error message
  window.location.pathname = "/"
}
