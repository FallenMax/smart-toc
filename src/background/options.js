// Saves options to chrome.storage
function save_options() {
  var autoType = document.querySelector('input[name="auto"]:checked').value;
  var showTip = document.getElementById('show-tip').checked;
	var rememberPos = document.getElementById('remember-pos').checked;
  var selectorInoreader = document.getElementById('selector-inoreader').value;
	var selectorFeedly =	document.getElementById('selector-feedly').value;
  chrome.storage.local.set({
    isShowTip: showTip,
    isRememberPos: rememberPos,
		autoType: autoType,
    selectorInoreader: selectorInoreader,
    selectorFeedly, selectorFeedly
  }, function() {
    var status = document.getElementById('status');
    status.textContent = 'Options saved. / 已保存。';
    setTimeout(function() {
      status.textContent = '';
    }, 5000);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.local.get({
    isShowTip: true,
    isRememberPos: true,
		autoType: '0',
    selectorInoreader: '.article_content',
    selectorFeedly: '.entryBody'
  }, function(items) {
    document.getElementById('show-tip').checked = items.isShowTip;
    document.getElementById('remember-pos').checked = items.isRememberPos;
		document.getElementById('auto-'+items.autoType).checked = true;
		document.getElementById('selector-inoreader').value = items.selectorInoreader;
		document.getElementById('selector-feedly').value = items.selectorFeedly;
  });
}

function reset_options(){
	chrome.storage.local.clear();
	restore_options();
}

document.addEventListener('DOMContentLoaded', restore_options);
var inputs = document.getElementsByTagName('input');
for (let index = 0; index < inputs.length; index++) {
	const input = inputs[index];
	input.addEventListener('change', save_options);
}

document.getElementById("btnReset").addEventListener('click', reset_options);