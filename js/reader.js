import db from "./db.js"
import settings from "./settings.js"
import { EpubBook } from "./epub.js";

/** @import { EpubBook } from "./epub.js" */

class Reader {

  /** @type {EpubBook | null} */
  current_book = null;

  /** @type {HTMLElement} */
  readerElem;

  /** @type {HTMLElement} */
  bookContentElem;

  /** @type {HTMLElement} */
  charsCounterElem;

  /** Corresponds to all book paragraphs.
   * @type {HTMLElement[]} 
   * */
  #paragraphs = [];

  /** corresponds to the chars acumulated from paragraph 0 to i
   * @type {number[]} 
   * */
  #paragraphsCharsAcum = [];


  /** Corresponds to all book pages (when using paginated mode)
   * @type {HTMLElement[]} 
   * */
  #pages = [];

  /** @type {number} */
  #currentPageIndex = 0;

  /** @type {number} */
  #swipeStartX = 0

  /** @type {number} */
  #swipeEndX = 0

  /** @type {import("./settings.js").Settings} */
  preferences;

  /** @param {HTMLElement} readerElem */
  constructor(readerElem, charsCounterElem) {

    this.readerElem = readerElem;
    this.charsCounterElem = charsCounterElem;
    this.bookContentElem = document.createElement("div");
    this.bookContentElem.setAttribute("id", "book-content");
    this.readerElem.append(this.bookContentElem);


    /** @type {settings.Setting} */
    this.preferences = settings.load();
    this.updateReaderStyle();
  }

  /** Updates the elements css based on the reader preferences */
  updateReaderStyle() {
    this.readerElem.style.fontSize = `${this.preferences.fontSize}px`;
    this.readerElem.style.height = `${Math.ceil(window.innerHeight * 0.8)}px`
  }

  /** Sets a new book and prepares the prepares the reader to show the book.
   * It will also render the book into the this.readerElem
   * @param {EpubBook} book 
   * */
  async setCurrentBook(book) {
    this.current_book = book;
    await book.loadContent();

    // TODO: See if it is possible to use a temporal (or not rendered component)
    // document.createElement
    for (const html of this.current_book.textHTML) {
      this.bookContentElem.append(html);
    }

    // Re-initialize book-related properties
    this.#paragraphs = this.bookContentElem.querySelectorAll("p");
    this.#paragraphsCharsAcum = []

    // We calculate totalIndex, and then we mark every 
    // paragraph index to get reading progress, when required.
    this.current_book.totalIndex = this.#paragraphs.length;
    for (let i = 0; i < this.#paragraphs.length; i++) {
      this.#paragraphs[i].setAttribute("data-index", i);
    }

    // Calculate acumulated chars until 'i' paragraph
    let totalChars = 0;
    for (let i = 0; i < this.#paragraphs.length; i++) {
      // We clone the paragraph, because we will modify it by
      // removing all rt tags
      const clone = this.#paragraphs[i].cloneNode(true);

      const rttags = clone.getElementsByTagName("rt");
      for (let i = 0; i < rttags.length; i++) {
        rttags[i].parentNode.removeChild(rttags[i]);
      }

      totalChars += getRawCharacterCount(clone);
      this.#paragraphsCharsAcum.push(totalChars);
    }

    // Counter initialization
    this.charsCounterElem.innerText = `0/${totalChars} (0%)`


    // Initialize the reader (continous / paginated)
    if (this.preferences.readerIsPaginated) {
      this.#setupPaginated();
    } else {
      this.#setupContinous();
    }
  }

  #setupContinous() {
    // We scroll into lastReadIndex
    if (this.current_book.lastReadIndex) {
      this.#paragraphs[this.current_book.lastReadIndex].scrollIntoView();
    }

    document.removeEventListener("scroll", this.#continousHandleScroll.bind(this));
    document.addEventListener("scroll", this.#continousHandleScroll.bind(this));
  }

  // TODO: Use timeout? Reduce the calls 
  /** Continous Mode Reader: Handles the scroll */
  #continousHandleScroll() {
    let lastReadIndex = 0;

    for (let i = 0; i < this.#paragraphs.length; i++) {
      const rect = this.#paragraphs[i].getBoundingClientRect();
      // When the element is no longer visible, we count as readed
      // No longer visible: rect.bottom <= 0
      if (rect.bottom > 0) break
      const index = this.#paragraphs[i].getAttribute("data-index");
      lastReadIndex = parseInt(index);
    }

    // The scroll event is fired many times, so we want to update the db,
    // only if the lastReadIndex is different from the last update
    if (lastReadIndex != this.current_book.lastReadIndex) {
      this.current_book.lastReadIndex = lastReadIndex;
      db.updateBookPosition(this.current_book);

      const progressPercentage = this.#paragraphsCharsAcum[lastReadIndex] / this.#paragraphsCharsAcum.slice(-1)[0] * 100;
      this.charsCounterElem.innerText = `${this.#paragraphsCharsAcum[lastReadIndex]}/${this.#paragraphsCharsAcum.slice(-1)[0]} (${progressPercentage.toFixed(2)}%)`
    }
  }

  #setupPaginated() {
    this.readerElem.style.overflow = "hidden";
    this.readerElem.style.height = `${Math.ceil(window.innerHeight * 0.8)}px`

    // IOS bouncing
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";

    // this.readerElem.style.height = "85vh";

