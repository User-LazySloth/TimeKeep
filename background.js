// Track the current active tab and domain
let currentTabId = null;
let currentDomain = null;
let startTime = null;

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
  console.log('TimeKeep extension installed');
  initializeTracking();
});

// Initialize when browser starts
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started - initializing TimeKeep');
  initializeTracking();
});

// Initialize tracking on current tab
async function initializeTracking() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      startTracking(tab.id, tab.url);
    }
  } catch (e) {
    console.log('Error initializing tracking:', e);
  }
}

// Get domain from URL
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Save time spent on current domain
async function saveTimeSpent() {
  if (!currentDomain || !startTime || currentDomain === 'null') return;

  const timeSpent = Date.now() - startTime;
  const today = getTodayDate();
  
  // Get existing data
  const result = await chrome.storage.local.get(['timeData']);
  const timeData = result.timeData || {};

  // Initialize today's data if needed
  if (!timeData[today]) {
    timeData[today] = {};
  }

  // Add time to domain for today
  if (!timeData[today][currentDomain]) {
    timeData[today][currentDomain] = 0;
  }
  timeData[today][currentDomain] += timeSpent;

  // Save back to storage
  await chrome.storage.local.set({ timeData });
  console.log(`Saved ${timeSpent}ms to ${currentDomain} on ${today}`);
}

// Start tracking a new domain
function startTracking(tabId, url) {
  if (!url) return;
  
  // Skip internal browser pages
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
      url.startsWith('brave://') || url.startsWith('edge://') ||
      url.startsWith('about:') || url.startsWith('moz-extension://') ||
      url.startsWith('safari-web-extension://') || url.startsWith('file://')) {
    return;
  }
  
  const domain = getDomain(url);
  
  if (!domain || domain === 'null' || domain === 'newtab') {
    return;
  }

  // If we're already tracking a different domain, save the time first
  if (currentDomain && currentDomain !== domain) {
    saveTimeSpent();
  }

  currentTabId = tabId;
  currentDomain = domain;
  startTime = Date.now();
  console.log(`Started tracking: ${domain}`);
}

// Stop tracking current domain
function stopTracking() {
  if (currentDomain) {
    saveTimeSpent();
    currentDomain = null;
    currentTabId = null;
    startTime = null;
  }
}

// Listen for tab updates (URL changes and page loads)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Check if this is the active tab
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Only track if this is the active tab and it has a URL now
    if (activeTab && activeTab.id === tabId) {
      // Handle URL changes or when page finishes loading
      if (changeInfo.url || changeInfo.status === 'complete') {
        const url = changeInfo.url || tab.url;
        if (url && url !== 'about:blank') {
          // If domain changed or we weren't tracking, start tracking
          const newDomain = getDomain(url);
          if (newDomain && newDomain !== currentDomain) {
            stopTracking();
            startTracking(tabId, url);
          } else if (!currentDomain && newDomain) {
            startTracking(tabId, url);
          }
        }
      }
    }
  } catch (e) {
    console.log('Error on tab update:', e);
  }
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus
    stopTracking();
  } else {
    // Browser gained focus - reinitialize tracking
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      if (tab && tab.url) {
        stopTracking();
        startTracking(tab.id, tab.url);
      }
    } catch (e) {
      console.log('Error on focus change:', e);
    }
  }
});

// Listen for tab activation - also handles when service worker wakes up
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    stopTracking();
    if (tab && tab.url && tab.url !== 'about:blank') {
      startTracking(activeInfo.tabId, tab.url);
    }
    // If URL is not ready yet, onUpdated will handle it when it loads
  } catch (e) {
    console.log('Error on tab activation:', e);
  }
});

// Listen for new windows being created
chrome.windows.onCreated.addListener(async (window) => {
  try {
    // Small delay to let the tab load
    setTimeout(async () => {
      const [tab] = await chrome.tabs.query({ active: true, windowId: window.id });
      if (tab && tab.url && tab.url !== 'about:blank') {
        stopTracking();
        startTracking(tab.id, tab.url);
      }
    }, 500);
  } catch (e) {
    console.log('Error on window created:', e);
  }
});

// Save data periodically (every 5 seconds)
setInterval(() => {
  if (currentDomain && startTime) {
    saveTimeSpent();
    startTime = Date.now(); // Reset start time to avoid double counting
  }
}, 5000);

// Initialize immediately when service worker starts/wakes up
initializeTracking();
