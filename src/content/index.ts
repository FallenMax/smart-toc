import { extractArticle, extractHeadings } from './lib/extract'
import { getContentWindow } from './lib/iframe'
import { createToc, Toc, TocPreference } from './toc'
import { isDebugging, offsetKey } from './util/env'
import { showToast } from './util/toast'

function setPreference(preference, callback) {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(offsetKey, function (result) {
      const offset = result[offsetKey];
      if (offset && offset.x && offset.y) {
        preference.offset.x = offset.x;
        preference.offset.y = offset.y;
      }
      else {
        preference.offset.x = 0;
        preference.offset.y = 0;
      }
      if (callback) {
        callback();
      }
    });
  }
  else if(callback){
    callback();
  }
}

if (window === getContentWindow()) {
  let preference: TocPreference = {
    offset: { x: 0, y: 0 },
  }

  let toc: Toc | undefined

  const start = (): void => {
    if (toc) {
      toc.dispose()
    }

    const article = extractArticle()
    const headings = article && extractHeadings(article)
    if (!(article && headings && headings.length)) {
      showToast('No article/headings are detected.')
      return
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
    (request: 'toggle' | 'prev' | 'next' | 'refresh', sender, sendResponse) => {
      try {
        if (!toc || request === 'refresh') {
          setPreference(preference, start);
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

  setPreference(preference, start);

  function domListener() {

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
    const config = {
      attributes: true, attributeOldValue: true, subtree: true,
      childList: true,
    }

    let timeoutRefresh: any = null;

    // Callback function to execute when mutations are observed
    const callback = function (mutationsList, observer) {
      clearTimeout(timeoutRefresh);
      timeoutRefresh = setTimeout(() => {
        setPreference(preference, refresh)
      }, 500);
      if (isDebugging) {
        console.log('dom changed')
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

  let articleId = ''
  let articleContentClass = ''
  function refresh() {
    const articleClass = isFeedly ? '.entryBody' : '.article_content';
    const el: HTMLElement = document.querySelector(articleClass) as HTMLElement;
    if (
      (el && (el.id !== articleId || el.className !== articleContentClass)) ||
      (!el && articleId !== '')
    ) {
      if (isDebugging) {
        console.log('refresh')
        console.log(el)
      }
      articleId = el ? el.id : ''
      articleContentClass = el ? el.className : ''
      start()
    }
  }

  const dm = document.domain
  const isInoReader =
    dm.indexOf('inoreader.com') >= 0 || dm.indexOf('innoreader.com') > 0
  const isFeedly = dm.indexOf('feedly.com') >= 0
  if (isInoReader || isFeedly) {
    domListener()
  }
}
