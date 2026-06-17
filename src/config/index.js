require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
    accessTokenExpiry: "2h",
    refreshTokenExpiry: "7d",
  },
  oauth: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      userInfoUrl: "https://api.github.com/user",
      userEmailUrl: "https://api.github.com/user/emails",
      scope: "read:user user:email",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
      scope: "openid email profile",
    },
    wechat: {
      clientId: process.env.WECHAT_APP_ID || "",
      clientSecret: process.env.WECHAT_APP_SECRET || "",
      authorizeUrl: "https://open.weixin.qq.com/connect/qrconnect",
      tokenUrl: "https://api.weixin.qq.com/sns/oauth2/access_token",
      refreshUrl: "https://api.weixin.qq.com/sns/oauth2/refresh_token",
      userInfoUrl: "https://api.weixin.qq.com/sns/userinfo",
      scope: "snsapi_login",
    },
  },
  database: {
    dialect: "sqlite",
    storage: process.env.DB_PATH || "./data/auth.db",
  },
  mail: {
    host: process.env.MAIL_HOST || "smtp.example.com",
    port: parseInt(process.env.MAIL_PORT || "587"),
    secure: process.env.MAIL_SECURE === "true",
    auth: {
      user: process.env.MAIL_USER || "",
      pass: process.env.MAIL_PASS || "",
    },
    from: process.env.MAIL_FROM || "noreply@example.com",
  },
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
};
