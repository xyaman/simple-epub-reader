import { EpubBook } from "./epub";
import { ISettings } from "./settings";
import * as settings from "./settings";
import * as db from "./db";

export class Reader {
  currentBook?: EpubBook;

  readerElem: HTMLElement;
  bookContentElem: HTMLElement;
  charsCounterElem: HTMLElement;
  pageCounterElem: HTMLElement;

  /** Book paragraphs <p> tags */
  private paragraphs!: NodeListOf<HTMLParagraphElement>;

  /** Corresponds to the chars acumulated from paragraph 0 to i */
  private paragraphsCharsAcum: number[] = [];

  /** Corresponds to all book pages (when using paginated mode) */
  private pages: HTMLElement[] = [];

  private pageIndex: number = 0;
  private swipeStartX: number = 0
  private swipeEndX: number = 0

  private preferences: ISettings;
  private scrollTimer?: ReturnType<typeof setTimeout>;

  constructor(readerElem: HTMLElement, charsCounterElem: HTMLElement, pageCounterElem: HTMLElement) {

    this.readerElem = readerElem;
    this.charsCounterElem = charsCounterElem;
    this.pageCounterElem = pageCounterElem;

    this.bookContentElem = document.createElement("div");
    this.bookContentElem.setAttribute("id", "book-content");
    this.readerElem.append(this.bookContentElem);

    this.preferences = settings.load();
    this.updateReaderStyle();
  }

  /** Updates the elements css based on the reader preferences */
  private updateReaderStyle() {
    this.readerElem.style.fontSize = `${this.preferences.readerFontSize}px`;
    this.readerElem.style.height = `${Math.ceil(window.innerHeight * 0.8)}px`

    // TODO: improve this
    if (this.preferences.lightTheme) {
      this.readerElem.style.color = "black";
      this.readerElem.style.background = "white";

      this.pageCounterElem.style.color = "black";
      this.charsCounterElem.style.color = "black";

      document.body.style.color = "black";
      document.body.style.background = "white";
    }
  }

  /** Sets a new book and render it into `this.readerElem` */
  async setBook(book: EpubBook) {

    // TODO: Clean (blobs for ex)
    // if (this.currentBook) {
    // }

    this.currentBook = book;
    await book.loadContent();

    // it's necesary to render the content in order to
    // calculate the rect size (paginated mode).
    for (const html of this.currentBook.textHTML) {
      this.bookContentElem.append(html);
    }

    // Re-initialize book-related properties
    this.paragraphs = this.bookContentElem.querySelectorAll("p");
    this.paragraphsCharsAcum = []

    // We calculate totalIndex, and then we mark every 
    // paragraph index to get reading progress, when required.
    this.currentBook.totalIndex = this.paragraphs.length;
    for (let i = 0; i < this.paragraphs.length; i++) {
      this.paragraphs[i].setAttribute("data-index", `${i}`);
    }

    // Calculate acumulated chars until 'i' paragraph
    // TODO: better way to handle paragraphs? (chars are different from ttsu-reader)
    let totalChars = 0;
    for (let i = 0; i < this.paragraphs.length; i++) {

      // We clone the paragraph, because we will remove all the 
      // <rt> tags and we dont want to modify the original
      const clone = this.paragraphs[i].cloneNode(true) as HTMLElement;

      const rttags = clone.getElementsByTagName("rt");
      for (let i = 0; i < rttags.length; i++) {
        rttags[i].parentNode?.removeChild(rttags[i]);
      }

      totalChars += getRawCharacterCount(clone);
      this.paragraphsCharsAcum.push(totalChars);
    }

    // Counter text (re-)initialization
    this.charsCounterElem.innerText = `0/${totalChars} (0%)`

    // Initialize the reader (continous / paginated)
    if (this.preferences.readerIsPaginated) {
      this.setupPaginated();
    } else {
      this.setupContinous();
    }
  }

