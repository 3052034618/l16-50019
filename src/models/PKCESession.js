const { v4: uuidv4 } = require("uuid");
const { run, get } = require("../db/database");

async function createPKCESession(provider, redirectUri, codeVerifier, codeChallenge, state) {
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  run(
    `INSERT INTO pkce_sessions (id, state, code_verifier, code_challenge, code_challenge_method, provider, redirect_uri, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, state, codeVerifier, codeChallenge, "S256", provider, redirectUri, expiresAt]
  );
  return { state, codeChallenge, codeChallengeMethod: "S256" };
}

async function findPKCESession(state) {
  const row = get("SELECT * FROM pkce_sessions WHERE state = ?", [state]);
  if (!row) return null;
  return {
    id: row.id,
    state: row.state,
    codeVerifier: row.code_verifier,
    codeChallenge: row.code_challenge,
    codeChallengeMethod: row.code_challenge_method,
    provider: row.provider,
    redirectUri: row.redirect_uri,
    expiresAt: row.expires_at,
  };
}

async function deletePKCESession(state) {
  run("DELETE FROM pkce_sessions WHERE state = ?", [state]);
}

async function cleanExpiredSessions() {
  run("DELETE FROM pkce_sessions WHERE expires_at < datetime('now')");
}

module.exports = {
  createPKCESession,
  findPKCESession,
  deletePKCESession,
  cleanExpiredSessions,
};
