# Simple epub reader, focused in Japanese books.

## Features
- Lightweight.
- Read epub books.
- Paginated y continous (scroll) mode.
- Save books (library)
- Reader preferences (font size, ...).
- Reader saves the book progress.

## Limitations

- It uses IndexedDB to save books, so all books are saved in the browser. Just 
save the books you want to read and not use it as a drive.
- No encryptation (and it wont have). Don't store sensitive data. 

## How to use it

To use it, just clone the repo and start a local server.

Or try the github page (production branch): https://xyaman.github.io/simple-epub-reader


## TODO:
- Better UI (See book progress in collection page)
- Epub navigation support
- More user settings (themes, line height, better ui).
- Fully responsive
- PWA
- Vertical text (japanese)
- Synchronization (server?)


## Libraries
- [Stuck/jszip](https://github.com/Stuk/jszip)
- [jakearchibald/idb](https://github.com/jakearchibald/idb) 
