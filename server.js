// ============================================================
// GARAGE ARCADE — server.js
// Express server: serves the static site and JSON APIs.
// ============================================================


const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const LIBRARY_PATH = path.join(DATA_DIR, 'games.json');
const OBD_CODES_PATH = path.join(DATA_DIR, 'obd-codes.json');

require('dotenv').config()

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function loadLibrary() {
  return readJson(LIBRARY_PATH);
}

function loadObdCodes() {
  return readJson(OBD_CODES_PATH);
}

// ============================================================
// Redirects for renamed guide URLs (old PascalCase -> lowercase)
// ============================================================
app.get(/^\/guides\/HowInductionWorks(\/.*)?$/, (req, res) => {
  res.redirect(301, '/guides/how-induction-works' + (req.params[0] || '/'));
});

app.get(/^\/guides\/HowTurboChargersWork(\/.*)?$/, (req, res) => {
  res.redirect(301, '/guides/how-turbo-chargers-work' + (req.params[0] || '/'));
});

// ============================================================
// Homepage — server-rendered card grids for SEO/crawlability
// ============================================================
const { renderGameGrid, renderGuideGrid } = require('./lib/cards');

app.get('/index.html', (req, res) => res.redirect(301, '/'));

app.get('/', (req, res, next) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');

  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) return next();

    try {
      const games = loadLibrary().filter((entry) => entry.category === 'game');
      const guides = readJson(path.join(DATA_DIR, 'guides.json'));

      html = html.replace(
        '<p class="grid-status" data-loading>Pulling games from the rack&hellip;</p>',
        renderGameGrid(games)
      );

      html = html.replace(
        '<p class="grid-status">Loading workshop manuals&hellip;</p>',
        renderGuideGrid(guides)
      );
    } catch (renderErr) {
      console.error('Homepage SSR failed, serving static index.html:', renderErr);
    }

    res.send(html);
  });
});

// ============================================================
// Static files
// ============================================================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(DATA_DIR));

// ============================================================
// Guide Editor admin routes
// ============================================================
const guidesAdminRoutes = require('./routes/guides-admin');
app.use(guidesAdminRoutes);

// ============================================================
// OBD-II diagnostic trouble code pages (SEO)
// ============================================================
const codesRoutes = require('./routes/codes');
app.use(codesRoutes);

// ============================================================
// Sitemap
// ============================================================
const sitemapRoutes = require('./routes/sitemap');
app.use(sitemapRoutes);

// ============================================================
// API routes
// ============================================================
app.get('/api/library', (req, res) => {
  try {
    res.json(loadLibrary());
  } catch (err) {
    console.error('Failed to read library:', err);
    res.status(500).json({ error: 'Could not load the garage library.' });
  }
});

app.get('/api/games', (req, res) => {
  try {
    res.json(loadLibrary().filter(entry => entry.category === 'game'));
  } catch (err) {
    console.error('Failed to read games:', err);
    res.status(500).json({ error: 'Could not load games.' });
  }
});

app.get('/api/puzzles', (req, res) => {
  try {
    res.json(loadLibrary().filter(entry => entry.category === 'puzzle'));
  } catch (err) {
    console.error('Failed to read puzzles:', err);
    res.status(500).json({ error: 'Could not load puzzles.' });
  }
});

app.get('/api/obd-codes', (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const make = String(req.query.make || '').trim().toLowerCase();
    const model = String(req.query.model || '').trim().toLowerCase();

    const codes = loadObdCodes();

    const filtered = codes.filter(item => {
      const code = String(item.code || '').toLowerCase();
      const description = String(item.description || '').toLowerCase();
      const category = String(item.category || '').toLowerCase();
      const makes = Array.isArray(item.makes) ? item.makes : [];
      const models = Array.isArray(item.models) ? item.models : [];

      const matchesSearch =
        !q ||
        code.includes(q) ||
        description.includes(q) ||
        category.includes(q) ||
        makes.some(value => String(value).toLowerCase().includes(q)) ||
        models.some(value => String(value).toLowerCase().includes(q));

      const matchesMake =
        !make || makes.some(value => String(value).toLowerCase().includes(make));

      const matchesModel =
        !model || models.some(value => String(value).toLowerCase().includes(model));

      return matchesSearch && matchesMake && matchesModel;
    });

    res.json(filtered);
  } catch (err) {
    console.error('Failed to read OBD codes:', err);
    res.status(500).json({ error: 'Could not load OBD codes.' });
  }
});

app.get('/api/obd-codes/:code', (req, res) => {
  try {
    const requestedCode = String(req.params.code || '').toUpperCase();
    const found = loadObdCodes().find(item => item.code === requestedCode);

    if (!found) {
      return res.status(404).json({ error: 'OBD code not found.' });
    }

    res.json(found);
  } catch (err) {
    console.error('Failed to read OBD code:', err);
    res.status(500).json({ error: 'Could not load OBD code.' });
  }
});

// ============================================================
// Start server
// ============================================================
app.listen(PORT, () => {
  console.log('');
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│   GARAGE ARCADE — ENGINE RUNNING            │');
  console.log(`│   http://localhost:${PORT}`.padEnd(46) + '│');
  console.log('└─────────────────────────────────────────────┘');
  console.log('');
});



