import extract from './extract'
import createTOC from './toc'
import { toast, highlight } from './util'

const [article, headings] = extract(document)
let toc = {}

if (article && headings && headings.length) {
  toc = createTOC(article, headings)
} else {
  if (article) {
    highlight(article)
    toast('No headings are found in this article')
  } else {
    toast('No article is detected')
  }
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    try {
      if (toc[request]) {
        toc[request]()
      }
      sendResponse(true)
    } catch (e) {
      console.error(e)
      sendResponse(false)
    }
  }
)
