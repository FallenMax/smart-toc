import {
  detectMainWindow,
  extractArticle,
  extractHeadings
} from './lib/extract'
import { showToast } from './lib/toast'
import { createToc, Toc, TocPreference } from './toc.old'
import { logger } from './util/logger'

const mainWindow = detectMainWindow()

if (window === mainWindow) {
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
        logger.error(e)
        sendResponse(false)
      }
    },
  )

  start()
}
