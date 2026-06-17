const { v4: uuidv4 } = require("uuid");
const { run, get, all } = require("../db/database");

async function createRefreshToken(userId, token, expiresAt) {
  const id = uuidv4();
  run(
    "INSERT INTO refresh_tokens (id, token, user_id, expires_at) VALUES (?, ?, ?, ?)",
    [id, token, userId, expiresAt]
  );
  return token;
}

async function findRefreshToken(token) {
  const row = get(
    "SELECT * FROM refresh_tokens WHERE token = ? AND is_revoked = 0",
    [token]
  );
  if (!row) return null;
  return {
    id: row.id,
    token: row.token,
    userId: row.user_id,
    expiresAt: row.expires_at,
    isRevoked: !!row.is_revoked,
  };
}

async function revokeRefreshToken(token) {
  run("UPDATE refresh_tokens SET is_revoked = 1 WHERE token = ?", [token]);
}

async function revokeAllUserRefreshTokens(userId) {
  run("UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?", [userId]);
}

module.exports = {
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
};
