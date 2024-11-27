import * as db from "./db";
import { EpubBook } from "./epub";

// @ts-ignore
import JSZipUtils from "./libs/jszip-utils.js"

async function main() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("url")) {
        window.location.href = "/index.html";
    }

    const bookurl = decodeURIComponent(params.get("url")!);
    // const bookfilename = params.get("name")!;

    // @ts-ignore
    JSZipUtils.getBinaryContent(bookurl, async (err, data) => {
        if (err) {
            return;
            alert(`error getting file. error: ${err}`);
            window.location.href = "/index.html";
            return;
        }

        try {
            const book = await EpubBook.newFromFile(data);
            await db.addBook(book);
            alert("Book added succesfully");
            window.location.href = "/index.html";
            console.log(book.title, "sera agregado");

        } catch (err) {
            alert(err);
            window.location.href = "/index.html";
        }
    });
}

document.addEventListener("DOMContentLoaded", main);
