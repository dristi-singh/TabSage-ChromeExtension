/**
 * TabSage - Dashboard Script
 * Manages the tab dashboard interface, grouping, and export functionality
 * Created by The Silicon Savants - Copyright (c) 2025
 */

document.addEventListener("DOMContentLoaded", function () {
  // DOM elements
  const intentGroupsContainer = document.getElementById(
    "intent-groups-container"
  );
  const emptyState = document.getElementById("empty-state");
  const totalTabsElement = document.getElementById("total-tabs");
  const totalGroupsElement = document.getElementById("total-groups");
  const sessionTimeElement = document.getElementById("session-time");
  const exportBtn = document.getElementById("export-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const newTabBtn = document.getElementById("new-tab-btn");

  // Load and display the tab data
  loadTabData();

  // Set up event listeners
  exportBtn.addEventListener("click", exportSessionData);
  refreshBtn.addEventListener("click", loadTabData);
  
  // Add handler for the new tab button
  if (newTabBtn) {
    newTabBtn.addEventListener("click", function() {
      chrome.tabs.create({}, function(tab) {
        console.log("Created new tab:", tab.id);
      });
    });
  }

  /**
   * Loads tab data from storage and renders the dashboard
   */
  function loadTabData() {
    chrome.storage.local.get(["tabData"], function (result) {
      const tabData = result.tabData || [];

      // Update stats
      totalTabsElement.textContent = tabData.length;

      if (tabData.length > 0) {
        // Find the oldest timestamp to display session start time
        const oldestTimestamp = tabData.reduce(
          (oldest, tab) => Math.min(oldest, tab.timestamp),
          Infinity
        );
        const sessionDate = new Date(oldestTimestamp);
        sessionTimeElement.textContent = sessionDate.toLocaleString();

        // Group tabs by intent
        const groupedTabs = groupTabsByIntent(tabData);

        // Update the groups count
        const intentCount = Object.keys(groupedTabs).length;
        totalGroupsElement.textContent = intentCount;

        // Render the grouped tabs
        renderTabGroups(groupedTabs);

        // Show the tab groups, hide the empty state
        intentGroupsContainer.style.display = "block";
        emptyState.style.display = "none";
      } else {
        // No tabs, show empty state
        intentGroupsContainer.style.display = "none";
        emptyState.style.display = "block";

        // Reset stats
        sessionTimeElement.textContent = "-";
        totalGroupsElement.textContent = "0";
      }
    });
  }

  /**
   * Groups tabs by their intent
   * @param {Array} tabs - Array of tab objects
   * @returns {Object} - Object with intents as keys and arrays of tabs as values
   */
  function groupTabsByIntent(tabs) {
    return tabs.reduce((groups, tab) => {
      // Default to "No Intent" if none is specified
      const intent = tab.intent || "No Intent";

      if (!groups[intent]) {
        groups[intent] = [];
      }

      groups[intent].push(tab);
      return groups;
    }, {});
  }

  /**
   * Gets the favicon URL for a given URL
   * @param {string} url - The URL of the page
   * @returns {string} - The URL of the favicon
   */
  function getFaviconUrl(url) {
    try {
      // Extract domain for favicon
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch (e) {
      // Return default icon if URL is invalid
      return '../icons/icon_32.png';
    }
  }

  /**
   * Renders the tab groups in the dashboard
   * @param {Object} groupedTabs - Object with intents as keys and arrays of tabs as values
   */
  function renderTabGroups(groupedTabs) {
    // Clear existing tab groups
    intentGroupsContainer.innerHTML = "";

    // Iterate through each intent group
    Object.entries(groupedTabs).forEach(([intent, tabs]) => {
      // Create the intent group container
      const intentGroup = document.createElement("div");
      intentGroup.className = "intent-group mb-4";
      intentGroup.dataset.intent = intent;

      // Create the intent header
      const intentHeader = document.createElement("div");
      intentHeader.className = "intent-header";
      intentHeader.innerHTML = `
        <div class="d-flex align-items-center">
          <h3 class="mb-0">${intent}</h3>
          <span class="badge bg-primary ms-2">${tabs.length}</span>
        </div>
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-secondary rename-intent-btn">Rename</button>
          <button class="btn btn-sm btn-outline-danger close-group-btn">Close Group</button>
        </div>
      `;

      // Create the tab list container
      const tabList = document.createElement("div");
      tabList.className = "tab-list";

      // Add each tab to the list
      tabs.forEach((tab) => {
        const tabCard = document.createElement("div");
        tabCard.className = "tab-card card mb-2";
        tabCard.dataset.tabId = tab.id;

        // Format the date
        const date = new Date(tab.timestamp);
        const formattedDate = date.toLocaleString();
        
        // Get favicon URL
        const faviconUrl = getFaviconUrl(tab.url);

        // Create the card content
        tabCard.innerHTML = `
          <div class="card-body p-3">
            <div class="d-flex justify-content-between">
              <div class="d-flex align-items-center">
                <img src="${faviconUrl}" class="favicon" onerror="this.src='../icons/icon_32.png';this.style.opacity='0.3'">
                <a href="${tab.url}" target="_blank" class="text-truncate" style="max-width: 400px;" title="${tab.url}">${tab.url}</a>
              </div>
              <small class="text-muted">${formattedDate}</small>
            </div>
          </div>
        `;

        // Add the tab card to the tab list
        tabList.appendChild(tabCard);
      });

      // Add the header and tab list to the intent group
      intentGroup.appendChild(intentHeader);
      intentGroup.appendChild(tabList);

      // Add the intent group to the container
      intentGroupsContainer.appendChild(intentGroup);

      // Set up event listeners for the buttons
      const closeGroupBtn = intentGroup.querySelector(".close-group-btn");
      closeGroupBtn.addEventListener("click", () =>
        closeTabGroup(intent, tabs)
      );

      const renameIntentBtn = intentGroup.querySelector(".rename-intent-btn");
      renameIntentBtn.addEventListener("click", () => renameIntent(intent));
    });
  }

  /**
   * Closes all tabs in a group and removes them from storage
   * @param {string} intent - The intent of the group
   * @param {Array} tabs - Array of tab objects in the group
   */
  function closeTabGroup(intent, tabs) {
    if (confirm(`Close all ${tabs.length} tabs in the "${intent}" group?`)) {
      // Get the tab IDs to close
      const tabIds = tabs.map((tab) => tab.id);

      // Try to close the tabs using chrome.tabs.remove
      chrome.tabs.remove(tabIds, function () {
        // Handle any tabs that couldn't be closed (e.g., already closed)
        const error = chrome.runtime.lastError;
        if (error) {
          console.log("Some tabs could not be closed:", error.message);
        }

        // Remove the tabs from storage regardless
        chrome.storage.local.get(["tabData"], function (result) {
          let allTabs = result.tabData || [];

          // Filter out the closed tabs
          allTabs = allTabs.filter((tab) => !tabIds.includes(tab.id));

          // Update storage
          chrome.storage.local.set({ tabData: allTabs }, function () {
            // Reload the dashboard to reflect the changes
            loadTabData();
          });
        });
      });
    }
  }

  /**
   * Renames an intent for all tabs in that group
   * @param {string} currentIntent - The current intent to rename
   */
  function renameIntent(currentIntent) {
    // Prompt for the new intent name
    const newIntent = prompt(
      "Enter a new name for this intent group:",
      currentIntent
    );

    if (newIntent && newIntent !== currentIntent) {
      // Update all tabs with this intent in storage
      chrome.storage.local.get(["tabData"], function (result) {
        let allTabs = result.tabData || [];

        // Update the intent for all matching tabs
        allTabs = allTabs.map((tab) => {
          if (tab.intent === currentIntent) {
            return { ...tab, intent: newIntent };
          }
          return tab;
        });

        // Update storage
        chrome.storage.local.set({ tabData: allTabs }, function () {
          // Reload the dashboard to reflect the changes
          loadTabData();
        });
      });
    }
  }

  /**
   * Exports the current session data as a JSON file
   */
  function exportSessionData() {
    chrome.storage.local.get(["tabData"], function (result) {
      const tabData = result.tabData || [];

      if (tabData.length === 0) {
        alert("No tab data to export.");
        return;
      }

      // Create export object with metadata
      const exportData = {
        name: "TabSage Session Export",
        date: new Date().toISOString(),
        tabCount: tabData.length,
        tabs: tabData,
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);

      // Create a Blob with the JSON data
      const blob = new Blob([jsonString], { type: "application/json" });

      // Create a download link and trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tabsage-session-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    });
  }
});
