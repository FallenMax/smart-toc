import { isMasterFrame } from './helpers/iframe'
import createTOC from './toc'
import extract from './helpers/extract'
import { toast } from './helpers/util'

if (isMasterFrame(window)) {

  let article, headings, toc

  const hasChanged = () => (toc &&
    toc.isShow() &&
    !(document.body.contains(article) && article.contains(headings[0].node))
  )

  const start = function(option = {}) {
    [article, headings] = extract()
    if (article && headings && headings.length) {
      toc = createTOC(Object.assign({ article, headings }, option))
    } else {
      toast('No article/headings are detected.')
    }
  }

  start()
  setInterval(() => {
    if (hasChanged()) {
      let state = toc.dispose()
      toc = null
      start(state)
    }
  }, 3000)
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      try {
        if (toc) {
          toc[request]()
        } else {
          start()
        }
      } catch (e) {
        console.error(e)
      }
      sendResponse(true)
    }
  )
}
