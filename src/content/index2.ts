import m from 'mithril'
import {
  detectMainWindow,
  extractArticle,
  extractHeadings,
} from './lib/extract'
import { showToast } from './lib/toast'

const mainWindow = detectMainWindow()

const TocContainer: m.FactoryComponent<{ article: HTMLElement }> = (options: {
  article
}) => {
  return {
    view() {
      return
    },
  }
}

const start = () => {
  const article = extractArticle()
  const headings = article && extractHeadings(article)
  if (!headings?.length) {
    showToast('No article/headings are detected.')
    return
  }

  let containerSettings = {}

  const tocContainer = document.createElement('smarttoc-container')
  document.body.appendChild(tocContainer)
}

if (window === mainWindow) {
  start()

  // chrome.runtime.onMessage.addListener(
  //   (request: 'toggle' | 'prev' | 'next', sender, sendResponse) => {
  //     try {
  //       if (!toc) {
  //         start()
  //       } else {
  //         toc[request]()
  //       }
  //       sendResponse(true)
  //     } catch (e) {
  //       logger.error(e)
  //       sendResponse(false)
  //     }
  //   },
  // )
}
