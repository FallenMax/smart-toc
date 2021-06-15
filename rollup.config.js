import commonjs from 'rollup-plugin-commonjs'
import esbuild from 'rollup-plugin-esbuild'
import nodeResolve from 'rollup-plugin-node-resolve'
import { string } from 'rollup-plugin-string'

export default {
  input: 'src/content/index.ts',
  output: {
    format: 'iife',
    file: 'dist/toc.js',
    name: 'smarttoc',
  },
  plugins: [
    esbuild(),
    nodeResolve({ main: true, browser: true }),
    commonjs(),
    string({ include: '**/*.css' }),
  ],
}
