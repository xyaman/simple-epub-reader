```
mimetype
META-INF/
  container.xml
OEBPS/
  content.opf
  chapter1.xhtml
  ch1-pic.png
  css/
    style.css
    myfont.otf
```

`META-INF/container.xml` define donde esta el contenido del libro. El cual
es un archivo OPF. A continuacion un ejemplo.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">    
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
```

De contents.opf tiene una estructura como esta:

- metadata: informacion del libro
- manifest: contenido del libro (imagenes, texto, etc)

```xml
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
  <dc:title id="title">七聖剣と魔剣の姫　【電子特典付き】</dc:title>
  <meta refines="#title" property="file-as">シチセイケントマケンノヒメ001シチセイケントマケンノヒメ</meta>
  <dc:language>ja</dc:language>
  <dc:identifier id="ASIN">B09NHRSTQF</dc:identifier>
  <meta property="dcterms:modified">2024-10-19T10:54:05Z</meta>
  <dc:creator id="creator0">御子柴奈々</dc:creator>
  <meta refines="#creator0" property="file-as">ミコシバナナ</meta>
  <dc:publisher id="publisher">講談社</dc:publisher>
  <meta refines="#publisher" property="file-as">コウダンシャ</meta>
  <dc:date>2022-01-05</dc:date>
  <meta name="primary-writing-mode" content="vertical-rl" />
  <dc:contributor id="tool">UnpackKindleS ver.20220126</dc:contributor>
  <meta refines="#tool" property="role" scheme="marc:relators">bkp</meta>
