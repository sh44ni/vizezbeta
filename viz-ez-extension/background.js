// background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_VIZEZ_DATA') {
    // Save the extracted data to local storage
    chrome.storage.local.set({ vizezPassportData: message.payload }, () => {
      if (chrome.runtime.lastError) {
        console.error('VizEz: Failed to save data —', chrome.runtime.lastError.message);
        sendResponse({ status: 'error', error: chrome.runtime.lastError.message });
      } else {
        console.log('VizEz: Data saved to extension storage. Keys:', Object.keys(message.payload));
        const hasPassportImg = !!message.payload._passportImageUrl;
        const hasWpImg = !!message.payload._workPermitImageUrl;
        console.log('VizEz: Passport image:', hasPassportImg, '| Work permit image:', hasWpImg);
        sendResponse({ status: 'success' });
      }
    });
    return true; // Keep the message channel open for sendResponse
  }
  
  if (message.type === 'GET_VIZEZ_DATA') {
    chrome.storage.local.get(['vizezPassportData'], (result) => {
      const data = result.vizezPassportData || null;
      if (data) {
        console.log('VizEz: Retrieved data. Keys:', Object.keys(data));
        console.log('VizEz: Has passport image:', !!data._passportImageUrl, '| Has WP image:', !!data._workPermitImageUrl);
      } else {
        console.log('VizEz: No data found in storage.');
      }
      sendResponse({ payload: data });
    });
    return true;
  }
});
