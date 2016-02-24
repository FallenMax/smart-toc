import replace from 'rollup-plugin-replace'
import fs from 'fs'

let cssString = JSON.stringify(
  fs.readFileSync('src/style/toc.css', {
    encoding: 'utf8'
  })
)


export default {
  entry: 'src/js/index.js',
  format: 'iife',
  moduleName: 'smarttoc',
  dest: 'dist/toc.js',
  plugins: [
    replace({
      __CSS_STRING__: cssString,
      __DEV__: !!process.env.DEV
    })
  ]
}
