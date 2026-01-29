# TimeKeep

<p align="center">
  <img src="icons/template.svg" alt="TimeKeep Logo" width="128" height="128">
</p>

<p align="center">
  <strong>A browser extension that tracks the time you spend on websites</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#privacy">Privacy</a> •
  <a href="#development">Development</a>
</p>

---

## Features

- **Automatic Time Tracking** — Tracks active browsing time on each website automatically
- **Date-Based Analytics** — View statistics by Today, Yesterday, Last 7 Days, Last 30 Days, or All Time
- **Search** — Quickly find specific websites in your history
- **Visual Statistics** — Progress bars show relative time spent on each site
- **Persistent Storage** — Data is stored locally and persists across browser restarts
- **Flexible Data Management** — Clear data by specific time ranges (today, week, month, or all)
- **Real-Time Updates** — Stats refresh every second while popup is open
- **Modern UI** — Clean, gradient-based design with smooth animations

## Browser Support

| Browser | Status |
|---------|--------|
| Brave | Fully Supported |
| Chrome | Fully Supported |
| Edge | Fully Supported |
| Safari | Supported (requires conversion) |
| Firefox | Coming Soon |

## Installation

### Brave / Chrome / Edge (Chromium-based browsers)

1. Download or clone this repository
   ```bash
   git clone https://github.com/User-LazySloth/TimeKeep.git
   ```

2. Open your browser and navigate to the extensions page:
   - **Brave**: `brave://extensions/`
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`

3. Enable **Developer mode** (toggle in the top right corner)

4. Click **"Load unpacked"**

5. Select the `TimeKeep` folder

6. The extension icon will appear in your toolbar!

### Safari (macOS)

1. Install Xcode from the Mac App Store

2. Open Terminal and run:
   ```bash
   xcrun safari-web-extension-converter /path/to/TimeKeep --app-name TimeKeep
   ```

3. Open the generated Xcode project

4. Build and run (⌘ + R)

5. In Safari, go to **Preferences → Extensions** and enable TimeKeep

## Usage

### Viewing Your Stats

1. Click the **TimeKeep** icon in your browser toolbar
2. View your browsing statistics with time spent on each website
3. Use the **date filter** to view different time periods:
   - Today
   - Yesterday
   - Last 7 Days
   - Last 30 Days
   - All Time

### Searching

Type in the search box to filter websites by name.

### Clearing Data

1. Click the 🗑️ button
2. Choose what to clear:
   - **Today Only** — Clear only today's data
   - **Yesterday Only** — Clear only yesterday's data
   - **Last 7 Days** — Clear the past week
   - **Last 30 Days** — Clear the past month
   - **All Data** — Clear everything (with confirmation)

## Privacy

TimeKeep is designed with privacy in mind:

- **100% Local** — All data is stored locally on your device
- **No Servers** — No data is ever sent to external servers
- **No Analytics** — No usage tracking or telemetry
- **No Account Required** — Works completely offline
- **You Control Your Data** — Clear it anytime with one click

### What's NOT Tracked

- Browser internal pages (`chrome://`, `brave://`, `edge://`, etc.)
- New tab pages
- Extension pages
- Local files (`file://`)
- Time when browser is not in focus

## Development

### Project Structure

```
TimeKeep/
├── manifest.json      # Extension manifest (Manifest V3)
├── background.js      # Service worker for time tracking
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic and rendering
├── popup.css          # Styling
├── icons/             # Extension icons
│   ├── template.svg   # SVG template for icons
│   └── icon128.png    # Icon of 128x128 dimension
└── README.md          # This file
```

### How It Works

1. **Background Service Worker** (`background.js`)
   - Listens for tab changes and focus events
   - Tracks time spent on active tab
   - Saves data every 5 seconds to local storage
   - Stops tracking when browser loses focus

2. **Data Structure**
   ```javascript
   {
     "2026-01-29": {
       "github.com": 1234567,    // milliseconds
       "google.com": 987654
     },
     "2026-01-28": {
       "youtube.com": 3456789
     }
   }
   ```

3. **Popup Interface** (`popup.html/js/css`)
   - Reads from local storage
   - Aggregates data based on selected date range
   - Displays sorted list with visual progress bars
   - Refreshes every second for real-time updates

### Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## Roadmap

- [ ] Export data to CSV/JSON
- [ ] Daily/weekly email reports
- [ ] Set time limits with notifications
- [ ] Website categorization (Social, Work, Entertainment)
- [ ] Dark mode
- [ ] Firefox support
- [ ] Sync across devices (optional)
- [ ] Detailed charts and graphs

---

<p align="center">
  Made with ❤️ for productivity enthusiasts
</p>
