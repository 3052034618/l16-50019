const axios = require("axios");
const config = require("../config");

class BaseProvider {
  constructor(name) {
    this.name = name;
    this.config = config.oauth[name];
  }

  getAuthorizeUrl(state, codeChallenge, codeChallengeMethod, redirectUri) {
    throw new Error("Method not implemented");
  }

  async exchangeCode(code, codeVerifier, redirectUri) {
    throw new Error("Method not implemented");
  }

  async getUserInfo(accessToken) {
    throw new Error("Method not implemented");
  }

  async refreshAccessToken(refreshToken) {
    throw new Error("Method not implemented");
  }
}

module.exports = BaseProvider;