</metadata>
```

Toda la informacion del libro. El texto esta ordenado, el resto no (creo).

Lo que nos importa aca es la informacion del texto. Guardaremos solo lo que esta dentro
de <body> de cada elemento.

Es necesario que hagamos un mapping a todas las imagenes y cambiemos la url a un blob
interno.
```xml
<manifest>
<item href="Text/p-0001.xhtml" id="p-0001" media-type="application/xhtml+xml" properties="svg" />
<item href="Text/p-0002.xhtml" id="p-0002" media-type="application/xhtml+xml" />
<item href="Text/p-0003.xhtml" id="p-0003" media-type="application/xhtml+xml" />
<item href="Text/p-0004.xhtml" id="p-0004" media-type="application/xhtml+xml" />
<item href="Text/p-0005.xhtml" id="p-0005" media-type="application/xhtml+xml" />
<item href="Text/p-0006.xhtml" id="p-0006" media-type="application/xhtml+xml" />
<item href="Text/p-0007.xhtml" id="p-0007" media-type="application/xhtml+xml" />
<item href="Text/p-0008.xhtml" id="p-0008" media-type="application/xhtml+xml" />
<item href="Text/p-0009.xhtml" id="p-0009" media-type="application/xhtml+xml" />
<item href="Text/p-0010.xhtml" id="p-0010" media-type="application/xhtml+xml" />
<item href="Text/p-0011.xhtml" id="p-0011" media-type="application/xhtml+xml" />
<item href="Text/p-0012.xhtml" id="p-0012" media-type="application/xhtml+xml" />
<item href="Text/p-0013.xhtml" id="p-0013" media-type="application/xhtml+xml" />
<item href="Text/p-0014.xhtml" id="p-0014" media-type="application/xhtml+xml" />
<item href="Text/p-0015.xhtml" id="p-0015" media-type="application/xhtml+xml" />
<item href="Text/p-0016.xhtml" id="p-0016" media-type="application/xhtml+xml" />
<item href="Text/p-0017.xhtml" id="p-0017" media-type="application/xhtml+xml" />
<item href="Text/p-0018.xhtml" id="p-0018" media-type="application/xhtml+xml" />
<item href="Text/p-0019.xhtml" id="p-0019" media-type="application/xhtml+xml" />
<item href="Text/p-0020.xhtml" id="p-0020" media-type="application/xhtml+xml" />
<item href="Text/p-0021.xhtml" id="p-0021" media-type="application/xhtml+xml" />
<item href="Text/p-0022.xhtml" id="p-0022" media-type="application/xhtml+xml" />
<item href="Text/p-0023.xhtml" id="p-0023" media-type="application/xhtml+xml" />
<item href="Text/p-0024.xhtml" id="p-0024" media-type="application/xhtml+xml" />
<item href="Text/p-0025.xhtml" id="p-0025" media-type="application/xhtml+xml" />
<item href="Text/p-0026.xhtml" id="p-0026" media-type="application/xhtml+xml" />
<item href="Text/p-0027.xhtml" id="p-0027" media-type="application/xhtml+xml" />
<item href="Text/p-0028.xhtml" id="p-0028" media-type="application/xhtml+xml" />
<item href="Text/p-0029.xhtml" id="p-0029" media-type="application/xhtml+xml" />
<item href="Text/p-0030.xhtml" id="p-0030" media-type="application/xhtml+xml" />
<item href="Text/p-0031.xhtml" id="p-0031" media-type="application/xhtml+xml" />
<item href="Text/p-0032.xhtml" id="p-0032" media-type="application/xhtml+xml" />
<item href="Text/p-0033.xhtml" id="p-0033" media-type="application/xhtml+xml" />
<item href="Text/p-0034.xhtml" id="p-0034" media-type="application/xhtml+xml" />
<item href="Text/p-0035.xhtml" id="p-0035" media-type="application/xhtml+xml" />
<item href="Text/p-0036.xhtml" id="p-0036" media-type="application/xhtml+xml" />
<item href="Text/p-0037.xhtml" id="p-0037" media-type="application/xhtml+xml" />
<item href="Text/p-0038.xhtml" id="p-0038" media-type="application/xhtml+xml" />
<item href="Text/p-0039.xhtml" id="p-0039" media-type="application/xhtml+xml" />
<item href="Text/p-0040.xhtml" id="p-0040" media-type="application/xhtml+xml" />
<item href="Text/p-0041.xhtml" id="p-0041" media-type="application/xhtml+xml" />
<item href="Text/p-0042.xhtml" id="p-0042" media-type="application/xhtml+xml" />
<item href="Text/p-0043.xhtml" id="p-0043" media-type="application/xhtml+xml" />
<item href="Images/embed0000_HD.jpg" id="embed0000_HD" media-type="image/jpeg" />
<item href="Images/embed0001_HD.jpg" id="embed0001_HD" media-type="image/jpeg" />
<item href="Images/embed0002_HD.jpg" id="embed0002_HD" media-type="image/jpeg" />
<item href="Images/embed0003_HD.jpg" id="embed0003_HD" media-type="image/jpeg" />
<item href="Images/embed0004_HD.jpg" id="embed0004_HD" media-type="image/jpeg" />
<item href="Images/embed0005_HD.jpg" id="embed0005_HD" media-type="image/jpeg" />
<item href="Images/embed0006_HD.jpg" id="embed0006_HD" media-type="image/jpeg" />
<item href="Images/embed0007_HD.jpg" id="embed0007_HD" media-type="image/jpeg" />
<item href="Images/embed0008_HD.jpg" id="embed0008_HD" media-type="image/jpeg" />
<item href="Images/embed0009_HD.jpg" id="embed0009_HD" media-type="image/jpeg" />
<item href="Images/embed0010_HD.jpg" id="embed0010_HD" media-type="image/jpeg" />
<item href="Images/embed0011_HD.jpg" id="embed0011_HD" media-type="image/jpeg" />
<item href="Images/embed0012_HD.jpg" id="embed0012_HD" media-type="image/jpeg" />
<item href="Images/embed0013_HD.jpg" id="embed0013_HD" media-type="image/jpeg" />
<item href="Images/embed0014_HD.jpg" id="embed0014_HD" media-type="image/jpeg" />
<item href="Images/embed0015_HD.jpg" id="embed0015_HD" media-type="image/jpeg" />
<item href="Images/embed0016_HD.jpg" id="embed0016_HD" media-type="image/jpeg" />
<item href="Images/embed0017_HD.jpg" id="embed0017_HD" media-type="image/jpeg" />
<item href="Images/embed0018_HD.jpg" properties="cover-image" id="embed0018_HD" media-type="image/jpeg" />
<item href="Styles/flow0001.css" id="flow0001" media-type="text/css" />
<item href="Styles/flow0002.css" id="flow0002" media-type="text/css" />
<item href="Styles/flow0003.css" id="flow0003" media-type="text/css" />
<item href="Styles/flow0004.css" id="flow0004" media-type="text/css" />
<item href="Styles/flow0005.css" id="flow0005" media-type="text/css" />
<item href="toc.ncx" id="ncxuks" media-type="application/x-dtbncx+xml" />
<item href="nav.xhtml" id="navuks" media-type="application/xhtml+xml" properties="nav" />
</manifest>
```
