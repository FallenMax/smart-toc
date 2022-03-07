import { extractArticle, extractHeadings } from './lib/extract'
import { getContentWindow } from './lib/iframe'
import { createToc, Toc, TocPreference } from './toc'
import { isDebugging, offsetKey } from './util/env'
import { showToast } from './util/toast'

function setPreference(preference, callback) {
  if (chrome.storage && chrome.storage.local) {
    const defaultOptions= {
      isRememberPos: true
    }
    defaultOptions[offsetKey] = {x:0,y:0};
    chrome.storage.local.get(defaultOptions, function (result) {
      const offset = result[offsetKey];
      if (result.isRememberPos) {
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
  let isLoad = false;

  let toc: Toc | undefined

  const start = (): void => {
    if (toc) {
      toc.dispose()
    }

    const article = extractArticle()
    const headings = article && extractHeadings(article)
    if (!(article && headings && headings.length)) {
      chrome.storage.local.get({
        isShowTip: true
      }, function (items) {
        if(items.isShowTip){
          showToast('No article/headings are detected.')
        }
      });
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
      // start()
    })
    toc.show()
  }

  chrome.runtime.onMessage.addListener(
    (request: 'toggle' | 'prev' | 'next' | 'refresh', sender, sendResponse) => {
      try {
        if (!toc || !isLoad || request === 'refresh') {
          load();
        } else {
          toc[request]()
          if(isLoad && request === 'toggle'){
            unload()
          }
        }
        sendResponse(true)
      } catch (e) {
        console.error(e)
        sendResponse(false)
      }
    },
  )

  let observer:any = null;
  let timeoutTrack: any = null;

  function domListener() {
    var MutationObserver =
      window.MutationObserver || window.WebKitMutationObserver
    if (typeof MutationObserver !== 'function') {
      console.error(
        'DOM Listener Extension: MutationObserver is not available in your browser.',
      )
      return
    }

    let domChangeCount = 0;
    const callback = function (mutationsList, observer) {
      clearInterval(timeoutTrack);
      domChangeCount++;
      let intervalCount=0;
      timeoutTrack = setInterval(() => {
        intervalCount++;
        if(intervalCount=7){ // 最多检测两秒
          clearInterval(timeoutTrack)
        }
        if(isDebugging){
          console.log({domChangeCount});
        }
        domChangeCount = 0;
        setPreference(preference, trackArticle)
      }, 300);
    }

    if(observer === null){
      observer = new MutationObserver(callback)
    }
    else {
      observer.disconnect()
    }

     // Options for the observer (which mutations to observe)
     const config = {
      attributes: true, attributeOldValue: true, subtree: true,
      childList: true,
    }
    // Start observing the target node for configured mutations
    observer.observe(document, config)

    // Later, you can stop observing
    // observer.disconnect()
  }

  let articleId = ''
  let articleContentClass = ''
  function trackArticle() {
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
      clearInterval(timeoutTrack)
    }
  }

  const dm = document.domain
  const isInoReader =
    dm.indexOf('inoreader.com') >= 0 || dm.indexOf('innoreader.com') > 0
  const isFeedly = dm.indexOf('feedly.com') >= 0

  // auto load
  chrome.storage.local.get({
    autoType: '0'
  }, function(items) {
    if(items.autoType!=='0'){ // not disabled
      let isAutoLoad = items.autoType === '1'; // all page
      if (items.autoType === '2') { // rss web app
        const dm = document.domain
        const isInoReader =
          dm.indexOf('inoreader.com') >= 0 || dm.indexOf('innoreader.com') > 0
        const isFeedly = dm.indexOf('feedly.com') >= 0
        isAutoLoad = isInoReader || isFeedly;
      }
  
      if(isAutoLoad){
        load();
      }
    }
  });

  function load(){
    isLoad = true
    setPreference(preference, start);
    if (isInoReader || isFeedly) {
      domListener()
    }
  }

  chrome.action.setIcon({
      path:"icon_gray.png"
    }
  )

  function unload(){
    isLoad = false
    if(observer !== null){
      observer.disconnect()
      observer = null
    }
  }
  
}
