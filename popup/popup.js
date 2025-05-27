/**
 * TabSage - Popup Script
 * Handles the user interface for capturing tab intent
 */

document.addEventListener("DOMContentLoaded", function () {
  const intentInput = document.getElementById("intent-input");
  const saveButton = document.getElementById("save-intent");
  const currentUrlElement = document.getElementById("current-url");
  const statusMessageElement = document.getElementById("status-message"); // Assuming you have an element for messages

  let currentTabId = null;
  let currentTabUrl = "Loading...";
  let isAutoTriggered = false;

  // Focus on the input field when popup opens
  intentInput.focus();

  // Check for URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const tabIdFromUrl = urlParams.get("tabId");
  isAutoTriggered = urlParams.get("autoTrigger") === "true";

  if (tabIdFromUrl) {
    currentTabId = parseInt(tabIdFromUrl);
    // Fetch tab details directly if tabId is provided
    chrome.tabs.get(currentTabId, function (tab) {
      if (chrome.runtime.lastError) {
        console.error("Error getting tab info:", chrome.runtime.lastError.message);
        currentUrlElement.textContent = "Error loading tab info";
        currentUrlElement.title = "Error loading tab info";
        saveButton.disabled = true; // Disable save if tab info fails
        return;
      }
      if (tab) {
        currentTabUrl = tab.url || tab.pendingUrl || "New Tab";
        currentUrlElement.textContent = currentTabUrl;
        currentUrlElement.title = currentTabUrl; // Show full URL on hover

        // Prevent setting intent for the dashboard or other extension pages if opened directly
        const dashboardPage = "dashboard/dashboard.html";
        const popupPage = "popup/popup.html";
        if (currentTabUrl.includes(dashboardPage) || currentTabUrl.includes(popupPage)) {
            intentInput.disabled = true;
            saveButton.disabled = true;
            if (statusMessageElement) {
                statusMessageElement.textContent = "Cannot set intent for this page.";
                statusMessageElement.className = "text-warning";
            }
            // If auto-triggered for such a page, maybe close it or inform background
            // For now, just disabling input is fine as background also has checks.
        }
      } else {
        currentUrlElement.textContent = "Tab not found";
        currentUrlElement.title = "Tab not found";
        saveButton.disabled = true;
      }
    });
  } else {
    // Fallback: Get information about the current tab (for manual popup)
    chrome.runtime.sendMessage({ action: "getCurrentTab" }, function (response) {
      if (chrome.runtime.lastError) {
        console.error("Error getting current tab:", chrome.runtime.lastError.message);
        currentUrlElement.textContent = "Error finding current tab";
        currentUrlElement.title = "Error finding current tab";
        saveButton.disabled = true;
        return;
      }
      if (response && response.tab) {
        currentTabId = response.tab.id;
        currentTabUrl = response.tab.url;
        currentUrlElement.textContent = currentTabUrl;
        currentUrlElement.title = currentTabUrl;

        const dashboardPage = "dashboard/dashboard.html";
        const popupPage = "popup/popup.html";
        if (currentTabUrl.includes(dashboardPage) || currentTabUrl.includes(popupPage)) {
            intentInput.disabled = true;
            saveButton.disabled = true;
            if (statusMessageElement) {
                statusMessageElement.textContent = "Cannot set intent for this page.";
                statusMessageElement.className = "text-warning";
            }
        }

      } else if (response && response.error) {
        console.warn("Could not get current tab:", response.error);
        currentUrlElement.textContent = response.error;
        currentUrlElement.title = response.error;
        saveButton.disabled = true;
      } else {
        currentUrlElement.textContent = "No active tab identified";
        currentUrlElement.title = "No active tab identified";
        saveButton.disabled = true;
      }
    });
  }

  // Save button click handler
  saveButton.addEventListener("click", saveTabIntent);

  // Also save when Enter key is pressed in the input field
  intentInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent default form submission if any
      saveTabIntent();
    }
  });

  // Function to save the tab intent
  function saveTabIntent() {
    const intent = intentInput.value.trim();

    if (!currentTabId) {
      console.error("No tab ID to save intent for.");
      if (statusMessageElement) {
        statusMessageElement.textContent = "Error: No tab identified.";
        statusMessageElement.className = "text-danger";
      }
      saveButton.textContent = "Error!";
      saveButton.classList.add("btn-danger");
      saveButton.classList.remove("btn-primary");
      setTimeout(() => {
        saveButton.textContent = "Save";
        saveButton.classList.add("btn-primary");
        saveButton.classList.remove("btn-danger");
      }, 2000);
      return;
    }

    if (!intent) {
      intentInput.classList.add("is-invalid");
      setTimeout(() => intentInput.classList.remove("is-invalid"), 2000);
      if (statusMessageElement) {
        statusMessageElement.textContent = "Please enter an intent.";
        statusMessageElement.className = "text-warning";
      }
      return;
    }

    if (statusMessageElement) statusMessageElement.textContent = ""; 

    // Save the intent for the current tab
    chrome.runtime.sendMessage(
      {
        action: "saveIntent",
        tabId: currentTabId, // Send the identified tabId
        intent: intent,
        autoTriggered: isAutoTriggered, // Indicate if this was an auto-triggered popup
      },
      function (response) {
        if (chrome.runtime.lastError) {
          console.error("Error sending saveIntent message:", chrome.runtime.lastError.message);
          if (statusMessageElement) {
            statusMessageElement.textContent = "Error saving: " + chrome.runtime.lastError.message;
            statusMessageElement.className = "text-danger";
          }
          saveButton.textContent = "Error!";
          // ... (button styling for error)
          return;
        }

        if (response && response.success) {
          const originalText = saveButton.textContent;
          saveButton.textContent = "Saved!";
          saveButton.classList.add("btn-success");
          saveButton.classList.remove("btn-primary");
          if (statusMessageElement) {
            statusMessageElement.textContent = "Intent saved!";
            statusMessageElement.className = "text-success";
          }

          setTimeout(() => {
            // Background script will close auto-triggered popups.
            // Manual popups or popups where background failed to close will close themselves here.
            window.close();
          }, 750); // Slightly shorter delay
        } else {
          saveButton.textContent = "Error!";
          saveButton.classList.add("btn-danger");
          saveButton.classList.remove("btn-primary");
          if (statusMessageElement) {
            statusMessageElement.textContent = response.error || "Failed to save intent.";
            statusMessageElement.className = "text-danger";
          }

          setTimeout(() => {
            saveButton.textContent = "Save";
            saveButton.classList.add("btn-primary");
            saveButton.classList.remove("btn-danger");
          }, 2000);
        }
      }
    );
  }
});
