/**
 * TabSage - Background Script
 * Handles tab creation events and manages tab data in storage
 * Created by The Silicon Savants - Copyright (c) 2023
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
// Track tabs we've already prompted for intent
const promptedTabs = new Set();
// Track tabs that are currently being created (to handle onUpdated events properly)
const pendingNewTabs = new Set();

// Get the URL of our dashboard for comparison
const getDashboardUrl = () => {
  return `chrome-extension://${chrome.runtime.id}/dashboard/dashboard.html`;
};

const getPopupBaseUrl = () => {
  return `popup/popup.html`;
};

// Check if a URL belongs to our extension
function isExtensionUrl(url) {
  if (!url) return false;
  return url.startsWith(`chrome-extension://${chrome.runtime.id}`);
}

// Check if a URL is our dashboard
function isDashboardUrl(url) {
  if (!url) return false;
  return url === getDashboardUrl();
}

// Check if a URL is a standard new tab
function isNewTabUrl(url) {
  if (!url) return false;
  return url === 'chrome://newtab/' || url === 'about:blank';
}

// Check if a URL is our popup
function isPopupUrl(url) {
  if (!url) return false;
  return url.includes(getPopupBaseUrl());
}

// Check if we should prompt for intent
function shouldIgnoreForIntent(url) {
  if (!url) return false;
  // Don't prompt for extension pages, chrome system pages, etc.
  if (isExtensionUrl(url)) return true;
  if (url.startsWith('chrome://')) return true;
  if (url.startsWith('chrome-extension://')) return true;
  if (url.startsWith('about:blank')) return false; // We DO want to prompt for blank tabs now
  if (url.startsWith('about:')) return true;
  // Don't prompt for data URLs, javascript or file URLs
  if (url.startsWith('data:')) return true;
  if (url.startsWith('javascript:')) return true;
  if (url.startsWith('file:')) return true;

  return false;
}

// Listen for tab creation events
chrome.tabs.onCreated.addListener((tab) => {
  console.log("TabSage: onCreated event triggered. Tab details:", JSON.stringify(tab));
  mostRecentTab = tab;
  
  // Check if this tab was created by our extension (like the dashboard or popup)
  const newTabUrl = tab.pendingUrl || tab.url;
  console.log(`TabSage: onCreated - Tab ID: ${tab.id}, NewTabURL: ${newTabUrl}, Status: ${tab.status}`);
  
  // If it's an extension page, don't show the popup
  if (isExtensionUrl(newTabUrl)) {
    console.log("TabSage: Not showing popup for extension page:", newTabUrl);
    return;
  }
  
  // If we already prompted for this tab, don't prompt again
  if (promptedTabs.has(tab.id)) {
    console.log("TabSage: Already prompted for tab", tab.id);
    return;
  }

  // Wait a brief moment to show the popup (gives tab time to initialize)
  setTimeout(() => {
    // Check again if it's still a valid tab before showing popup
    chrome.tabs.get(tab.id, (currentTab) => {
      if (chrome.runtime.lastError) {
        console.log("TabSage: Tab no longer exists:", chrome.runtime.lastError.message);
        return;
      }

      // If this is not an extension page or system page, show the popup
      const currentUrl = currentTab.url || currentTab.pendingUrl || "";
      if (!shouldIgnoreForIntent(currentUrl) && !promptedTabs.has(tab.id)) {
        console.log(`TabSage: Showing intent popup for new tab ${tab.id} with URL: ${currentUrl}`);
        showIntentPopup(currentTab);
      }
    });
  }, 300); // Small delay to let tab initialize properly
});

// Handle tab updates - for tracking tabs that change URLs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // We only care about complete loading state on tabs we haven't prompted for yet
  if (promptedTabs.has(tabId) || !changeInfo.status === 'complete') {
    return;
  }
  
  const currentUrl = tab.url || tab.pendingUrl;
  console.log(`TabSage: onUpdated - Tab ID: ${tabId}, URL: ${currentUrl}, Status: ${changeInfo.status}`);
  
  // If we should prompt for intent for this URL and haven't already
  if (currentUrl && !shouldIgnoreForIntent(currentUrl) && !promptedTabs.has(tabId)) {
    console.log(`TabSage: Tab ${tabId} updated with URL ${currentUrl}, showing intent popup`);
    showIntentPopup(tab);
  }
});

// Handle tab removal to clean up our tracking sets
chrome.tabs.onRemoved.addListener((tabId) => {
  promptedTabs.delete(tabId);
  pendingNewTabs.delete(tabId);
});

// Function to show the intent popup for a tab
function showIntentPopup(tab) {
  if (!tab || !tab.id) return;
  
  // Mark this tab as already prompted
  promptedTabs.add(tab.id);
  
  // Popup dimensions
  const popupWidth = 400;
  const popupHeight = 280;
  
  // Calculate position (centered)
  const left = Math.round((screen.width - popupWidth) / 2);
  const top = Math.round((screen.height - popupHeight) / 2);

  // Open the popup window
  chrome.windows.create(
    {
      url: `${getPopupBaseUrl()}?tabId=${tab.id}&autoTrigger=true`,
      type: "popup",
      width: popupWidth,
      height: popupHeight,
      left: left,
      top: top,
      focused: true,
    },
    (newWindow) => {
      if (chrome.runtime.lastError) {
        console.error("TabSage: Error creating popup window:", chrome.runtime.lastError.message);
      } else {
        console.log("TabSage: Intent popup window created for tab", tab.id, "Window ID:", newWindow.id);
      }
    }
  );
}

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
          const dashboardUrl = getDashboardUrl();
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
            // If this was an auto-triggered popup for the dashboard (should have been prevented), close it.
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
        const dashboardUrl = getDashboardUrl();

        if (tabUrl === dashboardUrl) {
          console.log(
            "TabSage: getCurrentTab called, active tab is dashboard."
          );
          // For a manual popup on the dashboard, it might not make sense to set an intent.
          // Popup.js can decide how to handle this (e.g., disable input).
        }
        
        // Also check if the current active tab is an existing popup window for setting intent
        const popupUrlBase = getPopupBaseUrl();
        if (tabUrl && isPopupUrl(tabUrl)) {
            console.log("TabSage: getCurrentTab called, active tab is an intent popup itself. Responding with no specific tab.");
            // It doesn't make sense for an intent popup to set an intent for itself.
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
        // Fallback to mostRecentTab if no active tab is found
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

  // New handler for opening the dashboard
  if (message.action === "openDashboard") {
    chrome.tabs.create({ url: getDashboardUrl() }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error("Error opening dashboard:", chrome.runtime.lastError.message);
      }
    });
    return true;
  }
});
