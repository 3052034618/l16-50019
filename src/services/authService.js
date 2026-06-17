const { User, OAuthAccount } = require("../models");
const {
  generateAccessToken,
  generateRefreshTokenRecord,
  hashPassword,
  comparePassword,
} = require("../utils/token");
const { getProvider } = require("../providers");

async function oauthLoginOrRegister(providerName, code, codeVerifier, redirectUri) {
  const provider = getProvider(providerName);
  const tokenData = await provider.exchangeCode(code, codeVerifier, redirectUri);

  let userInfo;
  if (providerName === "wechat" && tokenData.openid) {
    userInfo = await provider.getUserInfo(tokenData.accessToken, tokenData.openid);
  } else {
    userInfo = await provider.getUserInfo(tokenData.accessToken);
  }

  const existingOAuth = await OAuthAccount.findOAuthByProvider(
    providerName,
    userInfo.providerAccountId
  );

  if (existingOAuth) {
    await OAuthAccount.updateOAuth(existingOAuth.id, {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      tokenExpiresAt: tokenData.expiresIn
        ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
        : null,
      scope: tokenData.scope,
      providerProfile: userInfo.profile,
    });

    const user = await User.findUserById(existingOAuth.userId);
    if (!user.registrationComplete) {
      return {
        status: "registration_incomplete",
        userId: user.id,
        tempToken: generateAccessToken(user, { purpose: "complete_registration" }),
      };
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshTokenRecord(user.id);

    return {
      status: "logged_in",
      user,
      accessToken,
      refreshToken,
    };
  }

  if (userInfo.email) {
    const existingUser = await User.findUserByEmail(userInfo.email);

    if (existingUser) {
      await OAuthAccount.createOAuth({
        provider: providerName,
        providerAccountId: userInfo.providerAccountId,
        userId: existingUser.id,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiresAt: tokenData.expiresIn
          ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
          : null,
        scope: tokenData.scope,
        providerProfile: userInfo.profile,
      });

      if (!existingUser.registrationComplete) {
        return {
          status: "registration_incomplete",
          userId: existingUser.id,
          tempToken: generateAccessToken(existingUser, { purpose: "complete_registration" }),
        };
      }

      const accessToken = generateAccessToken(existingUser);
      const refreshToken = await generateRefreshTokenRecord(existingUser.id);

      return {
        status: "merged",
        user: existingUser,
        accessToken,
        refreshToken,
      };
    }
  }

  const newUser = await User.createUser({
    email: userInfo.email || null,
    nickname: userInfo.nickname || userInfo.name,
    avatar: userInfo.avatar,
    registrationComplete: false,
  });

  await OAuthAccount.createOAuth({
    provider: providerName,
    providerAccountId: userInfo.providerAccountId,
    userId: newUser.id,
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    tokenExpiresAt: tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
      : null,
    scope: tokenData.scope,
    providerProfile: userInfo.profile,
  });

  if (!newUser.registrationComplete) {
    return {
      status: "registration_incomplete",
      userId: newUser.id,
      tempToken: generateAccessToken(newUser, { purpose: "complete_registration" }),
    };
  }

  const accessToken = generateAccessToken(newUser);
  const refreshToken = await generateRefreshTokenRecord(newUser.id);

  return {
    status: "registered",
    user: newUser,
    accessToken,
    refreshToken,
  };
}

async function completeRegistration(userId, email, phone, password, nickname) {
  const user = await User.findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.registrationComplete) {
    throw new Error("Registration already complete");
  }

  if (!email && !phone) {
    throw new Error("At least email or phone is required");
  }

  if (email) {
    const existingUser = await User.findUserByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      await OAuthAccount.transferOAuthAccounts(userId, existingUser.id);
      await User.deleteUser(userId);

      const updateData = { registrationComplete: true };
      if (!existingUser.nickname && nickname) updateData.nickname = nickname;
      if (!existingUser.avatar && user.avatar) updateData.avatar = user.avatar;
      const updated = await User.updateUser(existingUser.id, updateData);

      const accessToken = generateAccessToken(updated);
      const refreshToken = await generateRefreshTokenRecord(updated.id);

      return {
        status: "merged",
        user: updated,
        accessToken,
        refreshToken,
      };
    }
  }

  if (phone) {
    const existingPhone = await User.findUserByPhone(phone);
    if (existingPhone && existingPhone.id !== userId) {
      await OAuthAccount.transferOAuthAccounts(userId, existingPhone.id);
      await User.deleteUser(userId);

      const updateData = { registrationComplete: true };
      if (!existingPhone.nickname && nickname) updateData.nickname = nickname;
      if (!existingPhone.avatar && user.avatar) updateData.avatar = user.avatar;
      const updated = await User.updateUser(existingPhone.id, updateData);

      const accessToken = generateAccessToken(updated);
      const refreshToken = await generateRefreshTokenRecord(updated.id);

      return {
        status: "merged",
        user: updated,
        accessToken,
        refreshToken,
      };
    }
  }

  const updateData = { registrationComplete: true };
  if (email) updateData.email = email;
  if (phone) updateData.phone = phone;
  if (nickname) updateData.nickname = nickname;
  if (password) updateData.password = await hashPassword(password);

  const updated = await User.updateUser(userId, updateData);

  const accessToken = generateAccessToken(updated);
  const refreshToken = await generateRefreshTokenRecord(updated.id);

  return {
    status: "registered",
    user: updated,
    accessToken,
    refreshToken,
  };
}

