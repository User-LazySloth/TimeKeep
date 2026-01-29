// Track the current active tab and domain
let currentTabId = null;
let currentDomain = null;
let startTime = null;

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
  console.log('TimeKeep extension installed');
});

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

// Listen for tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  stopTracking();
  startTracking(activeInfo.tabId, tab.url);
});

// Listen for tab updates (URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tabId === currentTabId) {
    stopTracking();
    startTracking(tabId, changeInfo.url);
  }
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus
    stopTracking();
  } else {
    // Browser gained focus
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) {
      startTracking(tab.id, tab.url);
    }
  }
});

// Save data periodically (every 5 seconds)
setInterval(() => {
  if (currentDomain && startTime) {
    saveTimeSpent();
    startTime = Date.now(); // Reset start time to avoid double counting
  }
}, 5000);

// Initialize with current active tab
chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  if (tab) {
    startTracking(tab.id, tab.url);
  }
});
