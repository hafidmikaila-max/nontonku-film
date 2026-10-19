const crypto = require("crypto");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Metode tidak diizinkan" });
  }

  const secret = process.env.ADMIN_SESSION_SECRET;
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)nontonku_admin=([^;]+)/);

  if (!secret || !match) {
    return res.status(401).json({ authenticated: false });
  }

  const parts = match[1].split(".");
  if (parts.length !== 2) {
    return res.status(401).json({ authenticated: false });
  }

  const [payload, signature] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ authenticated: false });
  }

  let session;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return res.status(401).json({ authenticated: false });
  }

  if (session.admin !== true || session.exp <= Math.floor(Date.now() / 1000)) {
    return res.status(401).json({ authenticated: false });
  }

  return res.status(200).json({ authenticated: true });
};
