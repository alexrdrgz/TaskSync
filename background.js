// Configuration for OAuth 2.0
const config = {
  clientId: '727538399732-dsfs266pvnii8hkafhf4d5v54q1gq9qe.apps.googleusercontent.com',
  scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks.readonly',
  redirectUri: `https://${chrome.runtime.id}.chromiumapp.org`
};
console.log('Redirect URI:', config.redirectUri);

let token = null;
let logger = console;
let scheduledEvents = [];

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

function getNextAvailableTime(duration) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['workDays', 'workStartTime', 'workEndTime'], function(result) {
      const now = new Date();
      const startTime = parseTime(result.workStartTime || '09:00');
      const endTime = parseTime(result.workEndTime || '17:30');
      const workDays = result.workDays || [false, true, true, true, true, false, false]; // Mon-Fri by default

      console.log('Scheduling task. Current time:', now);
      console.log('Work settings:', { workDays, startTime, endTime });
      console.log('Scheduled events:', scheduledEvents.length);

      let currentTime = new Date(now);

      function isWorkDay(date) {
        return workDays[date.getDay()];
      }

      function isWithinWorkHours(date) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        return (hours > startTime.hours || (hours === startTime.hours && minutes >= startTime.minutes)) &&
               (hours < endTime.hours || (hours === endTime.hours && minutes < endTime.minutes));
      }

      function adjustToWorkHours(date) {
        if (date.getHours() < startTime.hours || (date.getHours() === startTime.hours && date.getMinutes() < startTime.minutes)) {
          date.setHours(startTime.hours, startTime.minutes, 0, 0);
        } else if (date.getHours() >= endTime.hours) {
          date.setDate(date.getDate() + 1);
          date.setHours(startTime.hours, startTime.minutes, 0, 0);
        }
        return date;
      }

      // Also modify the conflict check to be more lenient
function findNextAvailableSlot() {
  let attempts = 0;
  while (attempts < 7 * 24 * 4) {
    if (!isWorkDay(currentTime)) {
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(startTime.hours, startTime.minutes, 0, 0);
      continue;
    }

    currentTime = adjustToWorkHours(currentTime);

    if (!isWithinWorkHours(currentTime)) {
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(startTime.hours, startTime.minutes, 0, 0);
      continue;
    }

    const endTime = new Date(currentTime.getTime() + duration * 60000);

    // Modified conflict check to be more specific
    const conflict = scheduledEvents.find(event => {
      const eventStart = event.start;
      const eventEnd = event.end;
      
      // Only consider conflicts within the same day
      if (eventStart.getDate() !== currentTime.getDate()) {
        return false;
      }

      return (currentTime >= eventStart && currentTime < eventEnd) ||
             (endTime > eventStart && endTime <= eventEnd) ||
             (currentTime <= eventStart && endTime >= eventEnd);
    });

    if (!conflict && isWithinWorkHours(endTime)) {
      console.log('Available slot found:', {
        start: currentTime.toLocaleString(),
        end: endTime.toLocaleString()
      });
      return currentTime;
    }

    if (conflict) {
      console.log('Conflict found:', {
        attemptedSlot: {
          start: currentTime.toLocaleString(),
          end: endTime.toLocaleString()
        },
        conflictingEvent: {
          summary: conflict.summary,
          start: conflict.start.toLocaleString(),
          end: conflict.end.toLocaleString()
        }
      });
      // Move to 15 minutes after conflict ends instead of to the end
      currentTime = new Date(conflict.end.getTime() + 15 * 60000);
    } else {
      currentTime.setTime(currentTime.getTime() + 15 * 60000);
    }

    attempts++;
  }

  return null;
}

      const availableTime = findNextAvailableSlot();
      if (availableTime) {
        resolve(availableTime);
      } else {
        reject(new Error('No available time slot found within a week'));
      }
    });
  });
}

function parseTime(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
}