async function bindOAuthAccount(userId, providerName, code, codeVerifier, redirectUri) {
  const provider = getProvider(providerName);
  const tokenData = await provider.exchangeCode(code, codeVerifier, redirectUri);

  let userInfo;
  if (providerName === "wechat" && tokenData.openid) {
    userInfo = await provider.getUserInfo(tokenData.accessToken, tokenData.openid);
  } else {
    userInfo = await provider.getUserInfo(tokenData.accessToken);
  }

  const existingBind = await OAuthAccount.findOAuthByProvider(
    providerName,
    userInfo.providerAccountId
  );

  if (existingBind) {
    if (existingBind.userId === userId) {
      throw new Error("This account is already bound to your profile");
    }
    throw new Error("This third-party account is already bound to another user");
  }

  if (userInfo.email) {
    const existingUser = await User.findUserByEmail(userInfo.email);
    if (existingUser && existingUser.id !== userId) {
      await OAuthAccount.transferOAuthAccounts(userId, existingUser.id);

      await OAuthAccount.createOAuth({
        provider: providerName,
        providerAccountId: userInfo.providerAccountId,
        userId: existingUser.id,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiresAt: tokenData.expiresIn
          ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
          : null,
        scope: tokenData.scope,
        providerProfile: userInfo.profile,
      });

      await User.deleteUser(userId);

      const accessToken = generateAccessToken(existingUser);
      const refreshToken = await generateRefreshTokenRecord(existingUser.id);

      return {
        status: "merged",
        targetUser: existingUser,
        accessToken,
        refreshToken,
      };
    }
  }

  await OAuthAccount.createOAuth({
    provider: providerName,
    providerAccountId: userInfo.providerAccountId,
    userId,
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    tokenExpiresAt: tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
      : null,
    scope: tokenData.scope,
    providerProfile: userInfo.profile,
  });

  return { status: "bound" };
}

async function unbindOAuthAccount(userId, providerName) {
  const user = await User.findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const oauthAccounts = await OAuthAccount.findOAuthByUserId(userId);
  const totalBindings = oauthAccounts.length;
  const hasPassword = !!user.password;

  if (totalBindings <= 1 && !hasPassword) {
    throw new Error("Cannot unbind the last login method. Please set a password first.");
  }

  const targetAccount = oauthAccounts.find((a) => a.provider === providerName);
  if (!targetAccount) {
    throw new Error(`No ${providerName} account bound to your profile`);
  }

  await OAuthAccount.deleteOAuthByUserAndProvider(userId, providerName);
  return { status: "unbound", provider: providerName };
}

async function getUserOAuthAccounts(userId) {
  const accounts = await OAuthAccount.findOAuthByUserId(userId);
  return accounts.map((a) => ({
    id: a.id,
    provider: a.provider,
    providerAccountId: a.providerAccountId,
    scope: a.scope,
    createdAt: a.createdAt,
  }));
}

async function passwordLogin(emailOrPhone, password) {
  const user = await User.findUserByEmailOrPhone(emailOrPhone);

  if (!user || !user.password) {
    throw new Error("Invalid credentials");
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshTokenRecord(user.id);

  return { user, accessToken, refreshToken };
}

async function refreshAccessToken(oldRefreshToken) {
  const { verifyRefreshToken } = require("../utils/token");
  const record = await verifyRefreshToken(oldRefreshToken);

  const user = await User.findUserById(record.userId);
  if (!user || !user.isActive) {
    throw new Error("User not found or inactive");
  }

  await require("../models/RefreshToken").revokeRefreshToken(oldRefreshToken);

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshTokenRecord(user.id);

  return { user, accessToken, refreshToken };
}

async function tryRefreshOAuthToken(oauthAccountId) {
  const oauthAccount = await OAuthAccount.findOAuthById(oauthAccountId);
  if (!oauthAccount) {
    return { success: false, error: "OAuth account not found" };
  }

  try {
    const provider = getProvider(oauthAccount.provider);
    const newTokens = await provider.refreshAccessToken(oauthAccount.refreshToken);

    await OAuthAccount.updateOAuth(oauthAccount.id, {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      tokenExpiresAt: newTokens.expiresIn
        ? new Date(Date.now() + newTokens.expiresIn * 1000).toISOString()
        : null,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleOAuthTokenRefreshFailure(userId, providerName) {
  const user = await User.findUserById(userId);
  if (!user) return;

  const { sendReauthorizationEmail } = require("../services/emailService");
  await sendReauthorizationEmail(user, providerName);

  if (!user.password) {
    const tempPassword = require("crypto").randomBytes(12).toString("base64url");
    await User.updateUser(userId, { password: await hashPassword(tempPassword) });
    return { degraded: true, tempPassword };
  }

  return { degraded: true };
}

module.exports = {
  oauthLoginOrRegister,
  completeRegistration,
  bindOAuthAccount,
  unbindOAuthAccount,
  getUserOAuthAccounts,
  passwordLogin,
  refreshAccessToken,
  tryRefreshOAuthToken,
  handleOAuthTokenRefreshFailure,
};
