import extract from './extract'
import createTOC from './toc'
import { toast, highlight } from './util'

let toc = null
const [article, headings] = extract(document)
const start = function() {
  if (article && headings && headings.length) {
    return createTOC(article, headings)
  } else {
    if (article) {
      highlight(article)
      toast('No headings are found in this article')
    } else {
      toast('No article is detected')
    }
    return null
  }
}

toc = start()

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    try {
      if (toc) {
        toc[request]()
      } else {
        toc = start()
      }
      sendResponse(true)
    } catch (e) {
      console.error(e)
      sendResponse(false)
    }
  }
)
