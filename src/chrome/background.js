const action = function(command) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
    if (activeTab) {
      chrome.tabs.sendMessage(activeTab.id, command, response => {
        if (response === undefined && command === 'toggle') {
          chrome.tabs.executeScript(activeTab.id, {
            file: 'toc.js',
            allFrames: true
          })
        }
      })
    }
  })
}
chrome.browserAction.onClicked.addListener(tab => action('toggle'))
chrome.commands.onCommand.addListener(command => action(command))