  private setupContinous() {
    // this should never happen (this fucntion is called by `setBook`)
    if (!this.currentBook) return;

    // We scroll into lastReadIndex
    if (this.currentBook.lastReadIndex > 0) {
      this.paragraphs[this.currentBook.lastReadIndex].scrollIntoView();
    }

    document.removeEventListener("scroll", this.continousHandleTimer.bind(this));
    document.addEventListener("scroll", this.continousHandleTimer.bind(this));
  }

  private continousHandleTimer() {
    if (this.scrollTimer !== null) {
      clearTimeout(this.scrollTimer);
    }
    this.scrollTimer = setTimeout(this.continousHandleScroll.bind(this), 150);
  }

  // This function is called once the scroll ends
  private continousHandleScroll() {

    // this should never happen (this fucntion is called by `setBook`)
    if (!this.currentBook) return;

    let lastReadIndex = 0;

    for (let i = 0; i < this.paragraphs.length; i++) {
      const rect = this.paragraphs[i].getBoundingClientRect();

      // When the element is no longer visible, we count as readed
      // No longer visible: rect.bottom <= 0
      if (rect.bottom > 0) break

      const index = this.paragraphs[i].getAttribute("data-index") || "0";
      lastReadIndex = parseInt(index);
    }

    if (lastReadIndex != this.currentBook.lastReadIndex) {
      this.currentBook.lastReadIndex = lastReadIndex;
      db.updateBookPosition(this.currentBook);

      // xx/yyy (xx%)
      const progressPercentage = this.paragraphsCharsAcum[lastReadIndex] / this.paragraphsCharsAcum[this.paragraphsCharsAcum.length - 1] * 100;
      this.charsCounterElem.innerText = `${this.paragraphsCharsAcum[lastReadIndex]}/${this.paragraphsCharsAcum[this.paragraphsCharsAcum.length - 1]} (${progressPercentage.toFixed(2)}%)`
    }
  }

  private setupPaginated() {

    // We need to check and choose better defaults?
    this.readerElem.style.overflow = "hidden";
    this.readerElem.style.height = `${Math.ceil(window.innerHeight * 0.8)}px`

    // IOS bouncing
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";

    // Create all the pages, should be called again after resize event
    const paginateContent = () => {
      const totalHeight = this.readerElem.clientHeight;
      let currentPageHeight = 0;
      let currentPageContent: HTMLElement[] = [];

      this.pages = [];
      this.pageIndex = 0;

      // We go trough all the elements that should be rendered
      // <p>: but ony <p> that doesn't contain img
      // <img> <svg> tags, images
      const elems = this.bookContentElem.querySelectorAll("p:not(:has(img)), img, svg") as NodeListOf<HTMLElement>;
      for (let i = 0; i < elems.length; i++) {

        const elemHeight = elems[i].offsetHeight;
        const elem = elems[i].cloneNode(true) as HTMLElement;

        // TODO: Do we really need this?
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
          // TODO: check this
          if (currentPageContent.length > 0) this.paginatedCreatePage(currentPageContent);
          currentPageContent = [elem];
          currentPageHeight = elemHeight;
        }
      }
      // After the loop, we add the page if there is content
      if (currentPageContent.length > 0) {
        this.paginatedCreatePage(currentPageContent);
      }
    };

