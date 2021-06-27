import { detectMainWindow, extractContent } from './lib/extract'
import { createTocPanel, TocPanel } from './lib/panel'
import { showToast } from './lib/toast'
import { createToc, Toc } from './lib/toc'
import { createDisposer } from './util/disposer'
import { getContainer } from './util/dom/get_container'
import { logger } from './util/logger'
import { noop } from './util/noop'

const mainWindow = detectMainWindow()

if (window === mainWindow) {
  let toc: Toc | undefined
  let panel: TocPanel | undefined

  let stop = noop
  const start = () => {
    const content = extractContent()

    if (!content) {
      showToast('No article/headings are detected.')
      return noop
    }
    const { R, dispose } = createDisposer()

    toc = createToc({ article: content.article })
    panel = createTocPanel({
      container: getContainer('smarttoc-container'),
      toc,
    })
    R(() => {
      toc = undefined
      panel = undefined
    })

    R(panel.start())
    R(
      toc.on('contentChanged', (content) => {
        if (!content) {
          showToast('No article/headings are detected.')
          stop()
        }
      }),
    )
    return dispose
  }

  chrome.runtime.onMessage.addListener(
    (request: 'toggle' | 'prev' | 'next', sender, sendResponse) => {
      try {
        switch (request) {
          case 'toggle': {
            if (toc) {
              stop()
            } else {
              stop = start()
            }
            break
          }
          case 'prev':
          case 'next': {
            if (!toc) {
              stop = start()
            } else {
              if (request === 'next') {
                toc.goToNextHeading()
              } else if (request === 'prev') {
                toc.goToPreviousHeading()
              } else {
                console.warn('unknown request', request)
              }
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

  stop = start()
}
