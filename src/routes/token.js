const express = require("express");
const router = express.Router();
const { refreshAccessToken, tryRefreshOAuthToken, handleOAuthTokenRefreshFailure } = require("../services/authService");
const { OAuthAccount } = require("../models");
const { authMiddleware } = require("../middleware/auth");

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    const result = await refreshAccessToken(refreshToken);
    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    if (error.message.includes("expired") || error.message.includes("Invalid")) {
      return res.status(401).json({ error: error.message, code: "REFRESH_TOKEN_INVALID" });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post("/oauth/refresh", authMiddleware, async (req, res) => {
  try {
    const { provider } = req.body;
    const currentUserId = req.user.sub;

    if (!provider) {
      return res.status(400).json({ error: "provider is required" });
    }

    const oauthAccounts = await OAuthAccount.findOAuthByUserId(currentUserId);
    const oauthAccount = oauthAccounts.find((a) => a.provider === provider);

    if (!oauthAccount) {
      return res.status(404).json({ error: "OAuth account not found" });
    }

    const result = await tryRefreshOAuthToken(oauthAccount.id);

    if (result.success) {
      res.json({
        success: true,
        message: "OAuth token refreshed successfully",
      });
    } else {
      await handleOAuthTokenRefreshFailure(currentUserId, provider);

      res.json({
        success: false,
        degraded: true,
        message: "OAuth token refresh failed, please use password login or re-authorize",
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
