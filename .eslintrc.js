module.exports = {
  'env': {
    'browser': true,
    'commonjs': true,
    'es6': true,
    'node': true
  },
  'extends': 'eslint:recommended',
  'parserOptions': {
    'sourceType': 'module'
  },
  'rules': {
    'linebreak-style': [2, 'unix'],
    'quotes': [1, 'single'],
    'no-console': [0],
    'no-unused-vars': [1],
    'semi': [1, 'never']
  },
  globals: {
    chrome: false,
    smarttoc: false,
    __CSS_TOC__: false,
    __CSS_TOAST__: false,
    __DEV__: false
  }
}
