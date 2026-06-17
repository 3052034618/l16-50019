const crypto = require("crypto");
const { PKCESession } = require("../models");

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateState() {
  return crypto.randomBytes(16).toString("hex");
}

async function createPKCESession(provider, redirectUri) {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  await PKCESession.createPKCESession(provider, redirectUri, codeVerifier, codeChallenge, state);

  return {
    state,
    codeChallenge,
    codeChallengeMethod: "S256",
  };
}

async function verifyPKCESession(state) {
  const session = await PKCESession.findPKCESession(state);

  if (!session) {
    throw new Error("Invalid PKCE session state");
  }

  if (new Date() > new Date(session.expiresAt)) {
    await PKCESession.deletePKCESession(state);
    throw new Error("PKCE session expired");
  }

  const codeVerifier = session.codeVerifier;
  const provider = session.provider;
  const redirectUri = session.redirectUri;

  await PKCESession.deletePKCESession(state);

  return { codeVerifier, provider, redirectUri };
}

module.exports = {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  createPKCESession,
  verifyPKCESession,
};
