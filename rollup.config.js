import replace from 'rollup-plugin-replace'
import string from 'rollup-plugin-string'

export default {
  entry: 'src/js/index.js',
  format: 'iife',
  moduleName: 'smarttoc',
  dest: 'dist/toc.js',
  plugins: [
    string({ include: '**/*.css' }),
    replace({ __DEV__: !!process.env.DEV })
  ]
}
