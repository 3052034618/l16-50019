const GitHubProvider = require("./GitHubProvider");
const GoogleProvider = require("./GoogleProvider");
const WeChatProvider = require("./WeChatProvider");

const providers = {
  github: new GitHubProvider(),
  google: new GoogleProvider(),
  wechat: new WeChatProvider(),
};

function getProvider(name) {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown OAuth provider: ${name}`);
  }
  return provider;
}

function getSupportedProviders() {
  return Object.keys(providers);
}

module.exports = { getProvider, getSupportedProviders };
