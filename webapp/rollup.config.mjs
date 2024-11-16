import copy from 'rollup-plugin-copy'
import terser from '@rollup/plugin-terser';
import del from 'rollup-plugin-delete'
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

const files = ["collection.ts", "reader.js", "settings.ts"];
const inPath = "src/js"

export default [
  {
    input: files.map(f => `${inPath}/${f}`),
    output: {
      dir: "dist/js",
      entryFileNames: '[name].js',
      chunkFileNames: 'shared.js',
      format: 'es',
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({ tsconfig: "./tsconfig.json" }),
      terser(), // minify
      copy({
        targets: [
          { src: 'src/*.{html,js}', dest: 'dist/' },
          { src: 'src/manifest.json', dest: 'dist/' },
          { src: 'src/css/*.css', dest: 'dist/css' },
          { src: 'src/webfonts/*', dest: 'dist/webfonts' },
          { src: 'src/icons/*', dest: 'dist/icons' },
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
