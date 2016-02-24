import extract from './extract'
import createTOC from './toc'

let toc = typeof smarttoc === 'object' ?
  smarttoc : undefined

if (!toc) {
  const [article, headings] = extract(document)
  if (article && headings && headings.length) {
    toc = createTOC(article, headings)
  } else {
    console.log('[smart-toc] no article detected')
  }
} else {
  toc.toggle()
}

export default toc
