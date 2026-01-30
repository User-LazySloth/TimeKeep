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

// Get data grouped by date for multi-day views
function getGroupedDataByDate(timeData, dateFilter, searchTerm) {
  let datesToInclude = [];

  if (dateFilter === 'week') {
    for (let i = 0; i < 7; i++) {
      datesToInclude.push(getDateDaysAgo(i));
    }
  } else if (dateFilter === 'month') {
    for (let i = 0; i < 30; i++) {
      datesToInclude.push(getDateDaysAgo(i));
    }
  } else if (dateFilter === 'all') {
    datesToInclude = getAvailableDates(timeData);
  }

  const groupedData = [];

  datesToInclude.forEach(date => {
    if (timeData[date]) {
      let entries = Object.entries(timeData[date]).filter(([domain]) => 
        !isExcludedDomain(domain) && domain.toLowerCase().includes(searchTerm)
      );

      if (entries.length > 0) {
        // Sort by time descending
        entries.sort((a, b) => b[1] - a[1]);
        const dayTotal = entries.reduce((sum, [, time]) => sum + time, 0);
        groupedData.push({
          date,
          entries,
          dayTotal
        });
      }
    }
  });

  return groupedData;
}

// Render grouped data by date
function renderGroupedByDate(groupedData) {
  if (groupedData.length === 0) {
    return '<div class="empty-state"><p>No data found</p></div>';
  }

  let html = '';

  groupedData.forEach(({ date, entries, dayTotal }) => {
    const maxTime = Math.max(...entries.map(([, time]) => time));
    
    html += `
      <div class="date-group">
        <div class="date-header">
          <span class="date-label">${formatDateLabel(date)}</span>
          <span class="date-total">${formatTime(dayTotal)}</span>
        </div>
        <div class="date-entries">
    `;

    entries.forEach(([domain, time]) => {
      const percentage = maxTime > 0 ? (time / maxTime) * 100 : 0;
      html += `
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
    });

    html += `
        </div>
      </div>
    `;
  });

  return html;
}

// Load and display time data
async function loadTimeData() {
  const result = await chrome.storage.local.get(['timeData']);
  const timeData = result.timeData || {};

  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const dateFilter = document.getElementById('dateSelect').value;

  // Populate date dropdown
  populateDateSelect(timeData);

  const timeList = document.getElementById('timeList');
  const isMultiDayView = ['week', 'month', 'all'].includes(dateFilter);

  if (isMultiDayView) {
    // Grouped view by date
    const groupedData = getGroupedDataByDate(timeData, dateFilter, searchTerm);
    
    // Calculate totals across all dates
    let totalSites = new Set();
    let totalTime = 0;
    groupedData.forEach(({ entries, dayTotal }) => {
      entries.forEach(([domain]) => totalSites.add(domain));
      totalTime += dayTotal;
    });

    document.getElementById('totalSites').textContent = totalSites.size;
    document.getElementById('totalTime').textContent = formatTime(totalTime);

    timeList.innerHTML = renderGroupedByDate(groupedData);
  } else {
    // Single day view (aggregated)
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
}

// Show clear modal
function showClearModal() {
  document.getElementById('clearModal').classList.remove('hidden');
}

// Hide clear modal
function hideClearModal() {
  document.getElementById('clearModal').classList.add('hidden');
}

// Show download modal
function showDownloadModal() {
  document.getElementById('downloadModal').classList.remove('hidden');
}

// Hide download modal
function hideDownloadModal() {
  document.getElementById('downloadModal').classList.add('hidden');
}

// Get data for export based on date range
async function getExportData(dateRange) {
  const result = await chrome.storage.local.get(['timeData']);
  const timeData = result.timeData || {};
  
  let datesToInclude = [];
  
  if (dateRange === 'today') {
    datesToInclude = [getTodayDate()];
  } else if (dateRange === 'yesterday') {
    datesToInclude = [getDateDaysAgo(1)];
  } else if (dateRange === 'week') {
    for (let i = 0; i < 7; i++) {
      datesToInclude.push(getDateDaysAgo(i));
    }
  } else if (dateRange === 'month') {
    for (let i = 0; i < 30; i++) {
      datesToInclude.push(getDateDaysAgo(i));
    }
  } else if (dateRange === 'all') {
    datesToInclude = getAvailableDates(timeData);
  }

  // Build export object with only selected dates
  const exportData = {
    exportedAt: new Date().toISOString(),
    dateRange: dateRange,
    data: {}
  };

  datesToInclude.forEach(date => {
    if (timeData[date]) {
      // Filter out excluded domains and convert ms to readable format
      const filteredData = {};
      Object.entries(timeData[date]).forEach(([domain, ms]) => {
        if (!isExcludedDomain(domain)) {
          filteredData[domain] = {
            milliseconds: ms,
            readable: formatTime(ms)
          };
        }
      });
      if (Object.keys(filteredData).length > 0) {
        exportData.data[date] = filteredData;
      }
    }
  });

  return exportData;
}

// Download data as JSON file
async function downloadData(dateRange) {
  const exportData = await getExportData(dateRange);
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const dateStr = getTodayDate();
  const filename = `timekeep-${dateRange}-${dateStr}.json`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  hideDownloadModal();
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
  document.getElementById('downloadBtn').addEventListener('click', showDownloadModal);
  document.getElementById('cancelDownload').addEventListener('click', hideDownloadModal);
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

  // Set up download option buttons
  document.querySelectorAll('.modal-btn[data-download]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dateRange = btn.getAttribute('data-download');
      downloadData(dateRange);
    });
  });

  // Close modals when clicking outside
  document.getElementById('clearModal').addEventListener('click', (e) => {
    if (e.target.id === 'clearModal') {
      hideClearModal();
    }
  });

  document.getElementById('downloadModal').addEventListener('click', (e) => {
    if (e.target.id === 'downloadModal') {
      hideDownloadModal();
    }
  });

  // Refresh data every 1 second while popup is open
  setInterval(loadTimeData, 1000);
});
