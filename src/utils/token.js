const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const config = require("../config");
const { RefreshToken } = require("../models");

function generateAccessToken(user, extra = {}) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      nickname: user.nickname,
      ...extra,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.accessTokenExpiry }
  );
}

async function generateRefreshTokenRecord(userId) {
  const token = uuidv4();
  const expiresAt = new Date(
    Date.now() + parseExpiry(config.jwt.refreshTokenExpiry)
  ).toISOString();

  await RefreshToken.createRefreshToken(userId, token, expiresAt);
  return token;
}

async function verifyRefreshToken(token) {
  const record = await RefreshToken.findRefreshToken(token);

  if (!record) {
    throw new Error("Invalid refresh token");
  }

  if (new Date() > new Date(record.expiresAt)) {
    await RefreshToken.revokeRefreshToken(token);
    throw new Error("Refresh token expired");
  }

  return record;
}

async function revokeRefreshToken(token) {
  await RefreshToken.revokeRefreshToken(token);
}

async function revokeAllUserRefreshTokens(userId) {
  await RefreshToken.revokeAllUserRefreshTokens(userId);
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function parseExpiry(expiry) {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const num = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case "s": return num * 1000;
    case "m": return num * 60 * 1000;
    case "h": return num * 60 * 60 * 1000;
    case "d": return num * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshTokenRecord,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  hashPassword,
  comparePassword,
};
