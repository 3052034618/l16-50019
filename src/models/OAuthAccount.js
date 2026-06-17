const { v4: uuidv4 } = require("uuid");
const { run, get, all } = require("../db/database");

function createOAuthRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiresAt: row.token_expires_at,
    scope: row.scope,
    providerProfile: row.provider_profile ? JSON.parse(row.provider_profile) : null,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findOAuthByProvider(provider, providerAccountId) {
  const row = get(
    "SELECT * FROM oauth_accounts WHERE provider = ? AND provider_account_id = ?",
    [provider, String(providerAccountId)]
  );
  return createOAuthRow(row);
}

async function findOAuthByUserId(userId) {
  const rows = all(
    "SELECT * FROM oauth_accounts WHERE user_id = ?",
    [userId]
  );
  return rows.map(createOAuthRow);
}

async function findOAuthById(id) {
  const row = get("SELECT * FROM oauth_accounts WHERE id = ?", [id]);
  return createOAuthRow(row);
}

async function createOAuth(data) {
  const id = uuidv4();
  run(
    `INSERT INTO oauth_accounts (id, provider, provider_account_id, user_id, access_token, refresh_token, token_expires_at, scope, provider_profile)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.provider,
      String(data.providerAccountId),
      data.userId,
      data.accessToken || null,
      data.refreshToken || null,
      data.tokenExpiresAt || null,
      data.scope || null,
      data.providerProfile ? JSON.stringify(data.providerProfile) : null,
    ]
  );
  return findOAuthById(id);
}

async function updateOAuth(id, data) {
  const fields = [];
  const values = [];

  if (data.accessToken !== undefined) { fields.push("access_token = ?"); values.push(data.accessToken); }
  if (data.refreshToken !== undefined) { fields.push("refresh_token = ?"); values.push(data.refreshToken); }
  if (data.tokenExpiresAt !== undefined) { fields.push("token_expires_at = ?"); values.push(data.tokenExpiresAt); }
  if (data.scope !== undefined) { fields.push("scope = ?"); values.push(data.scope); }
  if (data.providerProfile !== undefined) { fields.push("provider_profile = ?"); values.push(JSON.stringify(data.providerProfile)); }

  if (fields.length === 0) return findOAuthById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  run(`UPDATE oauth_accounts SET ${fields.join(", ")} WHERE id = ?`, values);
  return findOAuthById(id);
}

async function deleteOAuth(id) {
  run("DELETE FROM oauth_accounts WHERE id = ?", [id]);
}

async function deleteOAuthByUserAndProvider(userId, provider) {
  run("DELETE FROM oauth_accounts WHERE user_id = ? AND provider = ?", [userId, provider]);
}

async function transferOAuthAccounts(fromUserId, toUserId) {
  run("UPDATE oauth_accounts SET user_id = ? WHERE user_id = ?", [toUserId, fromUserId]);
}

async function countOAuthByUserId(userId) {
  const row = get("SELECT COUNT(*) as cnt FROM oauth_accounts WHERE user_id = ?", [userId]);
  return row ? row.cnt : 0;
}

module.exports = {
  findOAuthByProvider,
  findOAuthByUserId,
  findOAuthById,
  createOAuth,
  updateOAuth,
  deleteOAuth,
  deleteOAuthByUserAndProvider,
  transferOAuthAccounts,
  countOAuthByUserId,
};
