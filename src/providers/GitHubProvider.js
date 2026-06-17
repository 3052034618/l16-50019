const axios = require("axios");
const BaseProvider = require("./BaseProvider");

class GitHubProvider extends BaseProvider {
  constructor() {
    super("github");
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
    });
    return `${this.config.authorizeUrl}?${params.toString()}`;
  }

  async exchangeCode(code, codeVerifier, redirectUri) {
    const response = await axios.post(
      this.config.tokenUrl,
      {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      },
      {
        headers: { Accept: "application/json" },
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || null,
      expiresIn: response.data.expires_in,
      scope: response.data.scope,
      tokenType: response.data.token_type,
    };
  }

  async getUserInfo(accessToken) {
    const userRes = await axios.get(this.config.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let emails = [];
    try {
      const emailRes = await axios.get(this.config.userEmailUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      emails = emailRes.data;
    } catch (_) {}

    const primaryEmail = emails.find(
      (e) => e.primary && e.verified
    ) || emails.find((e) => e.verified) || emails[0];

    return {
      providerAccountId: String(userRes.data.id),
      email: primaryEmail ? primaryEmail.email : null,
      emailVerified: primaryEmail ? primaryEmail.verified : false,
      nickname: userRes.data.login,
      avatar: userRes.data.avatar_url,
      name: userRes.data.name,
      profile: userRes.data,
    };
  }

  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new Error("No refresh token available for GitHub");
    }

    const response = await axios.post(
      this.config.tokenUrl,
      {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      },
      {
        headers: { Accept: "application/json" },
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
      expiresIn: response.data.expires_in,
    };
  }
}

module.exports = GitHubProvider;
