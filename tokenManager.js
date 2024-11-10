export class TokenManager {
    constructor(config, logger = console) {
      this.config = config;
      this.logger = logger;
      this.token = null;
      this.expiresAt = null;
      this.TOKEN_STORAGE_KEY = 'oauth_token_info';
    }
  
    async init() {
      try {
        const saved = await chrome.storage.local.get(this.TOKEN_STORAGE_KEY);
        if (saved[this.TOKEN_STORAGE_KEY]) {
          const { token, expiresAt } = saved[this.TOKEN_STORAGE_KEY];
          // Only restore if token isn't expired
          if (expiresAt && Date.now() < expiresAt) {
            this.token = token;
            this.expiresAt = expiresAt;
            return true;
          }
        }
      } catch (error) {
        this.logger.error('Error initializing token:', error);
      }
      return false;
    }
  
    async saveToken(token, expiresIn) {
      this.token = token;
      this.expiresAt = Date.now() + (expiresIn * 1000);
      
      try {
        await chrome.storage.local.set({
          [this.TOKEN_STORAGE_KEY]: {
            token: this.token,
            expiresAt: this.expiresAt
          }
        });
      } catch (error) {
        this.logger.error('Error saving token:', error);
      }
    }
  
    async getValidToken() {
      // If we have a valid token that's not close to expiring
      if (this.token && this.expiresAt && Date.now() < (this.expiresAt - 300000)) {
        return this.token;
      }
  
      // Otherwise, get a new token
      return this.refreshToken();
    }
  
    async refreshToken() {
      try {
        return new Promise((resolve, reject) => {
          const authUrl = `https://accounts.google.com/o/oauth2/auth?response_type=token&client_id=${this.config.clientId}&scope=${this.config.scopes}&redirect_uri=${this.config.redirectUri}`;
          
          chrome.identity.launchWebAuthFlow(
            { url: authUrl, interactive: false },
            async (redirectUrl) => {
              if (redirectUrl) {
                const parsed = this.parse(redirectUrl.substr(this.config.redirectUri.length + 1));
                // Get token info to get expiration
                const tokenInfo = await this.getTokenInfo(parsed.access_token);
                await this.saveToken(parsed.access_token, tokenInfo.expires_in);
                resolve(this.token);
              } else {
                // If silent refresh fails, try interactive login
                this.login().then(resolve).catch(reject);
              }
            }
          );
        });
      } catch (error) {
        this.logger.error('Error refreshing token:', error);
        throw error;
      }
    }
  
    async login() {
      return new Promise((resolve, reject) => {
        const authUrl = `https://accounts.google.com/o/oauth2/auth?response_type=token&client_id=${this.config.clientId}&scope=${this.config.scopes}&redirect_uri=${this.config.redirectUri}`;
  
        chrome.identity.launchWebAuthFlow(
          { url: authUrl, interactive: true },
          async (redirectUrl) => {
            if (redirectUrl) {
              const parsed = this.parse(redirectUrl.substr(this.config.redirectUri.length + 1));
              const tokenInfo = await this.getTokenInfo(parsed.access_token);
              await this.saveToken(parsed.access_token, tokenInfo.expires_in);
              resolve(this.token);
            } else {
              reject(new Error("Authentication failed"));
            }
          }
        );
      });
    }
  
    async getTokenInfo(token) {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
      if (!response.ok) {
        throw new Error('Failed to get token info');
      }
      return response.json();
    }
  
    parse(str) {
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
  }