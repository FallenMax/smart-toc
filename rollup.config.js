import replace from 'rollup-plugin-replace'
import { string } from 'rollup-plugin-string'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import ts from 'rollup-plugin-typescript2'

export default {
  input: 'src/content/index.ts',
  output: {
    format: 'iife',
    file: 'dist/toc.js',
    name: 'smarttoc',
  },
  plugins: [
    ts(),
    nodeResolve({ main: true, browser: true }),
    commonjs(),
    string({ include: '**/*.css' }),
    replace({ __DEV__: Boolean(process.env.DEV) }),
  ],
}
