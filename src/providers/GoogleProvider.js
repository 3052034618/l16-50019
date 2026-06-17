const axios = require("axios");
const BaseProvider = require("./BaseProvider");

class GoogleProvider extends BaseProvider {
  constructor() {
    super("google");
  }

  getAuthorizeUrl(state, codeChallenge, codeChallengeMethod, redirectUri) {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: this.config.scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
    });
    return `${this.config.authorizeUrl}?${params.toString()}`;
  }

  async exchangeCode(code, codeVerifier, redirectUri) {
    const response = await axios.post(this.config.tokenUrl, {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || null,
      idToken: response.data.id_token,
      expiresIn: response.data.expires_in,
      scope: response.data.scope,
      tokenType: response.data.token_type,
    };
  }

  async getUserInfo(accessToken) {
    const response = await axios.get(this.config.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = response.data;
    return {
      providerAccountId: String(data.sub),
      email: data.email || null,
      emailVerified: data.email_verified || false,
      nickname: data.name || data.given_name,
      avatar: data.picture,
      name: data.name,
      profile: data,
    };
  }

  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new Error("No refresh token available for Google");
    }

    const response = await axios.post(this.config.tokenUrl, {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
      expiresIn: response.data.expires_in,
    };
  }
}

module.exports = GoogleProvider;
