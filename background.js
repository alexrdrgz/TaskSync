const CLIENT_ID = 'YOUR_CLIENT_ID';
const API_KEY = 'YOUR_API_KEY';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient;

function initializeGapiClient() {
  gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });
}

function initializeTokenClient() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // defined later
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.identity.getAuthToken({ interactive: true }, function(token) {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    // Token is available for use
    gapi.load('client', initializeGapiClient);
    gapi.load('auth2', initializeTokenClient);
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addToCalendar') {
    addTaskToCalendar(request.task, sendResponse);
    return true;  // Indicates we will send a response asynchronously
  }
});

function addTaskToCalendar(task, sendResponse) {
  chrome.identity.getAuthToken({ interactive: true }, function(token) {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      sendResponse({ success: false, error: 'Authentication failed' });
      return;
    }

    gapi.auth.setToken({
      access_token: token,
    });

    const event = {
      'summary': task.name,
      'description': 'Added from Google Tasks',
      'start': {
        'dateTime': task.dueDate ? new Date(task.dueDate).toISOString() : new Date().toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'end': {
        'dateTime': task.dueDate ? new Date(new Date(task.dueDate).getTime() + 60*60*1000).toISOString() : new Date(Date.now() + 60*60*1000).toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    gapi.client.calendar.events.insert({
      'calendarId': 'primary',
      'resource': event
    }).then(function(response) {
      console.log('Event created: ' + response.result.htmlLink);
      sendResponse({ success: true, eventLink: response.result.htmlLink });
    }, function(error) {
      console.error('Error creating event:', error);
      sendResponse({ success: false, error: 'Failed to create event' });
    });
  });
}