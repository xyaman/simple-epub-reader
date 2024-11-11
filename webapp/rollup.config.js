import copy from 'rollup-plugin-copy'
import terser from '@rollup/plugin-terser';
import del from 'rollup-plugin-delete'


// import { rollupPluginHTML as html } from '@web/rollup-plugin-html';
// import path from "path";

const files = ["collection.js", "reader.js", "settings.js"];
const inPath = "src/js"

export default [
  {
    input: files.map(f => `${inPath}/${f}`),
    output: {
      dir: "dist/js",
      entryFileNames: '[name].js',
      format: 'es'
    },
    plugins: [
      terser(), // minify
      copy({
        targets: [
          { src: 'src/*.{html,css,js}', dest: 'dist/' },
          { src: 'src/js/libs/*.js', dest: 'dist/js/libs/' },
          { src: 'src/manifest.json', dest: 'dist/' }
        ]
      }),
      del({ targets: "dist/*", runOnce: true }), // Delete items once. Useful in watch mode.
    ],
  },
  // {
  //   input: "*.html",
  //   output: { dir: "dist" },
  //   plugins: [
  //     del({ targets: "dist/*", runOnce: true }), // Delete items once. Useful in watch mode.
  //     terser(),
  //     html({ rootDir: path.join(process.cwd(), 'src'), minify: true, flattenOutput: false }),
  //   ],
  // }
];
