# Tasks to Calendar Chrome Extension

A Chrome extension that automatically schedules your Google Tasks into your Google Calendar based on your work hours and existing calendar events.

## Features

- 🔄 Automatically converts Google Tasks into Calendar events
- ⏰ Smart scheduling that respects your work hours
- 🗓️ Conflict-free scheduling that works around existing calendar events
- ⚡ Quick duration selection (15m, 30m, 1h)
- 🎯 Finds the earliest available time slot for each task
- 🔒 Secure OAuth 2.0 authentication with Google

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Setup

1. Visit the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google Calendar API and Google Tasks API
4. Create OAuth 2.0 credentials
5. Add your OAuth client ID to the `config` object in `background.js`

## Usage

1. Click the extension icon in your Chrome toolbar
2. Log in with your Google account when prompted
3. View your Google Tasks in the popup window
4. For each task, select a duration (15m, 30m, or 1h)
5. The extension will automatically schedule the task in your calendar at the next available time slot

## Configuration

### Work Hours
Configure your work hours in the extension settings:
- Set work days (Monday-Friday by default)
- Set work start time
- Set work end time

The extension will only schedule tasks within these defined work hours.

## Technical Details

### Files Structure
```
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── styles.css
└── options.html
```

### APIs Used
- Chrome Extensions API
- Google Calendar API
- Google Tasks API
- Chrome Identity API

### Authentication
The extension uses OAuth 2.0 with the following scopes:
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/tasks.readonly`

### Scheduling Algorithm

The extension uses a sophisticated scheduling algorithm that:
1. Fetches your current calendar events
2. Identifies free time slots during work hours
3. Checks for conflicts with existing events
4. Finds the earliest available slot that fits the task duration
5. Creates a new calendar event in the identified slot

## Privacy and Permissions

The extension requires the following permissions:
- `identity`: For Google account authentication
- `storage`: For saving user preferences
- `https://www.googleapis.com/*`: For accessing Google APIs

## Development

### Building
No build process required - the extension can be loaded directly as unpacked.

### Testing
1. Load the extension in developer mode
2. Use Chrome DevTools to inspect the background service worker
3. Check the console for detailed logging of scheduling operations

### Debugging
Enable detailed logging by checking the console in:
1. The extension popup (right-click > Inspect)
2. The background service worker (chrome://extensions > Details > Service Worker)

## Known Limitations

- The extension only schedules in 15-minute increments
- All-day events are ignored in scheduling
- Events spanning multiple days are filtered out
- The extension must be reloaded to capture calendar changes made outside the extension

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For issues, questions, or contributions, please:
1. Check existing GitHub issues
2. Create a new issue if needed
3. Include extension logs when reporting problems

## Acknowledgments

- Google Calendar API
- Google Tasks API
- Material Design Lite for UI components