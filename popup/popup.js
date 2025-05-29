/**
 * TabSage - Popup Script
 * Handles the user interface for capturing tab intent
 * Created by The Silicon Savants - Copyright (c) 2025
 */

document.addEventListener("DOMContentLoaded", function () {
  const intentSelect = document.getElementById("intent-select");
  const otherIntentInput = document.getElementById("other-intent");
  const otherIntentContainer = document.getElementById("other-intent-container");
  const saveButton = document.getElementById("save-intent");
  const currentUrlElement = document.getElementById("current-url");
  const statusMessageElement = document.getElementById("status-message");
  const dashboardButton = document.getElementById("open-dashboard");

  let currentTabId = null;
  let currentTabUrl = "Loading...";
  let isAutoTriggered = false;

  // Focus on the dropdown field when popup opens
  intentSelect.focus();

  // Check for URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const tabIdFromUrl = urlParams.get("tabId");
  isAutoTriggered = urlParams.get("autoTrigger") === "true";

  // Show/hide the "Other" input field based on select dropdown
  intentSelect.addEventListener("change", function() {
    if (this.value === "other") {
      // Show the other input field with animation and focus on it
      otherIntentContainer.style.display = "block";
      // Use setTimeout to ensure the display change happens first
      setTimeout(() => {
        otherIntentContainer.classList.add("visible");
        otherIntentInput.focus();
      }, 10);
    } else {
      // Hide the other input field with animation
      otherIntentContainer.classList.remove("visible");
      // After animation completes, hide the container
      setTimeout(() => {
        otherIntentContainer.style.display = "none";
      }, 300);
    }
  });

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
            intentSelect.disabled = true;
            otherIntentInput.disabled = true;
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
            intentSelect.disabled = true;
            otherIntentInput.disabled = true;
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

  // Set up event listeners
  saveButton.addEventListener("click", saveTabIntent);
  dashboardButton.addEventListener("click", openDashboard);

  // Also save when Enter key is pressed in the custom intent input
  otherIntentInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTabIntent();
    }
  });

  // Function to open the dashboard in a new tab
  function openDashboard() {
    chrome.runtime.sendMessage({ action: "openDashboard" });
    window.close(); // Close the popup
  }

  // Function to get the current intent value (either from dropdown or "Other" input)
  function getSelectedIntent() {
    const selectedValue = intentSelect.value;
    
    // If "other" is selected, use the value from the custom input field
    if (selectedValue === "other") {
      return otherIntentInput.value.trim();
    }
    
    // Otherwise return the value from the dropdown
    return selectedValue;
  }

  // Function to save the tab intent
  function saveTabIntent() {
    const intent = getSelectedIntent();

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

    // Validate intent selection
    if (!intent) {
      // Show different error messages based on whether "other" is selected
      if (intentSelect.value === "other") {
        otherIntentInput.classList.add("is-invalid");
        setTimeout(() => otherIntentInput.classList.remove("is-invalid"), 2000);
      } else {
        intentSelect.classList.add("is-invalid");
        setTimeout(() => intentSelect.classList.remove("is-invalid"), 2000);
      }
      
      if (statusMessageElement) {
        statusMessageElement.textContent = "Please select or enter an intent.";
        statusMessageElement.className = "text-warning";
      }
      return;
    }

    if (statusMessageElement) statusMessageElement.textContent = ""; // Clear previous messages

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
          saveButton.classList.add("btn-danger");
          saveButton.classList.remove("btn-primary");
          return;
        }

        if (response && response.success) {
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
            saveButton.textContent = "Save Intent";
            saveButton.classList.add("btn-primary");
            saveButton.classList.remove("btn-danger");
          }, 2000);
        }
      }
    );
  }
});
