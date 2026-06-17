const axios = require("axios");
const BaseProvider = require("./BaseProvider");

class WeChatProvider extends BaseProvider {
  constructor() {
    super("wechat");
  }

  getAuthorizeUrl(state, codeChallenge, codeChallengeMethod, redirectUri) {
    const params = new URLSearchParams({
      appid: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.config.scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
    });
    return `${this.config.authorizeUrl}?${params.toString()}#wechat_redirect`;
  }

  async exchangeCode(code, codeVerifier, redirectUri) {
    const response = await axios.get(this.config.tokenUrl, {
      params: {
        appid: this.config.clientId,
        secret: this.config.clientSecret,
        code,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      },
    });

    if (response.data.errcode) {
      throw new Error(`WeChat error: ${response.data.errcode} - ${response.data.errmsg}`);
    }

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || null,
      openid: response.data.openid,
      unionid: response.data.unionid || null,
      expiresIn: response.data.expires_in,
      scope: response.data.scope,
    };
  }

  async getUserInfo(accessToken, openid) {
    const response = await axios.get(this.config.userInfoUrl, {
      params: {
        access_token: accessToken,
        openid,
        lang: "zh_CN",
      },
    });

    if (response.data.errcode) {
      throw new Error(`WeChat error: ${response.data.errcode} - ${response.data.errmsg}`);
    }

    return {
      providerAccountId: response.data.unionid || response.data.openid,
      email: null,
      emailVerified: false,
      nickname: response.data.nickname,
      avatar: response.data.headimgurl,
      name: response.data.nickname,
      profile: response.data,
    };
  }

  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new Error("No refresh token available for WeChat");
    }

    const response = await axios.get(this.config.refreshUrl, {
      params: {
        appid: this.config.clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      },
    });

    if (response.data.errcode) {
      throw new Error(`WeChat refresh error: ${response.data.errcode} - ${response.data.errmsg}`);
    }

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
      expiresIn: response.data.expires_in,
    };
  }
}

module.exports = WeChatProvider;
