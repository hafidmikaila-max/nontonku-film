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
    return res.status(500).json({ error: "Konfigurasi server belum lengkap" });
  }

  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)nontonku_admin=([^;]+)/);

  if (!match) {
    return res.status(401).json({ error: "Silakan login admin" });
  }

  const parts = match[1].split(".");
  if (parts.length !== 2) {
    return res.status(401).json({ error: "Sesi tidak valid" });
  }

  const [payload, signature] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Sesi tidak valid" });
  }

  let session;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return res.status(401).json({ error: "Sesi tidak valid" });
  }

  if (session.admin !== true || session.exp <= Math.floor(Date.now() / 1000)) {
    return res.status(401).json({ error: "Sesi kedaluwarsa" });
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
  const fileSize = Number(body.fileSize);
  const fileName =
    typeof body.fileName === "string" ? body.fileName.trim() : "";
  const duration = Number(body.maxDurationSeconds);

  if (!Number.isSafeInteger(fileSize) || fileSize < 1) {
    return res.status(400).json({ error: "Ukuran file tidak valid" });
  }

  if (!fileName || fileName.length > 255) {
    return res.status(400).json({ error: "Nama file tidak valid" });
  }

  if (!Number.isInteger(duration) || duration < 1 || duration > 36000) {
    return res.status(400).json({
      error: "Durasi maksimal harus 1–36000 detik"
    });
  }

  const metadata = [
    `name ${Buffer.from(fileName).toString("base64")}`,
    `maxdurationseconds ${Buffer.from(String(duration)).toString("base64")}`
  ].join(",");

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Tus-Resumable": "1.0.0",
          "Upload-Length": String(fileSize),
          "Upload-Metadata": metadata
        }
      }
    );

    if (!response.ok) {
      const details = await response.text();
      console.error("Cloudflare TUS error:", response.status, details);
      return res.status(502).json({
        error: "Cloudflare gagal membuat URL upload. Periksa izin Stream Write."
      });
    }

    const uploadURL = response.headers.get("Location");
    const uid = response.headers.get("stream-media-id");

    if (!uploadURL) {
      return res.status(502).json({
        error: "Cloudflare tidak mengembalikan URL upload"
      });
    }

    return res.status(200).json({ uploadURL, uid: uid || null });
  } catch (error) {
    console.error("Upload setup error:", error.message);
    return res.status(502).json({
      error: "Gagal menghubungi Cloudflare"
    });
  }
};
