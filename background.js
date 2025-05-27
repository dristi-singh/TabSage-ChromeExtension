/**
 * TabSage - Background Script
 * Handles tab creation events and manages tab data in storage
 */

// Initialize storage on extension install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["tabData"], function (result) {
    if (!result.tabData) {
      chrome.storage.local.set({ tabData: [] });
      console.log("TabSage: Storage initialized");
    }
  });
});

// Global variable to track the most recently created tab
let mostRecentTab = null;

// Listen for tab creation events
chrome.tabs.onCreated.addListener((tab) => {
  console.log("TabSage: onCreated event triggered. Tab details:", JSON.stringify(tab));
  // Store the most recently created tab for manual popup fallback or other potential uses
  mostRecentTab = tab;

  // Url of the dashboard
  const dashboardUrl = `chrome-extension://${chrome.runtime.id}/dashboard/dashboard.html`;
  // Url of the popup
  const popupUrlBase = `popup/popup.html`;
  const popupFullUrlPrefix = `chrome-extension://${chrome.runtime.id}/${popupUrlBase}`;

  // Check if the tab is fully loaded and has a URL.
  // New tabs might initially have 'about:blank' or no URL, or be 'chrome://newtab/' before our override.
  const newTabUrl = tab.pendingUrl || tab.url;
  console.log(`TabSage: onCreated - Tab ID: ${tab.id}, NewTabURL: ${newTabUrl}, Status: ${tab.status}`);

  // Do not open popup if the new tab is the dashboard, our own popup, or an initial blank/newtab page
  const isDashboard = newTabUrl === dashboardUrl;
  const isOwnPopup = newTabUrl && newTabUrl.startsWith(popupFullUrlPrefix);
  const isInitialBlank = !newTabUrl || newTabUrl === "about:blank";
  const isChromeNewTab = newTabUrl === "chrome://newtab/";

  console.log(`TabSage: onCreated - Conditions: isDashboard=${isDashboard}, isOwnPopup=${isOwnPopup}, isInitialBlank=${isInitialBlank}, isChromeNewTab=${isChromeNewTab}`);

  if (isDashboard || isOwnPopup || isInitialBlank || isChromeNewTab) {
    console.log(
      "TabSage: New tab is dashboard, popup, or initial blank/newtab page. Not opening intent popup for:",
      newTabUrl
    );
    return;
  }

  console.log("TabSage: New tab created, attempting to open intent popup for:", newTabUrl, "Tab ID:", tab.id);

  // Programmatically open the popup
  const popupWidth = 400;
  const popupHeight = 280; // Adjusted height for better content fit

  chrome.windows.create(
    {
      url: `${popupUrlBase}?tabId=${tab.id}&autoTrigger=true`,
      type: "popup",
      width: popupWidth,
      height: popupHeight,
      focused: true, // Make the popup focused
      // Consider calculating left/top for better screen positioning if needed
    },
    (newWindow) => {
      if (chrome.runtime.lastError) {
        console.error("TabSage: Error creating popup window:", chrome.runtime.lastError.message);
      } else {
        console.log("TabSage: Intent popup window created for tab", tab.id, "Window ID:", newWindow.id);
      }
    }
  );
});

