// Example configuration - rename to config.js and add your credentials
export const config = {
  clientId: 'YOUR_CLIENT_ID_HERE',
  scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks',
  redirectUri: `https://${chrome.runtime.id}.chromiumapp.org`
}; 