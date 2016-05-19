// start toc
chrome.browserAction.onClicked.addListener(tab => {
  chrome.tabs.executeScript(null, { file: 'toc.js' })
})

// start toc or send commands to content script
chrome.commands.onCommand.addListener(command => {
  if (command === 'toggle') {
    chrome.tabs.executeScript(null, { file: 'toc.js' })
  } else {
    chrome.tabs.query({ active: true }, ([active]) => {
      if (active) {
        chrome.tabs.sendMessage(active.id, command)
      }
    })
  }
})
