// routes/sitemap.js
//
// Generates /sitemap.xml from the same data files that drive the
// site, so every guide, every game, and every OBD-II code page
// (the big new SEO surface) is listed for crawlers automatically —
// no manual upkeep needed when content is added via the admin.

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

router.get('/sitemap.xml', (req, res) => {
  const urls = new Set();

  urls.add('/');
  urls.add('/codes/');

  // OBD-II code pages
  const codes = readJson(path.join(DATA_DIR, 'obd-codes.json'), []);
  codes.forEach((item) => {
    if (item && item.code) {
      urls.add(`/codes/${String(item.code).toLowerCase()}/`);
    }
  });

  // Guide pages
  const guides = readJson(path.join(DATA_DIR, 'guides.json'), []);
  guides.forEach((g) => {
    if (g && g.url) urls.add(g.url);
  });

  // Live games/puzzles
  const games = readJson(path.join(DATA_DIR, 'games.json'), []);
  games.forEach((g) => {
    if (g && g.status === 'live' && g.url) urls.add(g.url);
  });

  const base = `${req.protocol}://${req.get('host')}`;

  const body = Array.from(urls)
    .map((u) => `  <url><loc>${base}${u}</loc></url>`)
    .join('\n');

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    body + '\n' +
    `</urlset>\n`;

  res.type('application/xml').send(xml);
});

module.exports = router;
