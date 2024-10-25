class Reader {
  constructor(readerElem) {
    // Corresponds to the index of the current book
    this.current_book = null;

    this.paragraphs = [];
    this.paragraphsCharsAcum = [];
    this.lastReadIndex = 0;

    this.readerElem = readerElem

    this.preferences = {
      fontSize: 25,
    };

    this.updateElem();
  }

  // Updates the elements css based on the reader preferences
  updateElem() {
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

    if (lastReadIndex != this.lastReadIndex) {
      // const progressPercentage = this.paragraphsCharsAcum[lastReadIndex] / this.paragraphsCharsAcum.slice(-1)[0] * 100;
      // console.log(`Progreso de lectura: ${this.paragraphsCharsAcum[lastReadIndex]}/${this.paragraphsCharsAcum.slice(-1)[0]} (${progressPercentage.toFixed(2)}%)`);
      this.lastReadIndex = lastReadIndex;
    }

  }
}

const reader = new Reader(document.getElementById("reader"));

// Process the epub file
document.getElementById("file-input").addEventListener('change', async function(e) {
  if (e.target.files[0]) {
    console.log('EPUB file: ' + e.target.files[0].name);

    const book = new EpubBook();
    await book.loadFromFile(e.target.files[0])

    reader.setCurrentBook(book);
  }
});

