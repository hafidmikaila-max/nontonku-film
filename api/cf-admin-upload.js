const crypto = require("crypto");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metode tidak diizinkan" });
  }

  const secret = process.env.ADMIN_SESSION_SECRET;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!secret || !accountId || !apiToken) {
    return res.status(500).json({
      error: "Pengaturan admin atau Cloudflare belum lengkap di Vercel"
    });
  }

  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)nontonku_admin=([^;]+)/);

  if (!match) {
    return res.status(401).json({ error: "Silakan login admin terlebih dahulu" });
  }

  const parts = match[1].split(".");
  if (parts.length !== 2) {
    return res.status(401).json({ error: "Sesi admin tidak valid" });
  }

  const [payload, signature] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Sesi admin tidak valid" });
  }

  let session;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return res.status(401).json({ error: "Sesi admin tidak valid" });
  }

  if (session.admin !== true || session.exp <= Math.floor(Date.now() / 1000)) {
    return res.status(401).json({ error: "Sesi admin sudah kedaluwarsa" });
  }

  const origin = req.headers.origin;
  const host = req.headers.host;

  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ error: "Origin tidak diizinkan" });
      }
    } catch {
      return res.status(403).json({ error: "Origin tidak valid" });
    }
  }

  const body = req.body || {};
  const maxDurationSeconds = 3600;
  const duration = Number(body.maxDurationSeconds || 0);

  if (
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > maxDurationSeconds
  ) {
    return res.status(400).json({
      error: "Durasi harus berupa angka detik antara 1 dan 3600"
    });
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          maxDurationSeconds: duration,
          expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          requireSignedURLs: false
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success || !data.result?.uploadURL) {
      return res.status(502).json({
        error: "Cloudflare gagal membuat URL upload",
        details: data.errors?.map(e => e.message) || []
      });
    }

    return res.status(200).json({
      uploadURL: data.result.uploadURL,
      uid: data.result.uid
    });
  } catch {
    return res.status(502).json({
      error: "Tidak dapat terhubung ke Cloudflare"
    });
  }
};