// Function to add a tab to storage with its intent
function saveTabWithIntent(tabId, url, intent) {
  chrome.storage.local.get(["tabData"], function (result) {
    const tabData = result.tabData || [];

    // Check if this tab is already saved
    const existingTabIndex = tabData.findIndex((item) => item.id === tabId);

    const tabInfo = {
      id: tabId,
      url: url,
      intent: intent,
      timestamp: Date.now(),
    };

    // If tab already exists, update it; otherwise add it
    if (existingTabIndex >= 0) {
      tabData[existingTabIndex] = tabInfo;
    } else {
      tabData.push(tabInfo);
    }

    chrome.storage.local.set({ tabData: tabData }, function () {
      console.log(`TabSage: Tab ${tabId} saved with intent: ${intent}`);
    });
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveIntent") {
    const { tabId, intent, autoTriggered } = message; // Expect these from popup.js

    if (tabId && intent) {
      chrome.tabs.get(tabId, (tabDetails) => {
        if (chrome.runtime.lastError) {
          console.error(
            `TabSage: Error getting tab details for tab ${tabId}:`,
            chrome.runtime.lastError.message
          );
          sendResponse({
            success: false,
            error: "Failed to get tab details: " + chrome.runtime.lastError.message,
          });
          return;
        }

        if (tabDetails) {
          const dashboardUrl = `chrome-extension://${chrome.runtime.id}/dashboard/dashboard.html`;
          const tabUrl = tabDetails.url || tabDetails.pendingUrl;

          // Ensure we don't save intent for the dashboard tab
          if (tabUrl === dashboardUrl) {
            console.log(
              "TabSage: Attempted to save intent for dashboard tab. Ignoring.",
              tabDetails
            );
            sendResponse({
              success: false,
              error: "Cannot save intent for dashboard tab",
            });
            // If this was an auto-triggered popup for the dashboard (should have been prevented by onCreated), close it.
            if (sender.tab && autoTriggered) {
              chrome.windows.remove(sender.tab.windowId, () => {
                if (chrome.runtime.lastError) console.error("TabSage: Error closing popup for dashboard:", chrome.runtime.lastError.message);
              });
            }
            return;
          }

          saveTabWithIntent(
            tabId,
            tabUrl || "", // Use actual URL
            intent
          );

          // If this was an auto-triggered popup, close it.
          // sender.tab is the tab that sent the message (the popup itself)
          if (sender.tab && autoTriggered) {
            chrome.windows.remove(sender.tab.windowId, () => {
                if (chrome.runtime.lastError) console.error("TabSage: Error closing auto-triggered popup:", chrome.runtime.lastError.message);
                else console.log("TabSage: Auto-triggered popup closed for tab", tabId);
            });
          }
          sendResponse({ success: true });
        } else {
          console.error(`TabSage: Could not find tab with ID ${tabId}`);
          sendResponse({ success: false, error: `Tab ${tabId} not found` });
        }
      });
    } else {
      console.error(
        "TabSage: saveIntent message missing tabId or intent.",
        message
      );
      sendResponse({ success: false, error: "Missing tabId or intent" });
    }
    return true; // Indicates async response
  }

  if (message.action === "getCurrentTab") {
    // This message is typically from a manually opened popup (toolbar icon)
    // or if an auto-popup needs to confirm its tab details.
    // It should be the currently active tab in the current window.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const currentActiveTab = tabs[0];
        const tabUrl = currentActiveTab.url || currentActiveTab.pendingUrl;
        const dashboardUrl = `chrome-extension://${chrome.runtime.id}/dashboard/dashboard.html`;

        if (tabUrl === dashboardUrl) {
          console.log(
            "TabSage: getCurrentTab called, active tab is dashboard."
          );
          // For a manual popup on the dashboard, it might not make sense to set an intent.
          // Popup.js can decide how to handle this (e.g., disable input).
        }
        
        // Also check if the current active tab is an existing popup window for setting intent
        const popupUrlBase = `popup/popup.html`;
        if (tabUrl && tabUrl.startsWith(`chrome-extension://${chrome.runtime.id}/${popupUrlBase}`)) {
            console.log("TabSage: getCurrentTab called, active tab is an intent popup itself. Responding with no specific tab.");
            // It doesn't make sense for an intent popup to set an intent for itself.
            // Sending null or an error might be appropriate.
            // Or, popup.js should have logic to not call getCurrentTab if it already has a tabId from URL params.
            sendResponse({ tab: null, error: "Active tab is an intent popup."});
            return;
        }


        sendResponse({
          tab: {
            id: currentActiveTab.id,
            url: tabUrl || "Loading...",
          },
        });
      } else {
        // No active tab found, fall back to the most recent tab
        if (mostRecentTab) {
          console.warn(
            "TabSage: No active tab found for getCurrentTab, falling back to mostRecentTab."
          );
          sendResponse({
            tab: {
              id: mostRecentTab.id,
              url: mostRecentTab.url || mostRecentTab.pendingUrl || "Loading...",
            },
          });
        } else {
          console.error(
            "TabSage: No active tab found and no mostRecentTab for getCurrentTab."
          );
          sendResponse({ tab: null, error: "No active tab found" });
        }
      }
    });
    return true; // Indicates async response
  }
});
