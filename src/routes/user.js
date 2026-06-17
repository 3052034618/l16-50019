const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { unbindOAuthAccount, getUserOAuthAccounts } = require("../services/authService");
const { User, OAuthAccount } = require("../models");
const { hashPassword } = require("../utils/token");

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findUserById(req.user.sub);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const oauthAccounts = await OAuthAccount.findOAuthByUserId(req.user.sub);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        registrationComplete: user.registrationComplete,
      },
      oauthAccounts: oauthAccounts.map((a) => ({
        id: a.id,
        provider: a.provider,
        providerAccountId: a.providerAccountId,
        scope: a.scope,
        createdAt: a.createdAt,
      })),
      hasPassword: !!user.password,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/oauth-accounts", authMiddleware, async (req, res) => {
  try {
    const accounts = await getUserOAuthAccounts(req.user.sub);
    res.json({ accounts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/oauth-accounts/:provider", authMiddleware, async (req, res) => {
  try {
    const { provider } = req.params;
    const result = await unbindOAuthAccount(req.user.sub, provider);
    res.json(result);
  } catch (error) {
    if (error.message.includes("Cannot unbind")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { nickname, avatar } = req.body;
    const updateData = {};
    if (nickname) updateData.nickname = nickname;
    if (avatar) updateData.avatar = avatar;

    const user = await User.updateUser(req.user.sub, updateData);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/set-password", authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const hashed = await hashPassword(password);
    await User.updateUser(req.user.sub, { password: hashed });

    res.json({ message: "Password set successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
