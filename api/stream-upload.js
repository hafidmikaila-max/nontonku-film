export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    "https://sculxtkbmeqqdpuxxrfx.supabase.co";

  const supabaseKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!accountId || !apiToken) {
    return res.status(500).json({
      error: "Konfigurasi Cloudflare belum lengkap"
    });
  }

  if (!supabaseKey) {
    return res.status(500).json({
      error: "Konfigurasi kunci Supabase belum lengkap"
    });
  }

  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Login diperlukan"
    });
  }

  try {
    const userResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: auth
        }
      }
    );

    if (!userResponse.ok) {
      return res.status(401).json({
        error: "Sesi login tidak valid"
      });
    }

    const user = await userResponse.json();

    const adminResponse = await fetch(
      `${supabaseUrl}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(user.id)}&select=user_id`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: auth
        }
      }
    );

    if (!adminResponse.ok) {
      return res.status(403).json({
        error: "Tidak dapat memverifikasi admin"
      });
    }

    const admins = await adminResponse.json();

    if (!Array.isArray(admins) || admins.length === 0) {
      return res.status(403).json({
        error: "Hanya admin yang dapat mengunggah video"
      });
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          maxDurationSeconds: 3600,
          requireSignedURLs: false
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      return res.status(502).json({
        error: "Cloudflare gagal membuat tautan unggahan"
      });
    }

    return res.status(200).json({
      uploadURL: result.result.uploadURL,
      uid: result.result.uid
    });
  } catch (error) {
    return res.status(500).json({
      error: "Terjadi kesalahan pada server"
    });
  }
}