function addTaskToCalendar(task, duration, callback) {
  if (!token) {
    logger.error('No valid token available. Please log in first.');
    return callback({ success: false, error: 'Not authenticated' });
  }

  console.log('Attempting to schedule task:', task.title, 'Duration:', duration, 'minutes');
  console.log('Local timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

  // First refresh the calendar events
  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${oneWeekLater.toISOString()}&singleEvents=true&orderBy=startTime`;

  // Fetch latest calendar events before scheduling
  fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      throw new Error('Error fetching events: ' + data.error.message);
    }
    
    // Update scheduledEvents with latest calendar data
    scheduledEvents = data.items
      .filter(event => {
        // Only include events with specific times (not all-day events)
        if (!event.start.dateTime || !event.end.dateTime) {
          return false;
        }

        const startTime = new Date(event.start.dateTime);
        const endTime = new Date(event.end.dateTime);
        const durationHours = (endTime - startTime) / (1000 * 60 * 60);

        // Filter out suspicious 24-hour events
        if (durationHours >= 24) {
          return false;
        }

        return true;
      })
      .map(event => ({
        summary: event.summary,
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime)
      }));

    console.log('Updated calendar events before scheduling:', scheduledEvents);
    
    // Now proceed with finding next available time and scheduling
    return getNextAvailableTime(duration);
  })
  .then((startTime) => {
    const endTime = new Date(startTime.getTime() + duration * 60000);

    console.log('Scheduled time found:', { startTime, endTime });

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

    return fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      logger.error('Error creating event:', data.error);
      callback({ success: false, error: data.error.message });
    } else {
      logger.debug('Event created:', data);
      scheduledEvents.push({ 
        summary: data.summary,
        start: new Date(data.start.dateTime), 
        end: new Date(data.end.dateTime) 
      });
      console.log('Updated scheduled events. Total events:', scheduledEvents.length);
      callback({ success: true, eventLink: data.htmlLink });
    }
  })
  .catch(error => {
    logger.error('Error in scheduling process:', error);
    callback({ success: false, error: error.message || 'Failed to schedule event' });
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

// Initialize scheduledEvents with existing calendar events
function initializeScheduledEvents() {
  if (!token) {
    logger.error('No valid token available. Please log in first.');
    return;
  }

  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${oneWeekLater.toISOString()}&singleEvents=true&orderBy=startTime`;

  fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      logger.error('Error fetching events:', data.error);
    } else {
      // Log raw events before filtering
      console.log('All fetched events:', data.items);
      
      scheduledEvents = data.items
        .filter(event => {
          // Only include events with specific times (not all-day events)
          if (!event.start.dateTime || !event.end.dateTime) {
            console.log('Filtered out all-day event:', event);
            return false;
          }

          const startTime = new Date(event.start.dateTime);
          const endTime = new Date(event.end.dateTime);
          const durationHours = (endTime - startTime) / (1000 * 60 * 60);

          // Filter out suspicious 24-hour events
          if (durationHours >= 24) {
            console.log('Filtered out 24-hour event:', event);
            return false;
          }

          // Filter out events without summary/title
          if (!event.summary) {
            console.log('Filtered out untitled event:', event);
            return false;
          }

          return true;
        })
        .map(event => ({
          summary: event.summary,
          start: new Date(event.start.dateTime),
          end: new Date(event.end.dateTime)
        }));

      console.log('Final filtered events:', scheduledEvents.map(event => ({
        summary: event.summary,
        start: event.start.toLocaleString(),
        end: event.end.toLocaleString(),
        duration: (event.end - event.start) / (1000 * 60) + ' minutes'
      })));
    }
  })
  .catch(error => {
    logger.error('Error fetching events:', error);
  });
}

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

// Initialize scheduledEvents with existing calendar events
function initializeScheduledEvents() {
  if (!token) {
    logger.error('No valid token available. Please log in first.');
    return;
  }

  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${oneWeekLater.toISOString()}&singleEvents=true&orderBy=startTime`;

  fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      logger.error('Error fetching events:', data.error);
    } else {
      scheduledEvents = data.items.map(event => ({
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date)
      }));
      console.log('Initialized scheduled events:', scheduledEvents);
    }
  })
  .catch(error => {
    logger.error('Error fetching events:', error);
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'login') {
    login((loginResult) => {
      if (loginResult) {
        initializeScheduledEvents();
      }
      sendResponse(loginResult);
    });
    return true;  // Indicates we will send a response asynchronously
  } else if (request.action === 'getTasks') {
    if (token) {
      fetchTasks(sendResponse);
    } else {
      login((loginResult) => {
        if (loginResult) {
          initializeScheduledEvents();
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

// Initialize the extension
init({}, console);

// Log that the service worker has loaded
logger.debug('Service worker loaded');