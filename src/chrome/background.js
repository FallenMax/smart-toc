chrome.browserAction.onClicked.addListener(tab => {
  chrome.tabs.executeScript(null, { file: 'toc.js' })
})

chrome.commands.onCommand.addListener(command => {
  chrome.tabs.executeScript(null, { file: 'toc.js' })
})
