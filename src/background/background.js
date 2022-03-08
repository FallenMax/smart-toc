const getCurrentTab = (cb) => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
    cb(activeTab)
  })
}

const execOnCurrentTab = (command) => {
  getCurrentTab((tab) => {
    if (tab && tab.url.indexOf("chrome") !== 0) {
      chrome.tabs.sendMessage(tab.id, command, {}, (response) => {
        if (!chrome.runtime.lastError) {
          // console.log({response})
          // content_script 正常加载
       } else {
         if (command === 'toggle' && response === undefined) {
          chrome.scripting.executeScript({
            target: {tabId: tab.id, allFrames: true},
            files: ['toc.js']
          },()=>{
            chrome.tabs.sendMessage(tab.id, command, {}, (response) => { }) // load then send again
          })
        }
       }
      })
    }
  })
}

chrome.action.onClicked.addListener(() => execOnCurrentTab('toggle'))
chrome.commands.onCommand.addListener((command) => execOnCurrentTab(command))

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: "position_menu",
    title: "Reset TOC Position",
    type: 'normal',
    contexts: ["all"],
  });
  let url = chrome.runtime.getURL("options.html");
  await chrome.tabs.create({ url });
});

chrome.contextMenus.onClicked.addListener(function (item, tab) {
  if (item.menuItemId === 'position_menu') {
    if (chrome.storage) {
      chrome.storage.local.set({ "smarttoc_offset": { x: 0, y: 0 } });
      execOnCurrentTab('refresh')
    }
  }
});

chrome.action.setIcon({
  path: "icon_gray.png"
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  getCurrentTab(tab=>{
    if (tab) {
      if(request == 'unload'){
        chrome.action.setIcon({
          tabId : tab.id,
          path: "icon_gray.png"
        });
      }
      else if(request === 'load'){
        chrome.action.setIcon({
          tabId : tab.id,
          path: "icon.png"
        });
      }
    }
  });
  sendResponse(true)
});