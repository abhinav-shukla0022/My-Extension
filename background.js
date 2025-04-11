const trackedDomainsKey = 'trackedDomains';
const timeSpentKey = 'timeSpent';
const dailyGoalKey = 'dailyGoal';
const timeLimitKey = 'timeLimit';

// Default tracked domains
const defaultTrackedDomains = [
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'linkedin.com',
  'youtube.com',
  'reddit.com'
];

// Initialize extension data
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(trackedDomainsKey, (data) => {
    if (!data[trackedDomainsKey]) {
      chrome.storage.sync.set({ [trackedDomainsKey]: defaultTrackedDomains });
    }
  });
  
  chrome.storage.sync.get(timeSpentKey, (data) => {
    if (!data[timeSpentKey]) {
      // Initialize with empty object for each day
      const today = new Date().toDateString();
      chrome.storage.sync.set({ [timeSpentKey]: { } });
    }
  });
  
  chrome.storage.sync.get(dailyGoalKey, (data) => {
    if (!data[dailyGoalKey]) {
      chrome.storage.sync.set({ [dailyGoalKey]: 60 }); // Default goal: 60 minutes
    }
  });
  
  chrome.storage.sync.get(timeLimitKey, (data) => {
    if (!data[timeLimitKey]) {
      chrome.storage.sync.set({ [timeLimitKey]: 120 }); // Default limit: 120 minutes
    }
  });
});

// Global variables to track current tab and timing
let currentDomain = null;
let trackingStartTime = null;
let activeTabId = null;

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.active) {
    handleActiveTabChange(tab);
  }
});

// Handle tab switching
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      handleActiveTabChange(tab);
    }
  } catch (error) {
    console.error("Error getting tab:", error);
  }
});

// Track when window/tab loses focus
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus, stop tracking
    saveCurrentSession();
    currentDomain = null;
    trackingStartTime = null;
  } else {
    // Browser gained focus, check current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].url) {
        handleActiveTabChange(tabs[0]);
      }
    });
  }
});

function handleActiveTabChange(tab) {
  // Save current session if we were tracking something
  saveCurrentSession();
  
  // Start tracking new tab if it's a valid URL
  if (tab.url && tab.url.startsWith('http')) {
    try {
      const domain = new URL(tab.url).hostname.replace('www.', '');
      startTracking(domain, tab.id);
    } catch (error) {
      console.error("Invalid URL:", tab.url);
    }
  } else {
    // Not a trackable URL
    currentDomain = null;
    trackingStartTime = null;
    activeTabId = null;
  }
}

function startTracking(domain, tabId) {
  chrome.storage.sync.get(trackedDomainsKey, (data) => {
    const trackedDomains = data[trackedDomainsKey] || defaultTrackedDomains;
    
    if (trackedDomains.some(td => domain.includes(td))) {
      // This is a domain we want to track
      currentDomain = domain;
      trackingStartTime = Date.now();
      activeTabId = tabId;
      console.log(`Started tracking: ${domain}`);
    } else {
      // Not a domain we're tracking
      currentDomain = null;
      trackingStartTime = null;
      activeTabId = null;
    }
  });
}

function saveCurrentSession() {
  if (currentDomain && trackingStartTime) {
    const now = Date.now();
    const timeSpent = now - trackingStartTime;
    
    if (timeSpent > 1000) { // Only track if more than 1 second
      const today = new Date().toDateString();
      
      chrome.storage.sync.get(timeSpentKey, (data) => {
        const currentTimeSpent = data[timeSpentKey] || {};
        
        // Initialize nested objects if they don't exist
        if (!currentTimeSpent[currentDomain]) {
          currentTimeSpent[currentDomain] = {};
        }
        
        // Add time to today's record
        currentTimeSpent[currentDomain][today] = 
          (currentTimeSpent[currentDomain][today] || 0) + timeSpent;
        
        chrome.storage.sync.set({ [timeSpentKey]: currentTimeSpent }, () => {
          console.log(`Saved ${timeSpent}ms for ${currentDomain} on ${today}`);
        });
      });
    }
  }
}

// Periodically save time data in case browser crashes
setInterval(saveCurrentSession, 30000); // Every 30 seconds

// Reset daily tracking at midnight
chrome.alarms.create('resetDailyTracking', {
  when: getMidnightTimestamp(),
  periodInMinutes: 24 * 60
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetDailyTracking') {
    // We don't want to reset the entire timeSpent object anymore
    // Just let the daily stats accumulate by date
    console.log("New day started - daily stats will track with new date");
  }
});

function getMidnightTimestamp() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  return midnight.getTime();
}