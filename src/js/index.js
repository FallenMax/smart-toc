import extract from './extract'
import createTOC from './toc'
import { toast } from './util'

let instance = typeof smarttoc === 'object' ?
  smarttoc : { toast }


if (!instance.toc) {
  const [article, headings] = extract(document)
  if (article && headings && headings.length) {
    instance.toc = createTOC(article, headings)
  } else {
    instance.toast('No article or headings are detected')
  }
} else {
  instance.toc.toggle()
}

export default instance
