import extract from './extract'
import createTOC from './toc'
import { toast } from './util'

let instance = typeof smarttoc === 'object' ?
  smarttoc : { toast }


if (!instance.toc) {
  const [article, headings] = extract(document)
  if (article && headings && headings.length) {
    instance.toc = createTOC(article, headings)
    listenToCommand(instance.toc)
  } else {
    instance.toast('No article or headings are detected')
  }
} else {
  instance.toc.toggle()
}

function listenToCommand(toc) {
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      switch (request) {
        case 'next':
          toc.next()
          sendResponse(true)
          break
        case 'prev':
          toc.prev()
          sendResponse(true)
          break
        default:
          sendResponse(false)
      }
    })
}

export default instance
