// Format milliseconds to readable time
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${seconds}s`;
  }
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Get date N days ago
function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

// Get all available dates from data
function getAvailableDates(timeData) {
  return Object.keys(timeData).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key)).sort().reverse();
}

// Aggregate data based on selected date range
function aggregateData(timeData, dateFilter) {
  const aggregated = {};
  let datesToInclude = [];

  if (dateFilter === 'today') {
    datesToInclude = [getTodayDate()];
  } else if (dateFilter === 'yesterday') {
    datesToInclude = [getDateDaysAgo(1)];
  } else if (dateFilter === 'week') {
    for (let i = 0; i < 7; i++) {
      datesToInclude.push(getDateDaysAgo(i));
    }
  } else if (dateFilter === 'month') {
    for (let i = 0; i < 30; i++) {
      datesToInclude.push(getDateDaysAgo(i));
    }
  } else if (dateFilter === 'all') {
    datesToInclude = getAvailableDates(timeData);
  } else {
    // Specific date selected
    datesToInclude = [dateFilter];
  }

  datesToInclude.forEach(date => {
    if (timeData[date]) {
      Object.entries(timeData[date]).forEach(([domain, time]) => {
        if (!aggregated[domain]) {
          aggregated[domain] = 0;
        }
        aggregated[domain] += time;
      });
    }
  });

  return aggregated;
}

// Populate date select - only preset options, no individual dates
function populateDateSelect(timeData) {
  // No dynamic dates added - just use the preset options in HTML
}

// Format date for display
function formatDateLabel(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// List of domains to exclude from display
const excludedDomains = ['null', 'newtab', 'extensions', 'settings', 'history', 'downloads', 'bookmarks', 'flags', 'wallet', 'rewards', 'new-tab-page'];

// Check if domain should be excluded
function isExcludedDomain(domain) {
  if (!domain) return true;
  return excludedDomains.includes(domain.toLowerCase());
}

// Load and display time data
async function loadTimeData() {
  const result = await chrome.storage.local.get(['timeData']);
  const timeData = result.timeData || {};

  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const dateFilter = document.getElementById('dateSelect').value;

  // Populate date dropdown
  populateDateSelect(timeData);

  // Aggregate data based on date filter
  const aggregatedData = aggregateData(timeData, dateFilter);

  // Convert to array, filter out excluded domains and apply search
  let entries = Object.entries(aggregatedData).filter(([domain]) => 
    !isExcludedDomain(domain) && domain.toLowerCase().includes(searchTerm)
  );

  // Sort by time (descending)
  entries.sort((a, b) => b[1] - a[1]);

  // Calculate total time and max time for scaling
  const totalTime = entries.reduce((sum, [, time]) => sum + time, 0);
  const maxTime = entries.length > 0 ? Math.max(...entries.map(([, time]) => time)) : 0;

  // Update summary stats
  document.getElementById('totalSites').textContent = entries.length;
  document.getElementById('totalTime').textContent = formatTime(totalTime);

  // Display list
  const timeList = document.getElementById('timeList');
  
  if (entries.length === 0) {
    timeList.innerHTML = '<div class="empty-state"><p>No data found</p></div>';
    return;
  }

  timeList.innerHTML = entries.map(([domain, time]) => {
    const percentage = maxTime > 0 ? (time / maxTime) * 100 : 0;
    return `
      <div class="time-item">
        <div class="domain-info">
          <div class="domain-name" title="${domain}">${domain}</div>
          <div class="time-spent">${formatTime(time)}</div>
        </div>
        <div class="time-bar-container">
          <div class="time-bar" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Show clear modal
function showClearModal() {
  document.getElementById('clearModal').classList.remove('hidden');
}

// Hide clear modal
function hideClearModal() {
  document.getElementById('clearModal').classList.add('hidden');
}

// Clear data based on selected option
async function clearData(clearType) {
  const result = await chrome.storage.local.get(['timeData']);
  let timeData = result.timeData || {};

  if (clearType === 'all') {
    timeData = {};
  } else {
    let datesToClear = [];

    if (clearType === 'today') {
      datesToClear = [getTodayDate()];
    } else if (clearType === 'yesterday') {
      datesToClear = [getDateDaysAgo(1)];
    } else if (clearType === 'week') {
      for (let i = 0; i < 7; i++) {
        datesToClear.push(getDateDaysAgo(i));
      }
    } else if (clearType === 'month') {
      for (let i = 0; i < 30; i++) {
        datesToClear.push(getDateDaysAgo(i));
      }
    }

    // Remove selected dates from data
    datesToClear.forEach(date => {
      delete timeData[date];
    });
  }

  await chrome.storage.local.set({ timeData });
  hideClearModal();
  loadTimeData();
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadTimeData();

  // Set up event listeners
  document.getElementById('clearBtn').addEventListener('click', showClearModal);
  document.getElementById('cancelClear').addEventListener('click', hideClearModal);
  document.getElementById('searchInput').addEventListener('input', loadTimeData);
  document.getElementById('dateSelect').addEventListener('change', loadTimeData);

  // Set up clear option buttons
  document.querySelectorAll('.modal-btn[data-clear]').forEach(btn => {
    btn.addEventListener('click', () => {
      const clearType = btn.getAttribute('data-clear');
      if (clearType === 'all') {
        if (confirm('Are you sure you want to delete ALL data? This cannot be undone!')) {
          clearData(clearType);
        }
      } else {
        clearData(clearType);
      }
    });
  });

  // Close modal when clicking outside
  document.getElementById('clearModal').addEventListener('click', (e) => {
    if (e.target.id === 'clearModal') {
      hideClearModal();
    }
  });

  // Refresh data every 1 second while popup is open
  setInterval(loadTimeData, 1000);
});
