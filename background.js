import { config } from './config.js';
import { TokenManager } from './tokenManager.js';

let logger = console;
let scheduledEvents = [];

const tokenManager = new TokenManager(config, logger);

function parseTime(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
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

          const conflict = scheduledEvents.find(event => {
            const eventStart = event.start;
            const eventEnd = event.end;
            
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

async function addTaskToCalendar(task, duration, callback) {
  try {
    const token = await tokenManager.getValidToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    console.log('Attempting to schedule task:', task.title, 'Duration:', duration, 'minutes');
    console.log('Local timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${oneWeekLater.toISOString()}&singleEvents=true&orderBy=startTime`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();

    if (data.error) {
      throw new Error('Error fetching events: ' + data.error.message);
    }

    scheduledEvents = data.items
      .filter(event => {
        if (!event.start.dateTime || !event.end.dateTime) {
          return false;
        }

        const startTime = new Date(event.start.dateTime);
        const endTime = new Date(event.end.dateTime);
        const durationHours = (endTime - startTime) / (1000 * 60 * 60);

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
    
    const startTime = await getNextAvailableTime(duration);
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

    const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    const createdEvent = await createResponse.json();

    if (createdEvent.error) {
      throw new Error(createdEvent.error.message);
    }

    scheduledEvents.push({ 
      summary: createdEvent.summary,
      start: new Date(createdEvent.start.dateTime), 
      end: new Date(createdEvent.end.dateTime) 
    });

    console.log('Updated scheduled events. Total events:', scheduledEvents.length);
    callback({ 
      success: true, 
      eventLink: createdEvent.htmlLink,
      eventStart: createdEvent.start.dateTime,
      eventEnd: createdEvent.end.dateTime
    });

  } catch (error) {
    logger.error('Error in scheduling process:', error);
    callback({ success: false, error: error.message || 'Failed to schedule event' });
  }
}

async function fetchTasks(callback) {
  try {
    const token = await tokenManager.getValidToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    // Map the tasks to include the id and status
    const tasks = (data.items || []).map(task => ({
      id: task.id,
      title: task.title,
      notes: task.notes,
      category: task.category || 'other',
      status: task.status,
      completed: task.completed
    }));
    
    callback({ success: true, tasks: tasks });
  } catch (error) {
    logger.error('Error fetching tasks:', error);
    callback({ success: false, error: error.message });
  }
}

async function createTask(task, callback) {
  try {
    const token = await tokenManager.getValidToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: task.title,
        notes: task.notes
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    callback({ success: true, task: data });
  } catch (error) {
    logger.error('Error creating task:', error);
    callback({ success: false, error: error.message });
  }
}

async function initializeScheduledEvents() {
  try {
    const token = await tokenManager.getValidToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${oneWeekLater.toISOString()}&singleEvents=true&orderBy=startTime`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();

    if (data.error) {
      throw new Error('Error fetching events: ' + data.error.message);
    }

    console.log('All fetched events:', data.items);
    
    scheduledEvents = data.items
      .filter(event => {
        if (!event.start.dateTime || !event.end.dateTime) {
          console.log('Filtered out all-day event:', event);
          return false;
        }

        const startTime = new Date(event.start.dateTime);
        const endTime = new Date(event.end.dateTime);
        const durationHours = (endTime - startTime) / (1000 * 60 * 60);

        if (durationHours >= 24) {
          console.log('Filtered out 24-hour event:', event);
          return false;
        }

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

  } catch (error) { }
}

async function completeTask(taskId, callback) {
  try {
    const token = await tokenManager.getValidToken();
    if (!token) {
      callback({ success: false, error: 'Not authenticated. Please log in again.' });
      return;
    }

    const url = `https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'completed',
        completed: new Date().toISOString()
      })
    });

    if (response.status === 200) {
      callback({ success: true });
    } else {
      const data = await response.json();
      callback({ 
        success: false, 
        error: data.error?.message || 'Failed to complete task. Please try again.' 
      });
    }
  } catch (error) {
    callback({ 
      success: false, 
      error: 'Network error. Please check your connection and try again.' 
    });
  }
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'login') {
    tokenManager.login()
      .then((token) => {
        initializeScheduledEvents();
        sendResponse(token);
      })
      .catch((error) => {
        logger.error('Login error:', error);
        sendResponse(null);
      });
    return true;
  } else if (request.action === 'getTasks') {
    fetchTasks(sendResponse);
    return true;
  } else if (request.action === 'addToCalendar') {
    addTaskToCalendar(request.task, request.duration, sendResponse);
    return true;
  } else if (request.action === 'addTask') {
    createTask(request.task, sendResponse);
    return true;
  } else if (request.action === 'completeTask') {
    completeTask(request.taskId, sendResponse);
    return true;
  }
});

// Initialize configuration and logger
function init(cfg, log) {
  Object.assign(config, cfg);
  logger = log || console;
  tokenManager.init().then(() => {
    if (tokenManager.token) {
      initializeScheduledEvents();
    }
  });
}

// Initialize the extension
init({}, console);

// Log that the service worker has loaded
logger.debug('Service worker loaded');