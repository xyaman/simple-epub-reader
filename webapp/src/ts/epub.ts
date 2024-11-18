// @ts-ignore
import JSZip from "./libs/jszip.min.js";

interface IPartialBook {
  title: string;
  identifier?: string;
  creator: string;
  language: string;
  updatedAt: number;
  lastReadIndex: number;
  totalIndex: number;
  file: File;
}

interface INavigationItem {
  href: string;
  text: string;
}

// TODO: Things to check:
// 1. parsedContent should be saved in the class? (do we save cpu or mem?)
// 2.
export class EpubBook {
  id: number = -1;
  updatedAt: number = 0 // timestamp

  title!: string;
  creator!: string; // Check: Can be more than one creator. (Should we consider it?)
  language!: string;
  identifier?: string;

  // We must use this in order to get the current percentage.
  // `totalIndex` should be initialized when it's first open by the reader
  totalIndex: number = 0;
  lastReadIndex: number = 0;

  file!: File;
  blobs: Blob[] = [];

  /** Array of all book html+xml content already sanitized to work with images */
  textHTML: HTMLElement[] = [];
  navigation: INavigationItem[] = [];
  links: HTMLAnchorElement[] = [];

  rootfilepath?: string;
  rootpath?: string;
  coverimagepath?: string;

  /** Zip File (jszip library) https://github.com/Stuk/jszip */
  private _zip: any;
  private isLoaded: boolean = false;


  /** This function is used when you create a `EpubBook` from a file (input) */
  static async newFromFile(file: File) {
    const book = new EpubBook();
    book.file = file;
    await book.#loadMetadata();

    // TODO: load paragraphs lenght (currently the only way would be load the book content) 
    // book.loadContent();
    //const tempElem = document.createElement("div");
    //tempElem.append(...book.textHTML);
    //book.totalIndex = tempElem.querySelectorAll("p").length;

    return book;
  }

  /** This function is used when you create a `EpubBook` from a DB item */
  static async newFromExistingObject(id: IDBValidKey, object: IPartialBook) {
    const book = new EpubBook();

    book.id = id as number;
    book.updatedAt = object.updatedAt || 0;
    book.title = object.title;
    book.language = object.language;
    book.creator = object.creator;
    book.lastReadIndex = object.lastReadIndex || 0;
    book.totalIndex = object.totalIndex || 0;
    book.file = object.file;
    book.identifier = object.identifier;

    await book.#loadMetadata();
    return book;
  }


  /** This getter returns a object ready to be saved into indexedDB 
   * Note: this object MUST be used when saving in the db. */
  get object(): IPartialBook {
    return {
      // id: this.id,
      title: this.title,
      updatedAt: this.updatedAt,
      language: this.language,
      creator: this.creator,
      lastReadIndex: this.lastReadIndex || 0,
      totalIndex: this.totalIndex || 0,
      file: this.file,
      identifier: this.identifier,
    };
  }

  /** @throws Throws error if the epub has an invalid format */
  async #loadMetadata() {
    const zip = await this.zipfile();
    const domparser = new DOMParser();

    // We must first read META-INF/container.xml
    const container = await zip.file("META-INF/container.xml").async("text");
    const containerContent = domparser.parseFromString(container, "application/xml");
    const rootfilepath = containerContent.querySelector("rootfile")?.getAttribute("full-path");

    if (!rootfilepath) throw new Error("META-INF/container.xml: missing rootfile tag");

    let roothPath = "";
    let match = rootfilepath?.match(/^.*\//);
    if (match) {
      roothPath = match[0];
    }

    this.rootpath = roothPath;
    this.rootfilepath = rootfilepath!;

    // Metadata
    // https://idpf.org/epub/20/spec/OPF_2.0.1_draft.htm
    const content = await zip.file(rootfilepath).async("text");
    const parsedContent = domparser.parseFromString(content, "application/xhtml+xml");

    this.title = parsedContent.getElementsByTagName("dc:title")[0].innerHTML;
    this.language = parsedContent.getElementsByTagName("dc:language")[0].innerHTML;
    this.creator = parsedContent.getElementsByTagName("dc:creator")[0].innerHTML;

    // TODO: considerar usar dc identifier como id dentro de la base sql
    this.identifier = parsedContent.getElementsByTagName("dc:identifier")[0].innerHTML;

    console.log("id:", this.identifier);

    // Usually the epub cover has properties="cover-image", if its not found,
    // we use the first found image
    // TODO: Have a fallback static img, in case no images are found
    const coverImage = parsedContent.querySelector('item[properties="cover-image"]') || parsedContent.querySelector('item[media-type="image/jpeg"]');
    if (coverImage) {
      this.coverimagepath = this.rootpath + coverImage.getAttribute("href");
    }
  }

  /** Returns the image as a blob url */
  async getCoverBlob(): Promise<string> {
    //if (!this.coverimagepath) TODO: Have a fallback static img

    const r = await (await this.zipfile()).file(this.coverimagepath).async("blob")
    let blob = r.slice(0, r.size, "image/jpeg")
    return URL.createObjectURL(blob);
  }

  async zipfile() {
    if (!this.file) return;
    this._zip = this._zip || await JSZip.loadAsync(this.file);
    return this._zip;
  }

