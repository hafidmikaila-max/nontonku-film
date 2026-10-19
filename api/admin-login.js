const crypto = require("crypto");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metode tidak diizinkan" });
  }

  const passwordAdmin = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!passwordAdmin || !sessionSecret) {
    return res.status(500).json({
      error: "ADMIN_PASSWORD dan ADMIN_SESSION_SECRET belum diatur di Vercel"
    });
  }

  const password = req.body && req.body.password;

  if (
    typeof password !== "string" ||
    Buffer.byteLength(password) !== Buffer.byteLength(passwordAdmin) ||
    !crypto.timingSafeEqual(
      Buffer.from(password),
      Buffer.from(passwordAdmin)
    )
  ) {
    return res.status(401).json({ error: "Password admin salah" });
  }

  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 8;
  const payload = Buffer.from(
    JSON.stringify({ admin: true, exp: expires })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", sessionSecret)
    .update(payload)
    .digest("base64url");

  res.setHeader("Set-Cookie",
    `nontonku_admin=${payload}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`
  );

  return res.status(200).json({ success: true });
};
