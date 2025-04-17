# Bug Report: Login isn't working

## Description
As i login the form breaks

## Steps to Reproduce
Try to login

## Expected Behavior
I should have logged in

## Actual Behavior
The website timed

## AI-Suggested Fix
The provided bug report is not specific to the code snippets shared, indicating a potential issue with the login mechanism. However, since the login functionality is not directly visible in the provided snippets, I will provide a generic fix that ensures error handling within the asynchronous actions that might interact with user authentication, such as token fetching, event creation, and task fetching. This should ensure any token or authentication-related issues are caught and handled gracefully, potentially resolving issues where the operation might time out or fail due to authentication problems.

### Changes Made

#### tokenManager.js
```diff
@@ -17,25 @@
try {
  const auth = await chrome.identity.getAuthToken({ 
    interactive: false,
    abortOnLoadForNonInteractive: true,
    timeoutMsForNonInteractive: 1000
  });
  if (auth) {
    this.token = auth;
    this.tokenExpiry = new Date((await chrome.identity.getProfileUserInfo()).expiresIn);
    return true;
  }
} catch (error) {
  this.logger.debug('Non-interactive auth failed:', error);
  return false;
}
@@ -31,41 @@
try {
  const auth = await chrome.identity.getAuthToken({ 
    interactive: true 
  });
  if (auth) {
    this.token = auth;
    this.tokenExpiry = new Date((await chrome.identity.getProfileUserInfo()).expiresIn);
    return this.token;
  }
  throw new Error('Failed to get auth token');
} catch (error) {
  this.logger.error('Login failed:', error);
  throw error;
}
```


#### background.js
```diff
@@ -255,258 @@
if (!token) {
  logger.error('Not authenticated. Please log in again.');
  sendResponse({ success: false, error: 'Not authenticated. Please log in again.' });
  return true;
}
```


---
*This bug report was automatically generated with AI-suggested fix.*
