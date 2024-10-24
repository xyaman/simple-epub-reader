class Reader {
  constructor(readerElem) {
    // Corresponds to the index of the current book
    this.current_book = null;
    this.books = [];
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
}

const reader = new Reader(document.getElementById("reader"));

// Process the epub file
document.getElementById("file-input").addEventListener('change', async function(e) {
  if (e.target.files[0]) {
    console.log('You selected ' + e.target.files[0].name);

    const book = new EpubBook();
    await book.loadFromFile(e.target.files[0])

    reader.books.push(book);

    reader.readerElem.innerHTML = '';
    for (const html of book.textHTML) {
      reader.readerElem.append(html);
    }
  }
});
