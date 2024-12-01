chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autofillForms') {
    const profileData = request.profileData;

    // Query the active tab in the current window
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
        console.error('No active tab found or query failed:', chrome.runtime.lastError);
        sendResponse({ error: 'No active tab found' });
        return;
      }

      const activeTabId = tabs[0].id;
      if (activeTabId !== undefined) {
        chrome.tabs.sendMessage(
          activeTabId,
          { action: 'autofillForms', profileData },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error sending message to content script:', chrome.runtime.lastError.message);
              sendResponse({ error: 'Message send failure' });
            } else {
              sendResponse(response);
            }
          }
        );
      } else {
        console.error('Active tab ID is undefined.');
        sendResponse({ error: 'Active tab ID is undefined' });
      }
    });
    return true; // Indicate async response
  }

  if (request.action === 'fetchPageFields') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
        console.error('No active tab found or query failed:', chrome.runtime.lastError);
        sendResponse({ error: 'No active tab found' });
        return;
      }

      const activeTabId = tabs[0].id;
      chrome.tabs.sendMessage(activeTabId, { action: 'fetchPageFields' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error fetching fields from content script:', chrome.runtime.lastError.message);
          sendResponse({ error: 'Content script fetch failed' });
        } else {
          sendResponse(response);
        }
      });
    });
    return true; // Indicate async response
  }
});
