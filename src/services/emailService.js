const nodemailer = require("nodemailer");
const config = require("../config");

const transporter = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  secure: config.mail.secure,
  auth: config.mail.auth,
});

async function sendReauthorizationEmail(user, providerName) {
  const providerLabels = {
    github: "GitHub",
    google: "Google",
    wechat: "微信",
  };

  const label = providerLabels[providerName] || providerName;

  const mailOptions = {
    from: config.mail.from,
    to: user.email,
    subject: `【安全提醒】您的${label}授权已过期，请重新授权`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">⚠️ 第三方授权过期提醒</h2>
        <p>您好，${user.nickname || "用户"}：</p>
        <p>您绑定的 <strong>${label}</strong> 账号授权已过期，且刷新Token失败。</p>
        <p>为了您的账号安全，系统已自动降级为密码登录模式。</p>
        <p>如需继续使用${label}快捷登录，请前往个人中心重新授权绑定。</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
      </div>
    `,
  };

  if (!config.mail.auth.user) {
    console.log(`[Mail] Would send reauthorization email to ${user.email} for ${label}`);
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`Failed to send reauthorization email: ${error.message}`);
  }
}

module.exports = { sendReauthorizationEmail };