  async loadContent(reload = false) {
    // we return if there is no file (shouldn't happens)
    if (!this.file) return;

    // we return if the book is already loaded and reload is false
    if (this.isLoaded && !reload) return;

    const starttime = Date.now();
    const zip = await this.zipfile();

    // We must first read META-INF/container.xml
    const content: string = await zip.file(this.rootfilepath).async("text")
    const parser = new DOMParser();
    const parsedContent = parser.parseFromString(content, "application/xhtml+xml");

    // Read Contents (Manifest)

    // Navigation (https://w3c.github.io/epub-specs/epub33/overview/#sec-nav)

    // ex. <item media-type="application/xhtml+xml" id="toc" href="navigation-documents.xhtml" properties="nav"/>
    const navigationitem = parsedContent.querySelector("item[properties='nav']");
    if (navigationitem) {
      const navigationpath = this.rootpath + navigationitem.getAttribute("href")!;

      //<nav epub:type="toc" id="toc">
      //  <h1>Navigation</h1>
      //  <ol>
      //    <li><a href="xhtml/p-cover.xhtml">表紙</a></li>
      //    <li><a href="xhtml/p-toc-002.xhtml">もくじ</a></li>
      //    <li><a href="xhtml/p-002.xhtml#toc-001">第一章</a></li>
      //    <li><a href="xhtml/p-003.xhtml#toc-002">第二章</a></li>
      //    <li><a href="xhtml/p-004.xhtml#toc-003">第三章</a></li>
      //    <li><a href="xhtml/p-005.xhtml#toc-004">第四章</a></li>
      //    <li><a href="xhtml/p-006.xhtml#toc-005">終章</a></li>
      //    <li><a href="xhtml/p-007.xhtml#toc-006">あとがき</a></li>
      //    <li><a href="xhtml/p-colophon.xhtml">奥付</a></li>
      //  </ol>
      //</nav>
      const navigationfile: string = await zip.file(navigationpath).async("text");
      const navigationcontent = parser.parseFromString(navigationfile, "application/xhtml+xml");

      // TODO: there might be more than one nav, resulting in undefined hrefs
      const a = navigationcontent.querySelectorAll("li a");
      for (const item of a) {
        const href = this.rootpath + item.getAttribute("href")?.split("#")[1]!;
        this.navigation.push({ href: href!, text: item.textContent! });
      }
    }

    // Images

    // We save all the blobs to free them after-use
    // We load all images
    // TODO: Support for gaiji??
    // img.gaiji,
    // img.gaiji-line,
    // img.gaiji-wide {
    //   display:    inline-block;
    //   margin:     0;
    //   padding:    0;
    //   border:     none;
    //   background: transparent;
    // }

    // key: filename
    // value: blob url
    const imagesMap: { [key: string]: string } = {};

    // we look for all the images in the zip (not the manifest)
    for (const image of zip.filter((path: string) => /\.(jpg|jpeg|png)$/i.test(path))) {
      const r: Blob = await zip.file(image.name).async("blob")
      const contentType = image.name.includes("jpeg") ? "image/jpeg" : "image/png";
      const blob = r.slice(0, r.size, contentType);
      this.blobs.push(blob);

      const imageFilename = getFileNameFromPath(image.name);
      imagesMap[imageFilename] = URL.createObjectURL(blob);
    }

    // xhtml content

    // We read all contents file at the same time (Promise.All)
    const xhtmlItems = parsedContent.querySelectorAll('item[media-type="application/xhtml+xml"]:not([properties="nav"]');
    const xhtmlFiles: string[] = await Promise.all([...xhtmlItems].map((item: Element) => {
      return zip.file(this.rootpath + item.getAttribute("href")!).async("text");
    }));

    //console.log(xhtmlFiles);

    for (let i = 0; i < xhtmlFiles.length; i++) {
      // console.log(xhtmlItems[i].outerHTML, xhtmlFiles[i]);

      const xhtmlPath = this.rootpath + xhtmlItems[i].getAttribute("href")!;

      const parsedContent = parser.parseFromString(xhtmlFiles[i], "application/xml");

      const body = document.createElement("div");
      body.innerHTML = parsedContent.querySelector("body")!.innerHTML;
      body.setAttribute("id", getFileNameFromPath(xhtmlPath).slice(0, -6));
      this.textHTML.push(body);

      // Update images(svg) & img hrefs
      // It seems there is no a standard about how to declare a xhtml that contains
      // an <img> or <svg> tag. Insted of trying look for the common patterns, I
      // am just going to check if there are img in every xhtml file.

      const imageTags = body.querySelectorAll("image");
      for (let i = 0; i < imageTags.length; i++) {
        const key = getFileNameFromPath(imageTags[0].getAttribute("xlink:href")!);
        imageTags[i].setAttribute("xlink:href", imagesMap[key]);
      }

      const imgTags = body.querySelectorAll("img");
      for (let i = 0; i < imgTags.length; i++) {
        if (!(getFileNameFromPath(imgTags[i].src) in imagesMap)) {
        }
        imgTags[i].src = imagesMap[getFileNameFromPath(imgTags[i].src)];
      }

      // TODO: paginated mode
      const links = body.getElementsByTagName("a");
      if (links) {
        [...links].forEach(link => {
          link.href = "#" + link.href.split("#")[1];
          this.links.push(link);
        });

      }
    }

    console.log(`Epub loaded in ${Date.now() - starttime}ms`);
  }
}

function getFileNameFromPath(path: string): string {
  const filename = path.match(/[^/]+$/);
  if (filename) {
    return filename[0];
  }
  return path;
}
