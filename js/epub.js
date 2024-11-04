export class EpubBook {

  /** @type {number} */
  id = -1;

  /** @type {string} */
  title;

  /** @type {string} */
  language;

  /** @type {string} */
  creator;

  /** @type {number} */
  lastReadIndex = 0;

  /** We must use this in order to get the current percentage
   * This should be initialized when it's first open by the reader
   * @type {number} 
   */
  totalIndex = 0;

  /** @type {File} */
  file;

  /** Array of all book html+xml content already sanitized to 
   * work with images
   * @type {HTMLElement[]} */
  textHTML = [];

  /** @type {string} */
  contentFileName;

  /** @type {string} */
  contentsPath;

  /** Zip File (jszip library) https://github.com/Stuk/jszip */
  #zip;

  static async newFromExistingObject(id, object) {
    const book = new EpubBook();

    book.id = id;
    book.title = object.title;
    book.language = object.language;
    book.creator = object.creator;
    book.lastReadIndex = object.lastReadIndex | 0;
    book.totalIndex = object.totalIndex | 0;
    book.file = object.file;

    await book.loadFromFile();

    return book;
  }

  static async newFromFile(file) {
    const book = new EpubBook();
    book.file = file;
    await book.loadFromFile();

    return book;
  }

  /** This getter returns a object ready to be saved into indexedDB 
   * Note: this object MUST be used when saving in the db.
   * */
  get object() {
    return {
      title: this.title,
      language: this.language,
      creator: this.creator,
      lastReadIndex: this.lastReadIndex || 0,
      totalIndex: this.totalIndex || 0,
      file: this.file,
    };
  }

  async loadFromFile() {
    const zip = await this.getZip();

    // We must first read META-INF/container.xml
    const container = await zip.file("META-INF/container.xml").async("text")
    const containerparser = new DOMParser();
    const containerContent = containerparser.parseFromString(container, "application/xml");
    const contentFileName = containerContent.getElementsByTagName("rootfile")[0].getAttribute("full-path");

    let contentsPath = "";
    if (contentFileName.match(/^.*\//)) {
      contentsPath = contentFileName.match(/^.*\//)[0];
    }
    this.contentsPath = contentsPath;

    // Metadata
    // https://idpf.org/epub/20/spec/OPF_2.0.1_draft.htm
    const content = await zip.file(contentFileName).async("text")
    this.contentFileName = contentFileName;
    const parser = new DOMParser();
    const parsedContent = parser.parseFromString(content, "application/xml");

    this.title = parsedContent.getElementsByTagName("dc:title")[0].innerHTML
    this.language = parsedContent.getElementsByTagName("dc:language")[0].innerHTML
    this.creator = parsedContent.getElementsByTagName("dc:creator")[0].innerHTML
  }

  /** Loads epub from the inner file. If it's alreay loaded, it just return the
   * object property 
   * https://stuk.github.io/jszip/documentation/api_zipobject/async.html
   */
  async getZip() {
    if (!this.file) return;
    this.#zip = this.#zip || await JSZip.loadAsync(this.file);
    return this.#zip;
  }

  /** @returns {string} returns cover image url */
  async getCoverBlob() {

    const zipEpub = await this.getZip();
    const content = await zipEpub.file(this.contentFileName).async("text")
    const parser = new DOMParser();
    const parsedContent = parser.parseFromString(content, "application/xml");

    // Usually the epub cover has properties="cover-image"
    const coverImage = parsedContent.querySelector('item[properties="cover-image"]') || parsedContent.querySelector('item[media-type="image/jpeg"]');
    if (coverImage) {
      const coverImagePath = this.contentsPath + coverImage.getAttribute("href");
      const r = await zipEpub.file(coverImagePath).async("blob")
      let blob = r.slice(0, r.size, "image/jpeg")
      return URL.createObjectURL(blob);
    }

    // TODO: Have a fallback static img
  }

  // TODO: save blobs to remove?
  async loadContent() {
    if (!this.file) return;

    const dateBefore = new Date();
    const zip = await this.getZip();

    // We must first read META-INF/container.xml
    const container = await zip.file("META-INF/container.xml").async("text")
    const containerparser = new DOMParser();
    const containerContent = containerparser.parseFromString(container, "application/xml");
    const contentFileName = containerContent.getElementsByTagName("rootfile")[0].getAttribute("full-path");

    let contentsPath = "";
    if (contentFileName.match(/^.*\//)) {
      contentsPath = contentFileName.match(/^.*\//)[0];
    }

    const content = await zip.file(contentFileName).async("text")
    const parser = new DOMParser();
    const parsedContent = parser.parseFromString(content, "application/xml");

    // Read Contents (Manifest)

    // TODO: ONLY make blobs if the book is going to be readed
    // A dictionary to change the original img url with the blob one
    const images = {};

    // We save all the blobs to free them after-use
    const blobs = [];

    // We load all images
    // TODO: use a querySelector ??
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

    for (const image of zip.filter(path => path.includes("image"))) {
      const r = await zip.file(image.name).async("blob")
      // TODO: This is also treating image/png as image/jpeg
      // ex.
      // <item href="image/i-zzzc_04.jpg" id="i-zzzc_04" media-type="image/jpeg" />
      // <item href="image/i-zzzc_05.jpg" id="i-zzzc_05" media-type="image/jpeg" />
      // <item href="image/cid-13803.png" id="cid-13803" media-type="image/png" />

      let blob = r.slice(0, r.size, "image/jpeg")
      images[getFileNameFromPath(image.name)] = URL.createObjectURL(blob);
      blobs.push(blob);
    }

    // We load all content
    // We need to follow the order defined in contents file 
    // Only text for now? TODO: Check it later
    const xhtmlItems = parsedContent.querySelectorAll('item[media-type="application/xhtml+xml"]');
    for (let i = 0; i < xhtmlItems.length; i++) {

      const xhtmlPath = contentsPath + xhtmlItems[i].getAttribute("href");

      // We should ignore navigations file
      // TODO: if the textfile contains the attribute: properties="nav"
      // it should be treated as the navigation
      if (xhtmlPath.includes("navigation")) continue;

      const content = await zip.file(xhtmlPath).async("text")
      const parser = new DOMParser();
      const parsedContent = parser.parseFromString(content, "application/xml");

      const body = document.createElement("div")
      body.innerHTML = parsedContent.querySelector("body").innerHTML;
      body.setAttribute("id", getFileNameFromPath(xhtmlPath).slice(0, -6));

      // Update images(svg) & img hrefs
      // It seems there is no a standard about how to declare a xhtml that contains
      // an <img> or <svg> tag. Insted of trying look for the common patterns, I
      // am just going to check if there are img in every xhtml file

      const imageTags = body.querySelectorAll("image");
      for (let i = 0; i < imageTags.length; i++) {
        const key = getFileNameFromPath(imageTags[0].getAttribute("xlink:href"));
        imageTags[i].setAttribute("xlink:href", images[key]);
      }

      const imgTags = body.querySelectorAll("img");
      for (let i = 0; i < imgTags.length; i++) {
        console.log(imgTags[i].src, images);
        if (!(getFileNameFromPath(imgTags[i].src) in images)) {
        }
        imgTags[i].src = images[getFileNameFromPath(imgTags[i].src)];
      }

      // We want to modify the links
      // I don't know if it works in all epubs, and probably wont work 
      // TODO: Paginated mode
      const links = body.getElementsByTagName("a");
      if (links) {
        [...links].forEach(link => link.href = "#" + link.href.split("#")[1]);
      }

      // we have the file name without the extension

      this.textHTML.push(body);
    }

    console.log(`Epub loaded in ${new Date() - dateBefore}ms`);
  }
}

/** @returns {string} */
function getFileNameFromPath(path) {
  let regex = /[^/]+$/;
  if (path.match(regex)) {
    return path.match(regex)[0];
  }
  return path;
}
