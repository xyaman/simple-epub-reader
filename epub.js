class EpubBook {
  constructor() {
    this.title = "";
    this.language = "";
    this.creator = "";

    // Array of all book html+xml content already sanitized to 
    // work with images
    this.textHTML = [];

    // Array of all book html+xml content as string.
    // It might has extra/useless information (ex. <ruby> info)
    this.textString = [];
  }

  async loadFromFile(file) {
    // https://stuk.github.io/jszip/documentation/api_zipobject/async.html
    const zip = await JSZip.loadAsync(file)

    // We must first read META-INF/container.xml
    const container = await zip.file("META-INF/container.xml").async("text")
    const containerparser = new DOMParser();
    const containerContent = containerparser.parseFromString(container, "application/xml");
    const contentFileName = containerContent.getElementsByTagName("rootfile")[0].getAttribute("full-path");

    const contentsPath = contentFileName.match(/^.*\//)[0];

    // Metadata
    // https://idpf.org/epub/20/spec/OPF_2.0.1_draft.htm
    const content = await zip.file(contentFileName).async("text")
    const parser = new DOMParser();
    const parsedContent = parser.parseFromString(content, "application/xml");

    this.title = parsedContent.getElementsByTagName("dc:title")[0].innerHTML
    this.language = parsedContent.getElementsByTagName("dc:language")[0].innerHTML
    this.creator = parsedContent.getElementsByTagName("dc:creator")[0].innerHTML

    // Read Contents (Manifest)

    // A dictionary to change the original img url with the blob one
    const images = {};

    // We save all the blobs to free them after-use
    const blobs = [];

    // We load all images
    for (const image of zip.filter(path => path.includes(".jpg"))) {
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

      const body = parsedContent.getElementsByTagName("body")[0].children[0];

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
      this.textString.push(body.innerText.trim());
    }
  }
}


function getFileName(path) {
  let regex = /[^/]+$/;
  return path.match(regex)[0];
}
