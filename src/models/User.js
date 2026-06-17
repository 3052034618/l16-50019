const { v4: uuidv4 } = require("uuid");
const { run, get, all } = require("../db/database");

function createUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    password: row.password,
    nickname: row.nickname,
    avatar: row.avatar,
    registrationComplete: !!row.registration_complete,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findUserById(id) {
  const row = get("SELECT * FROM users WHERE id = ?", [id]);
  return createUserRow(row);
}

async function findUserByEmail(email) {
  const row = get("SELECT * FROM users WHERE email = ?", [email]);
  return createUserRow(row);
}

async function findUserByPhone(phone) {
  const row = get("SELECT * FROM users WHERE phone = ?", [phone]);
  return createUserRow(row);
}

async function findUserByEmailOrPhone(emailOrPhone) {
  const row = get(
    "SELECT * FROM users WHERE email = ? OR phone = ?",
    [emailOrPhone, emailOrPhone]
  );
  return createUserRow(row);
}

async function createUser(data) {
  const id = uuidv4();
  run(
    `INSERT INTO users (id, email, phone, password, nickname, avatar, registration_complete)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.email || null,
      data.phone || null,
      data.password || null,
      data.nickname || null,
      data.avatar || null,
      data.registrationComplete ? 1 : 0,
    ]
  );
  return findUserById(id);
}

async function updateUser(id, data) {
  const fields = [];
  const values = [];

  if (data.email !== undefined) { fields.push("email = ?"); values.push(data.email); }
  if (data.phone !== undefined) { fields.push("phone = ?"); values.push(data.phone); }
  if (data.password !== undefined) { fields.push("password = ?"); values.push(data.password); }
  if (data.nickname !== undefined) { fields.push("nickname = ?"); values.push(data.nickname); }
  if (data.avatar !== undefined) { fields.push("avatar = ?"); values.push(data.avatar); }
  if (data.registrationComplete !== undefined) {
    fields.push("registration_complete = ?");
    values.push(data.registrationComplete ? 1 : 0);
  }

  if (fields.length === 0) return findUserById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  run(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  return findUserById(id);
}

async function deleteUser(id) {
  run("DELETE FROM oauth_accounts WHERE user_id = ?", [id]);
  run("DELETE FROM refresh_tokens WHERE user_id = ?", [id]);
  run("DELETE FROM users WHERE id = ?", [id]);
}

module.exports = {
  findUserById,
  findUserByEmail,
  findUserByPhone,
  findUserByEmailOrPhone,
  createUser,
  updateUser,
  deleteUser,
};
