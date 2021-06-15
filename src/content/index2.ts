import { detectMainWindow, extract } from './lib/extract'
import { createTocPanel, TocPanel } from './lib/panel'
import { showToast } from './lib/toast'
import { createToc, Toc } from './lib/toc'
import { getOrCreateContainer } from './util/dom/get_container'
import { logger } from './util/logger'
import { noop } from './util/noop'

const mainWindow = detectMainWindow()
const main = () => {
  let toc: Toc | undefined
  let panel: TocPanel | undefined
  let destroy = noop
  const start = () => {
    const result = extract()

    if (!result?.headings.length) {
      showToast('No article/headings are detected.')
      return
    }

    toc = createToc({ article: result.article })
    panel = createTocPanel({
      dom: getOrCreateContainer('smarttoc-container'),
      toc,
    })
    return () => {
      toc?.destroy()
      panel?.destroy()
    }
  }
  chrome.runtime.onMessage.addListener(
    (request: 'toggle' | 'prev' | 'next', sender, sendResponse) => {
      try {
        if (!toc) {
          destroy = start()
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