    paginateContent();
    this.goToPage(this.pageIndex);

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        this.goToPage(this.pageIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        this.goToPage(this.pageIndex - 1);
      }
    });

    window.addEventListener("resize", () => {
      this.readerElem.style.height = `${Math.ceil(window.innerHeight * 0.8)}px`
      // TODO: Find a better way?
      this.bookContentElem.innerHTML = "";

      for (const html of this.currentBook!.textHTML) {
        this.bookContentElem.append(html);
      }
      this.paragraphs = this.bookContentElem.querySelectorAll("p");

      paginateContent();
      this.goToPage(this.pageIndex);
    });

    // Swipe Support
    document.addEventListener("touchstart", e => {
      this.swipeStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener("touchend", e => {
      this.swipeEndX = e.changedTouches[0].screenX;

      const diff = Math.abs(this.swipeEndX - this.swipeStartX);
      if (diff < 30) return;

      // Swipe left
      if (this.swipeEndX < this.swipeStartX) {
        this.goToPage(this.pageIndex + 1);
      } else {
        this.goToPage(this.pageIndex - 1);
      }

      console.log(this.pages[this.pageIndex]);

    });
  }

 /** Creates a page and push it to this.page.
   * Note: This function only works if the reader is in paginated mode */
  paginatedCreatePage(elems: HTMLElement[]) {
    if (!this.preferences.readerIsPaginated) return;

    const pageDiv = document.createElement("div");
    pageDiv.classList.add("page");

    for (let i = 0; i < elems.length; i++) {
      const dataIndex = elems[i].getAttribute("data-index");
      // this.book.lastReadIndex > 1; otherwise if may skip the cover image
      if (dataIndex && this.currentBook!.lastReadIndex > 1 && parseInt(dataIndex) === this.currentBook!.lastReadIndex) {
        this.pageIndex = this.pages.length;
      }
      pageDiv.appendChild(elems[i]);
    }

    this.pages.push(pageDiv);
  } 
  
goToPage(pageIndex: number) {
    this.pageIndex = Math.max(0, Math.min(pageIndex, this.pages.length - 1));

    this.bookContentElem.innerHTML = "";
    this.bookContentElem.appendChild(this.pages[this.pageIndex]);

    // To prevent going further when there are images
    let lastValidIndex = this.currentBook!.lastReadIndex - 1;
    const lastParagraph = this.pages[this.pageIndex].querySelector("p");
    if (lastParagraph) {
      const lastIndex = lastParagraph.getAttribute("data-index") || null;
      lastValidIndex = lastIndex ? Math.max(parseInt(lastIndex) - 1, 0) : this.currentBook!.lastReadIndex;
      this.currentBook!.lastReadIndex = lastValidIndex + 1;
    }

    // Update character counter
    const progressPercentage = this.paragraphsCharsAcum[lastValidIndex] / this.paragraphsCharsAcum.slice(-1)[0] * 100;
    this.charsCounterElem.innerText = `${this.paragraphsCharsAcum[lastValidIndex]}/${this.paragraphsCharsAcum.slice(-1)[0]} (${progressPercentage.toFixed(2)}%)`

    // Update page counter
    this.pageCounterElem.innerText = `Page ${this.pageIndex}/${this.currentBook!.totalIndex}`;

    db.updateBookPosition(this.currentBook!);
  }
}

// https://github.com/ttu-ttu/ebook-reader/blob/main/apps/web/src/lib/functions/get-character-count.ts
const isNotJapaneseRegex =
  /[^0-9A-Z○◯々-〇〻ぁ-ゖゝ-ゞァ-ヺー０-９Ａ-Ｚｦ-ﾝ\p{Radical}\p{Unified_Ideograph}]+/gimu;

function getRawCharacterCount(node: Node) {
  if (!node.textContent) return 0;
  return countUnicodeCharacters(node.textContent.replace(isNotJapaneseRegex, ''));
}

function countUnicodeCharacters(s: string) {
  return Array.from(s).length;
}

async function main() {
  const reader = new Reader(document.getElementById("reader")!, document.getElementById("character-counter")!, document.getElementById("page-counter")!);

  // TODO: Handle invalid (or null) id
  const urlParams = new URLSearchParams(window.location.search);
  const id = parseInt(urlParams.get("id")!);

  const bookObject = await db.getBookById(id);
  if (bookObject) {
    const book = await EpubBook.newFromExistingObject(id, bookObject)
    await reader.setBook(book);
  }
}

document.addEventListener("DOMContentLoaded", main);
