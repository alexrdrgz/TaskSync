export class TokenManager {
    constructor(config, logger) {
      this.config = config;
      this.logger = logger;
      this.token = null;
      this.tokenExpiry = null;
    }
  
    async init() {
      try {
        const auth = await chrome.identity.getAuthToken({ 
          interactive: false,
          abortOnLoadForNonInteractive: true,
          timeoutMsForNonInteractive: 1000
        });
        if (auth && auth.token) {
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
        }
        throw new Error('Failed to get auth token');
      } catch (error) {
        this.logger.error('Login failed:', error);
        throw error;
      }
    }
  
    async getValidToken() {
      if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
        return this.token;
      }
  
      try {
        await this.init();
        if (this.token) {
          return this.token;
        }
        return await this.login();
      } catch (error) {
        this.logger.error('Failed to get valid token:', error);
        throw error;
      }
    }
  }