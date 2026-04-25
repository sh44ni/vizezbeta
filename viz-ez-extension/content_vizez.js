// content_vizez.js

// This script runs on the Next.js VizEz application.
// It listens for a postMessage from the page when the user clicks 'Send to Portal AutoFiller'.
// We use postMessage instead of CustomEvent because CustomEvent.detail is null
// when crossing the main-world / content-script isolation boundary in Chrome MV3.

window.addEventListener('message', (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;
  // Only process our specific message type
  if (!event.data || event.data.type !== 'VIZEZ_SEND_TO_EXTENSION') return;

  const passportData = event.data.payload;
  
  try {
    if (!passportData) {
      alert('❌ No passport data was found! Did the AI extraction run properly?');
      return;
    }

    const hasPassportImg = !!passportData._passportImageUrl;
    const hasWpImg = !!passportData._workPermitImageUrl;
    console.log('VizEz: Sending data to extension. Keys:', Object.keys(passportData));
    console.log('VizEz: Passport image included:', hasPassportImg, '| WP image included:', hasWpImg);
    
    chrome.runtime.sendMessage({
      type: 'SAVE_VIZEZ_DATA',
      payload: passportData
    }, (response) => {
      if(chrome.runtime.lastError) {
         alert('❌ Extension Error: ' + chrome.runtime.lastError.message);
         return;
      }
      if(response && response.status === 'success') {
         const imgInfo = (hasPassportImg || hasWpImg) 
           ? `\n📄 Passport preview: ${hasPassportImg ? '✅' : '❌'}\n📋 Madunia preview: ${hasWpImg ? '✅' : '❌'}`
           : '';
         alert('✅ Data securely saved to AutoFiller extension!' + imgInfo);
      } else if (response && response.status === 'error') {
         alert('❌ Storage error: ' + (response.error || 'Unknown error') + '\n\nTry clearing old data and re-sending.');
      } else {
         alert('❌ Failed to save data to extension. Please make sure the extension is enabled.');
      }
    });
  } catch(err) {
    if (err.message.includes('Extension context invalidated')) {
      alert("⚠️ WARNING: The VizEz Extension was updated in the background. \n\nYou MUST Refresh (F5) this VizEz tab before you can send data again!");
    } else {
      alert("❌ Runtime Error: " + err.message);
    }
  }
});

console.log("VizEz AutoFiller Extension: Listening for data from VizEz Platform...");

// Announce presence to the web app so it can detect us
document.documentElement.setAttribute('data-vizez-extension', 'installed');
window.postMessage({ type: 'VIZEZ_EXTENSION_READY', version: '1.0' }, '*');
