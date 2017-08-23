import { isMasterFrame } from './helpers/iframe'
import createTOC from './toc'
import extract from './helpers/extract'
import { toast } from './helpers/util'

if (isMasterFrame(window)) {
  let toc

  const generate = function(option = {}) {
    let [article, $headings] = extract()
    if (article && $headings) {
      return createTOC(Object.assign({ article, $headings }, option))
    } else {
      toast('No article/headings are detected.')
      return null
    }
  }

  toc = generate()

  setInterval(() => {
    if (toc && !toc.isValid()) {
      let lastState = toc.dispose()
      toc = generate(lastState)
    }
  }, 3000)

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    try {
      if (toc) {
        toc[request]()
      } else {
        toc = generate()
      }
    } catch (e) {
      console.error(e)
    }
    sendResponse(true)
  })
}
