const action = function(command) {
  chrome.tabs.query({ active: true }, ([activeTab]) => {
    if (activeTab) {
      chrome.tabs.sendMessage(activeTab.id, command, response => {
        if (response === undefined && command === 'toggle') {
          chrome.tabs.executeScript(null, { file: 'toc.js' })
        }
      })
    }
  })
}
chrome.browserAction.onClicked.addListener(tab => action('toggle'))
chrome.commands.onCommand.addListener(action)


// notification on update
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason == 'update') {
    const curVer = chrome.runtime.getManifest().version
    const updateMsg = window.updateHistory[curVer]
    const prevVer = details.previousVersion
    if (curVer !== prevVer && updateMsg) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: './icon.png',
        title: `Smart TOC upgraded to ${curVer}`,
        message: updateMsg
      })
    }
  }
})
