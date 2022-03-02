import { extractArticle, extractHeadings } from './lib/extract'
import { getContentWindow } from './lib/iframe'
import { createToc, Toc, TocPreference } from './toc'
import { showToast } from './util/toast'

if (window === getContentWindow()) {
  let preference: TocPreference = {
    offset: { x: 0, y: 0 },
  }
  let toc: Toc | undefined

  const start = (): void => {
    const article = extractArticle()
    const headings = article && extractHeadings(article)
    if (!(article && headings && headings.length)) {
      showToast('No article/headings are detected.')
      return
    }
    if (toc) {
      toc.dispose()
    }
    toc = createToc({
      article,
      preference,
    })
    toc.on('error', (error) => {
      if (toc) {
        toc.dispose()
        toc = undefined
      }
      // re-extract && restart
      start()
    })
    toc.show()
  }

  chrome.runtime.onMessage.addListener(
    (request: 'toggle' | 'prev' | 'next', sender, sendResponse) => {
      try {
        if (!toc) {
          start()
        } else {
          toc[request]()
        }
        sendResponse(true)
      } catch (e) {
        console.error(e)
        sendResponse(false)
      }
    },
  )

  start()

  function domListener() {
    let articleId = ''

    var MutationObserver =
      window.MutationObserver || window.WebKitMutationObserver

    if (typeof MutationObserver !== 'function') {
      console.error(
        'DOM Listener Extension: MutationObserver is not available in your browser.',
      )
      return
    }

    // Select the node that will be observed for mutations
    const targetNode = document

    // Options for the observer (which mutations to observe)
    const config = { attributes: true,attributeOldValue: true,subtree: true,
      childList: true, }

    // Callback function to execute when mutations are observed
    const callback = function (mutationsList, observer) {
      // Use traditional 'for loops' for IE 11
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes') {
          const el: HTMLElement = mutation.target as HTMLElement
          if (
            el.className.indexOf(' article_expanded') > 0 &&
            el.id !== articleId
          ) {
            console.log(el)
            articleId = el.id
            start()
          }
        }
      }
    }

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback)

    observer.disconnect()

    // Start observing the target node for configured mutations
    observer.observe(targetNode, config)

    // Later, you can stop observing
    // observer.disconnect()
  }

  const dm = document.domain
  const isInoReader =
    dm.indexOf('inoreader.com') >= 0 || dm.indexOf('innoreader.com') > 0
  const isFeedly = dm.indexOf('feedly.com') > 0
  if (isInoReader || isFeedly) {
    domListener()
  }
}
