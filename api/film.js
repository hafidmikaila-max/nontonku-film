const CONFIG = {
  url: 'https://sculxtkbmeqqdpuxxrfx.supabase.co',
  key: 'sb_publishable_QjLPncMwT-SWapS65jhhPw_kj6Xmg3U'
};
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

module.exports = async (req, res) => {
  const id = String(req.query.id || '');
  if (!id || !/^[0-9a-f-]{16,}$/i.test(id)) return res.status(400).send('ID film tidak valid.');
  const origin = `https://${req.headers.host || 'nontonku-liard.vercel.app'}`;
  try {
    const apiUrl = `${CONFIG.url}/rest/v1/films?id=eq.${encodeURIComponent(id)}&select=id,title,year,genre,poster_url`;
    const filmResponse = await fetch(apiUrl, { headers: { apikey: CONFIG.key, Authorization: `Bearer ${CONFIG.key}` } });
    if (!filmResponse.ok) throw new Error('Gagal mengambil data film');
    const rows = await filmResponse.json();
    if (!rows.length) return res.status(404).send('Film tidak ditemukan.');
    const film = rows[0];
    const title = `${film.title || 'Film'} — NontonKu`;
    const desc = `Lihat ${film.title || 'film ini'}${film.year ? ` (${film.year})` : ''}${film.genre ? ` • ${film.genre}` : ''} di NontonKu.`;
    const url = `${origin}${req.url.split('?')[0]}`;
    const image = film.poster_url || `https://placehold.co/1200x630/101010/FFFFFF?text=NontonKu`;
    const pageResponse = await fetch(`${origin}/index.html`);
    if (!pageResponse.ok) throw new Error('Halaman utama tidak tersedia');
    let html = await pageResponse.text();
    const meta = `\n<meta name="description" content="${escapeHtml(desc)}">\n<meta property="og:type" content="video.movie">\n<meta property="og:site_name" content="NontonKu">\n<meta property="og:title" content="${escapeHtml(title)}">\n<meta property="og:description" content="${escapeHtml(desc)}">\n<meta property="og:url" content="${escapeHtml(url)}">\n<meta property="og:image" content="${escapeHtml(image)}">\n<meta property="og:image:secure_url" content="${escapeHtml(image)}">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${escapeHtml(title)}">\n<meta name="twitter:description" content="${escapeHtml(desc)}">\n<meta name="twitter:image" content="${escapeHtml(image)}">`;
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
    html = html.replace(/<meta\s+name="description"[^>]*>/i, '');
    html = html.replace('</head>', `${meta}\n</head>`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(html);
  } catch (err) {
    return res.status(500).send('Pratinjau film belum dapat dibuat. Periksa konfigurasi Supabase dan deployment Vercel.');
  }
};