    // Create all the pages, should be called again after resize event
    const paginateContent = () => {
      const totalHeight = this.readerElem.clientHeight;
      let currentPageHeight = 0;
      let currentPageContent = [];

      this.#pages = [];
      this.#currentPageIndex = 0;

      // We go trough all the elements that should be rendered
      // <p>: but ony <p> that doesn't contain img
      // <img> <svg> tags, images
      const elems = this.bookContentElem.querySelectorAll("p:not(:has(img)), img, svg");
      for (let i = 0; i < elems.length; i++) {

        const elemHeight = elems[i].offsetHeight;
        const elem = elems[i].cloneNode(true);

        // We force the image to be inside limits
        if (elem.localName === "svg" || elem.localName === "img") {
          elem.style.maxHeight = `${totalHeight}px`;
        }

        // If the current paragraph is going to be complete visible.
        // We add to the page, and calculate the new height
        if (currentPageHeight + elemHeight <= totalHeight) {
          currentPageContent.push(elem);
          currentPageHeight += elemHeight;
        } else {
          // Otherwise, we create the page with the current nodes and save
          // the node for the next page.

          // Usually there is an image (cover) as first element, so the first
          // page is empty
          if (currentPageContent.length > 0) this.#paginatedCreatePage(currentPageContent);
          currentPageContent = [elem];
          currentPageHeight = elemHeight;
        }
      }
      // After the loop, we add the page if there is content
      if (currentPageContent.length > 0) {
        this.#paginatedCreatePage(currentPageContent);
      }
    };


    paginateContent();
    this.goToPage(this.#currentPageIndex);

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        this.goToPage(this.#currentPageIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        this.goToPage(this.#currentPageIndex - 1);
      }
    });

    window.addEventListener("resize", () => {
      this.readerElem.style.height = `${Math.ceil(window.innerHeight * 0.8)}px`
      // TODO: Find a better way?
      this.bookContentElem.innerHTML = "";

      for (const html of this.current_book.textHTML) {
        this.bookContentElem.append(html);
      }
      this.#paragraphs = this.bookContentElem.querySelectorAll("p");

      paginateContent();
      this.goToPage(this.#currentPageIndex);
    });

    // Swipe Support
    document.addEventListener("touchstart", e => {
      this.#swipeStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener("touchend", e => {
      this.#swipeEndX = e.changedTouches[0].screenX;

      const diff = Math.abs(this.#swipeEndX - this.#swipeStartX);
      if (diff < 30) return;

      // Swipe left
      if (this.#swipeEndX < this.#swipeStartX) {
        this.goToPage(this.#currentPageIndex + 1);
      } else {
        this.goToPage(this.#currentPageIndex - 1);
      }

      console.log(this.#pages[this.#currentPageIndex]);

    });
  }

  /** Creates a page and push it to this.page.
   * Note: This function only works if the reader is in paginated mode
   * @param {HTMLElement} elems
   */
  #paginatedCreatePage(elems) {
    if (!this.preferences.readerIsPaginated) return;

    const pageDiv = document.createElement("div");
    pageDiv.classList.add("page");

    for (let i = 0; i < elems.length; i++) {
      const dataIndex = elems[i].getAttribute("data-index");
      // this.book.lastReadIndex > 1; otherwise if may skip the cover image
      if (dataIndex && this.current_book.lastReadIndex > 1 && parseInt(dataIndex) === this.current_book.lastReadIndex) {
        this.#currentPageIndex = this.#pages.length;
      }
      pageDiv.appendChild(elems[i]);
    }

    this.#pages.push(pageDiv);
  }

  goToPage(pageIndex) {
    this.#currentPageIndex = Math.max(0, Math.min(pageIndex, this.#pages.length - 1));

    this.bookContentElem.innerHTML = "";
    this.bookContentElem.appendChild(this.#pages[this.#currentPageIndex]);

    // To prevent going further when there are images
    let lastValidIndex = this.current_book.lastReadIndex - 1;
    const lastParagraph = this.#pages[this.#currentPageIndex].querySelector("p");
    if (lastParagraph) {
      const lastIndex = lastParagraph.getAttribute("data-index") || null;
      lastValidIndex = lastIndex ? Math.max(parseInt(lastIndex) - 1, 0) : this.current_book.lastReadIndex;
    }

    if (lastParagraph) {
      this.current_book.lastReadIndex = lastValidIndex + 1;
    }
    const progressPercentage = this.#paragraphsCharsAcum[lastValidIndex] / this.#paragraphsCharsAcum.slice(-1)[0] * 100;
    this.charsCounterElem.innerText = `${this.#paragraphsCharsAcum[lastValidIndex]}/${this.#paragraphsCharsAcum.slice(-1)[0]} (${progressPercentage.toFixed(2)}%)`

    db.updateBookPosition(this.current_book);
  }
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


// MAIN
async function main() {
  const reader = new Reader(document.getElementById("reader"), document.getElementById("character-counter"));

  // TODO: Handle invalid (or null) id
  const urlParams = new URLSearchParams(window.location.search);
  const id = parseInt(urlParams.get("id"));

  // Improve this to avoid fetching all books
  const bookObject = await db.getBookById(id);
  if (bookObject) {
    const book = await EpubBook.newFromExistingObject(id, bookObject)
    await reader.setCurrentBook(book);
  }
}

document.addEventListener("DOMContentLoaded", main);
