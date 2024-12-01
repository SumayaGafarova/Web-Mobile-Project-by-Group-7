chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autofillForms') {
    const profileData = request.profileData;

    // Query the active tab in the current window
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
        console.error('No active tab found or query failed:', chrome.runtime.lastError);
        return;
      }

      // Ensure we have a valid tab ID before sending the message
      const activeTabId = tabs[0].id;
      if (activeTabId !== undefined) {
        chrome.tabs.sendMessage(activeTabId, {
          action: 'autofillForms',
          profileData,
        });
      } else {
        console.error('Active tab ID is undefined.');
      }
    });
  }
});
