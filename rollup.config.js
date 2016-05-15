import replace from 'rollup-plugin-replace'
import fs from 'fs'

let cssToc = JSON.stringify(
  fs.readFileSync('src/style/toc.css', {
    encoding: 'utf8'
  })
)

let cssToast = JSON.stringify(
  fs.readFileSync('src/style/toast.css', {
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
      __CSS_TOC__: cssToc,
      __CSS_TOAST__: cssToast,
      __DEV__: !!process.env.DEV
    })
  ]
}
