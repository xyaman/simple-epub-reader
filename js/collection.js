import{d as e,E as t}from"./db-DjHxQTg8.js";import"./settings.js";class o{constructor(e,t){this.books=[],this.elem=e,this.modalElem=t,this.loadBooks().then((()=>console.log("collection loaded")))}async loadBooks(){this.books=[];const o=await e.getAllBooks();console.log(o);for(const e of o){const o=await t.newFromExistingObject(e.key,e.value);this.books.push(o)}console.log("All books have been loaded"),await this.render(),console.log("collection loaded")}async addBookFromFile(o){const s=await t.newFromFile(o),d=await e.addBook(s);s.id=d,console.log("book added succesfully"),await s.loadContent(),this.books.push(s),await this.render()}async render(){this.elem.innerHTML="";const t=document.createElement("div");t.classList.add("columns","is-multiline","is-mobile");for(let o=0;o<this.books.length;o++){const s=document.createElement("div");s.classList.add("column","is-half-mobile","is-one-third-tablet","is-one-quarter-desktop","is-one-fifth-fullhd");const d=document.createElement("div");d.setAttribute("id","card-container"),s.appendChild(d);const n=document.createElement("a");d.appendChild(n),n.classList.add("card"),n.href="/simple-epub-reader/reader.html?id="+this.books[o].id;const a=document.createElement("div");n.appendChild(a),a.classList.add("card-image");const i=document.createElement("figure");a.appendChild(i),i.classList.add("image","is-3by4");const l=document.createElement("img");i.appendChild(l),l.style.objectFit="cover",l.src=await this.books[o].getCoverBlob();const c=document.createElement("a");c.classList.add("tag","is-delete"),c.setAttribute("id","delete-button"),d.appendChild(c);const r=document.createElement("progress");r.classList.add("progress","is-radiusless"),r.setAttribute("value",this.books[o].lastReadIndex||0),r.setAttribute("max",this.books[o].totalIndex||1),d.appendChild(r),c.onclick=async()=>{await e.removeBook(this.books[o].id),this.books.splice(o,1),await this.render()},t.appendChild(s)}this.elem.appendChild(t)}showModal(e){this.modalElem.innerHTML="",this.modalElem.classList.add("modal","is-active","is-clipped");const t=document.createElement("div");t.classList.add("modal-background"),this.modalElem.appendChild(t),t.onclick=this.hideModal.bind(this);const o=document.createElement("div");o.classList.add("modal-content"),this.modalElem.appendChild(o);const s=document.createElement("div");s.classList.add("content","box"),o.appendChild(s);const d=document.createElement("p");s.appendChild(d),d.innerHTML=e;const n=document.createElement("button");n.classList.add("modal-close","is-large"),this.modalElem.appendChild(n),n.onclick=this.hideModal.bind(this)}hideModal(){this.modalElem.innerHTML="",this.modalElem.setAttribute("class","")}async syncWithServer(){this.showModal("Starting sync");try{const t=await e.syncWithServer();t.downloaded.length+t.uploaded.length>0?(this.showModal(`<strong>Succesfully synced</strong><br> ↑ ${t.uploaded.length} book(s) uploaded<br> ↓ ${t.downloaded.length} book(s) downloaded`),await this.loadBooks(),await this.render()):this.showModal("<strong>Succesfully synced</strong><br> No changes")}catch(e){this.showModal(`An error has ocurred: ${e}`)}}}let s;document.addEventListener("DOMContentLoaded",(()=>{s=new o(document.getElementById("books-container"),document.getElementById("modal"))})),document.getElementById("file-input").addEventListener("change",(async function(e){e.target.files[0]&&(console.log("EPUB file: "+e.target.files[0].name),s.addBookFromFile(e.target.files[0]))})),document.getElementById("sync").addEventListener("click",(async function(e){await s.syncWithServer()}));
