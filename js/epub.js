//http://stackoverflow.com/questions/18679576/counting-words-in-string

class EpubBook {
  constructor() {
    this.title = "";
    this.language = "";
    this.creator = "";

    this.charactersRead = 0;

    // Array of all book html+xml content already sanitized to 
    // work with images
    this.textHTML = [];
    this.file = null;
    this.contentFile = null;
    this.contentsPath = "";

    // This files are "temporary", it should be deleted before saving into
    // the indexedDB.
    this.cache = {
      zip: null,
    };
  }

  async loadFromFile(file) {

    // Why we dont use loadEpub()? Because we dont want to save the zip to the
    // as a property. This function is only called when the book is added to the 
    // collection
    const zip = await JSZip.loadAsync(file)
    this.file = file;

    // We must first read META-INF/container.xml
    const container = await zip.file("META-INF/container.xml").async("text")
    const containerparser = new DOMParser();
    const containerContent = containerparser.parseFromString(container, "application/xml");
    const contentFileName = containerContent.getElementsByTagName("rootfile")[0].getAttribute("full-path");

    let contentsPath = "";
    if (contentFileName.match(/^.*\//)) {
      contentsPath = contentFileName.match(/^.*\//)[0];
      this.contentsPath = contentsPath;
    }

    // Metadata
    // https://idpf.org/epub/20/spec/OPF_2.0.1_draft.htm
    const content = await zip.file(contentFileName).async("text")
    this.contentFile = contentFileName;
    const parser = new DOMParser();
    const parsedContent = parser.parseFromString(content, "application/xml");

    this.title = parsedContent.getElementsByTagName("dc:title")[0].innerHTML
    this.language = parsedContent.getElementsByTagName("dc:language")[0].innerHTML
    this.creator = parsedContent.getElementsByTagName("dc:creator")[0].innerHTML
  }

  /** Loads epub from the inner file. If it's alreay loaded, it just return the
  * object property 
  * https://stuk.github.io/jszip/documentation/api_zipobject/async.html
  * */
  async loadEpub() {
    if (!this.file) return;
    this.cache.zip = this.cache.zip ? this.cache.zip : await JSZip.loadAsync(this.file);
    return this.cache.zip;
  }

  async getCoverBlob() {

    const zipEpub = await this.loadEpub();
    const content = await zipEpub.file(this.contentFile).async("text")
    const parser = new DOMParser();
    const parsedContent = parser.parseFromString(content, "application/xml");

    // We also need to load the cover image
    // TODO: improve this
    // <item href="Images/embed0018_HD.jpg" properties="cover-image" id="embed0018_HD" media-type="image/jpeg" />

    const imagesItems = parsedContent.getElementsByTagName("item");
    for (let i = 0; i < imagesItems.length; i++) {
      if (imagesItems[i].getAttribute("properties") == "cover-image") {
        const coverImagePath = this.contentsPath + imagesItems[i].getAttribute("href");
        const r = await zipEpub.file(coverImagePath).async("blob")
        let blob = r.slice(0, r.size, "image/jpeg")
        return URL.createObjectURL(blob);
      }
    }
  }

  async loadContent() {
    if (!this.file) return;

    const dateBefore = new Date();
    const zip = await this.loadEpub();
    console.log(zip);

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
    // TODO: CHECK if its an image instead of looking the extension
    for (const image of zip.filter(path => path.includes(".jpg") || path.includes(".jpeg"))) {
      const r = await zip.file(image.name).async("blob")
      let blob = r.slice(0, r.size, "image/jpeg")
      images[getFileName(image.name)] = URL.createObjectURL(blob);
      blobs.push(blob);
    }

    // We load all content
    // We need to follow the order defined in contents file 
    // Only text for now? TODO: Check it later
    const textitems = [...parsedContent.getElementsByTagName("item")]
      .filter(item => item.getAttribute("media-type") === "application/xhtml+xml")
      .map(item => contentsPath + item.getAttribute("href"));

    for (const textfile of textitems) {

      // We should ignore navigations file
      // TODO: if the textfile contains the attribute: properties="nav"
      // it should be treated as the navigation
      if (textfile.includes("navigation")) continue;

      const content = await zip.file(textfile).async("text")
      const parser = new DOMParser();
      const parsedContent = parser.parseFromString(content, "application/xml");

      const body = document.createElement("div")
      body.innerHTML = parsedContent.getElementsByTagName("body")[0].innerHTML;

      // We see if it has image, if it has, we change the link
      // TODO: If the textitem contains the attribute: properties="svg"
      // it uses <image> tag.
      // Right now we are doing unnecessary iterations
      const bodyimages = body.getElementsByTagName("image");
      if (bodyimages.length > 0) {
        let url = getFileName(bodyimages[0].getAttribute("xlink:href"));
        [...bodyimages].forEach(image => image.setAttribute("xlink:href", images[url]));
      }

      const bodyimages2 = body.getElementsByTagName("img");
      if (bodyimages2.length > 0) {
        [...bodyimages2].forEach(image => image.src = images[getFileName(image.src)]);
      }

      // We want to modify the links
      // I don't know if it works in all epubs, and probably wont work 
      // if we uses pages. It's only tested in scrolling (full mode)
      const links = body.getElementsByTagName("a");
      if (links) {
        [...links].forEach(link => link.href = "#" + link.href.split("#")[1]);
      }

      // we have the file name without the extension
      const fileWrapper = document.createElement("div");
      fileWrapper.id = getFileName(textfile).slice(0, -6);
      fileWrapper.innerHTML = body.innerHTML;

      this.textHTML.push(fileWrapper);
    }

    console.log(`Epub loaded in ${new Date() - dateBefore}ms`);
  }
}


function getFileName(path) {
  let regex = /[^/]+$/;
  if (path.match(regex)) {
    return path.match(regex)[0];
  }
  return path;
}
