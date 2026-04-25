chrome.action.onClicked.addListener((tab) => {
  // Inject the bypass script directly into the active tab
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // 1. Intercept all restrictive events from reaching the page's blocker scripts
      const events = ['copy', 'paste', 'cut', 'contextmenu', 'dragstart', 'selectstart'];
      
      events.forEach(evt => {
        document.addEventListener(evt, (e) => {
          e.stopPropagation(); // Stops the website from ever realizing you are pasting
        }, true); // The "true" ensures we intercept it BEFORE the website can
      });

      // 2. Remove annoying "unselectable" CSS rules
      const style = document.createElement('style');
      style.textContent = `
        * {
          -webkit-user-select: auto !important;
          -moz-user-select: auto !important;
          -ms-user-select: auto !important;
           user-select: auto !important;
        }
      `;
      document.head.appendChild(style);

      // Tell the user it worked!
      alert('🔓 UNLOCKED: Copy, Paste, and Right-Click are now forcefully enabled on this page!');
    }
  });
});
