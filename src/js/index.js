import extract from './extract'
import createTOC from './toc'
import { toast } from './util'

let toc = typeof smarttoc === 'object' ?
  smarttoc : undefined

if (!toc) {
  const [article, headings] = extract(document)
  if (article && headings && headings.length) {
    toc = createTOC(article, headings)
  } else {
    toast('No article or headings detected for current page')
  }
} else {
  toc.toggle()
}

export default toc
