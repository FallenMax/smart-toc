import { detectMainWindow, extractContent } from './lib/extract'
import { createTocPanel, TocPanel } from './lib/panel'
import { showToast } from './lib/toast'
import { createToc, Toc } from './lib/toc'
import { getContainer } from './util/dom/get_container'
import { logger } from './util/logger'
import { noop } from './util/noop'

const mainWindow = detectMainWindow()
const main = () => {
  let toc: Toc | undefined
  let panel: TocPanel | undefined

  const isRunning = () => toc != null

  let stop = noop
  const start = () => {
    const content = extractContent()

    if (!content) {
      showToast('No article/headings are detected.')
      return
    }

    toc = createToc({ article: content.article })
    panel = createTocPanel({
      toc,
    })
    panel.render(getContainer('smarttoc-container'))

    stop = () => {
      toc?.destroy()
      panel?.destroy()
    }

    toc.on('contentChanged', (content) => {
      if (!content) {
        showToast('No article/headings are detected.')
        stop()
      }
    })
  }

  start()

  chrome.runtime.onMessage.addListener(
    (request: 'toggle' | 'prev' | 'next', sender, sendResponse) => {
      try {
        switch (request) {
          case 'toggle': {
            if (isRunning()) {
              stop()
            } else {
              start()
            }
            break
          }
          case 'prev':
          case 'next': {
            if (!isRunning()) {
              start()
            } else {
              if (request === 'next') {
                toc!.goToNextHeading()
              }
              if (request === 'prev') {
                toc!.goToPreviousHeading()
              }
              console.warn('unknown request', request)
            }
            break
          }

          default:
            console.warn('unknown request', request)
            break
        }

        sendResponse(true)
      } catch (e) {
        logger.error(e)
        sendResponse(false)
      }
    },
  )
}

if (window === mainWindow) {
  main()
}
