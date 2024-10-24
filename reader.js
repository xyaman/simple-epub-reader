const reader = document.getElementById("reader")

// Process the epub file
document.getElementById("file-input").addEventListener('change', async function(e) {
  if (e.target.files[0]) {
    console.log('You selected ' + e.target.files[0].name);

    const book = new EpubBook();
    await book.loadFromFile(e.target.files[0])

    reader.innerHTML = '';
    for (const html of book.textHTML) {
      reader.append(html);
    }
  }
});
