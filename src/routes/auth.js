const express = require("express");
const router = express.Router();
const { getProvider, getSupportedProviders } = require("../providers");
const { createPKCESession, verifyPKCESession } = require("../utils/pkce");
const { oauthLoginOrRegister, completeRegistration, bindOAuthAccount, passwordLogin } = require("../services/authService");
const { authMiddleware, registrationMiddleware } = require("../middleware/auth");
const config = require("../config");

router.get("/providers", (req, res) => {
  res.json({ providers: getSupportedProviders() });
});

router.get("/:provider", async (req, res) => {
  try {
    const { provider: providerName } = req.params;
    const provider = getProvider(providerName);

    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/${providerName}/callback`;
    const pkceSession = await createPKCESession(providerName, redirectUri);

    const authorizeUrl = provider.getAuthorizeUrl(
      pkceSession.state,
      pkceSession.codeChallenge,
      pkceSession.codeChallengeMethod,
      redirectUri
    );

    res.json({ authorizeUrl, state: pkceSession.state });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/:provider/callback", async (req, res) => {
  try {
    const { provider: providerName } = req.params;
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(`${config.clientUrl}/login?error=${encodeURIComponent(oauthError)}`);
    }

    if (!code || !state) {
      return res.redirect(`${config.clientUrl}/login?error=${encodeURIComponent("Missing code or state")}`);
    }

    const pkceData = await verifyPKCESession(state);
    if (pkceData.provider !== providerName) {
      return res.redirect(`${config.clientUrl}/login?error=${encodeURIComponent("Provider mismatch")}`);
    }

    const result = await oauthLoginOrRegister(
      providerName,
      code,
      pkceData.codeVerifier,
      pkceData.redirectUri
    );

    switch (result.status) {
      case "logged_in":
      case "merged":
      case "registered":
        return res.redirect(
          `${config.clientUrl}/auth/callback?` +
          `access_token=${encodeURIComponent(result.accessToken)}&` +
          `refresh_token=${encodeURIComponent(result.refreshToken)}&` +
          `status=${result.status}`
        );

      case "registration_incomplete":
        return res.redirect(
          `${config.clientUrl}/auth/complete-registration?` +
          `temp_token=${encodeURIComponent(result.tempToken)}&` +
          `user_id=${encodeURIComponent(result.userId)}`
        );

      default:
        return res.redirect(`${config.clientUrl}/login?error=unknown_status`);
    }
  } catch (error) {
    console.error("OAuth callback error:", error);
    return res.redirect(
      `${config.clientUrl}/login?error=${encodeURIComponent(error.message)}`
    );
  }
});

router.post("/complete-registration", registrationMiddleware, async (req, res) => {
  try {
    const { email, phone, password, nickname } = req.body;

    const result = await completeRegistration(req.user.sub, email, phone, password, nickname);

    res.json({
      status: result.status,
      user: {
        id: result.user.id,
        email: result.user.email,
        phone: result.user.phone,
        nickname: result.user.nickname,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/:provider/bind", authMiddleware, async (req, res) => {
  try {
    const { provider: providerName } = req.params;
    const { code, state } = req.body;
    const userId = req.user.sub;

    const pkceData = await verifyPKCESession(state);
    if (pkceData.provider !== providerName) {
      return res.status(400).json({ error: "Provider mismatch" });
    }

    const result = await bindOAuthAccount(userId, providerName, code, pkceData.codeVerifier, pkceData.redirectUri);

    const response = { status: result.status };
    if (result.status === "merged") {
      response.accessToken = result.accessToken;
      response.refreshToken = result.refreshToken;
      response.targetUser = {
        id: result.targetUser.id,
        email: result.targetUser.email,
        phone: result.targetUser.phone,
        nickname: result.targetUser.nickname,
      };
    }
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ error: "Email/phone and password are required" });
    }

    const result = await passwordLogin(emailOrPhone, password);

    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        phone: result.user.phone,
        nickname: result.user.nickname,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

module.exports = router;
