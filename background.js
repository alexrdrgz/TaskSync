// Configuration for OAuth 2.0
const config = {
  clientId: '727538399732-dsfs266pvnii8hkafhf4d5v54q1gq9qe.apps.googleusercontent.com',
  scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks.readonly',
  redirectUri: `https://${chrome.runtime.id}.chromiumapp.org`
};
console.log('Redirect URI:', config.redirectUri);

let token = null;
let logger = console;

// Initialize configuration and logger
function init(cfg, log) {
  Object.assign(config, cfg);
  logger = log || console;
}

// Retrieve the last obtained token
function getLastToken() {
  return token;
}

// Login function to initiate OAuth 2.0 flow
function login(callback) {
  const authUrl = `https://accounts.google.com/o/oauth2/auth?response_type=token&client_id=${config.clientId}&scope=${config.scopes}&redirect_uri=${config.redirectUri}`;

  logger.debug('OAuth URL:', authUrl);

  chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, function (redirectUrl) {
    if (redirectUrl) {
      logger.debug('launchWebAuthFlow login successful:', redirectUrl);
      const parsed = parse(redirectUrl.substr(config.redirectUri.length + 1));
      token = parsed.access_token;
      logger.debug('Background login complete');
      callback(token);
    } else {
      logger.error("launchWebAuthFlow login failed. Check your redirect URI configuration.");
      callback(null);
    }
  });
}

// Function to add a task as a calendar event
function addTaskToCalendar(task, duration, callback) {
  if (!token) {
    logger.error('No valid token available. Please log in first.');
    return callback({ success: false, error: 'Not authenticated' });
  }

  // Check if the duration is within a reasonable range (e.g., up to 24 hours)
  if (duration < 0 || duration > 1440) {
    logger.error('Invalid duration for the event');
    return callback({ success: false, error: 'Invalid duration' });
  }

  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + duration * 60000); // Convert minutes to milliseconds

  // Check if startTime and endTime are valid
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    logger.error('Invalid start or end time for the event');
    return callback({ success: false, error: 'Invalid start or end time' });
  }

  const event = {
    summary: task.title,
    description: task.notes || 'Added from Google Tasks',
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  };

  fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      logger.error('Error creating event:', data.error);
      callback({ success: false, error: data.error.message });
    } else {
      logger.debug('Event created:', data);
      callback({ success: true, eventLink: data.htmlLink });
    }
  })
  .catch(error => {
    logger.error('Error creating event:', error);
    callback({ success: false, error: 'Failed to create event' });
  });
}

// New function to fetch tasks
function fetchTasks(callback) {
  if (!token) {
    logger.error('No valid token available. Please log in first.');
    return callback({ success: false, error: 'Not authenticated' });
  }

  fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      logger.error('Error fetching tasks:', data.error);
      callback({ success: false, error: data.error.message });
    } else {
      logger.debug('Tasks fetched:', data.items);
      callback({ success: true, tasks: data.items || [] });
    }
  })
  .catch(error => {
    logger.error('Error fetching tasks:', error);
    callback({ success: false, error: 'Failed to fetch tasks' });
  });
}

// Utility function to parse URL parameters
function parse(str) {
  if (typeof str !== 'string') return {};
  str = str.trim().replace(/^(\?|#|&)/, '');
  if (!str) return {};
  return str.split('&').reduce((ret, param) => {
    const parts = param.replace(/\+/g, ' ').split('=');
    const key = decodeURIComponent(parts.shift());
    const val = parts.length > 0 ? decodeURIComponent(parts.join('=')) : null;
    if (!ret.hasOwnProperty(key)) {
      ret[key] = val;
    } else if (Array.isArray(ret[key])) {
      ret[key].push(val);
    } else {
      ret[key] = [ret[key], val];
    }
    return ret;
  }, {});
}

// Initialize the extension
init({}, console);

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'login') {
    login(sendResponse);
    return true;  // Indicates we will send a response asynchronously
  } else if (request.action === 'getTasks') {
    if (token) {
      fetchTasks(sendResponse);
    } else {
      login((loginResult) => {
        if (loginResult) {
          fetchTasks(sendResponse);
        } else {
          sendResponse({ success: false, error: 'Login failed' });
        }
      });
    }
    return true;  // Indicates we will send a response asynchronously
  } else if (request.action === 'addToCalendar') {
    addTaskToCalendar(request.task, request.duration, sendResponse);
    return true;  // Indicates we will send a response asynchronously
  }
});


// Log that the service worker has loaded
logger.debug('Service worker loaded');