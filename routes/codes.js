// routes/codes.js
//
// Server-rendered OBD-II diagnostic trouble code pages — the
// biggest untapped SEO surface on the site. Each code gets its
// own crawlable URL with a real <title>, meta description, full
// write-up, and TechArticle/HowTo structured data, e.g.:
//
//   /codes/                -> index of all codes, grouped by category
//   /codes/p0300/          -> "P0300 — Random/Multiple Cylinder Misfire..."
//
// Data comes from data/obd-codes.json (same file used by the
// in-page DTC scanner on the homepage).

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const OBD_CODES_PATH = path.join(__dirname, '..', 'data', 'obd-codes.json');

function loadCodes() {
  return JSON.parse(fs.readFileSync(OBD_CODES_PATH, 'utf8'));
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function severityClass(severity) {
  const s = String(severity || '').toLowerCase();
  if (s === 'high') return 'high';
  if (s === 'medium') return 'medium';
  if (s === 'low') return 'low';
  return 'medium';
}

function list(items, ordered) {
  if (!items || !items.length) return '';
  const tag = ordered ? 'ol' : 'ul';
  const rows = items.map((i) => `<li>${escapeHtml(i)}</li>`).join('\n        ');
  return `<${tag} class="dtc-list">\n        ${rows}\n      </${tag}>`;
}

// ---------- Page shell (shared chrome: nav, background, footer) ----------
function pageShell({ title, description, canonical, bodyHtml, extraHead }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="stylesheet" href="/styles.css">
${extraHead || ''}
</head>
<body>

<div class="bg-grid" aria-hidden="true"></div>
<div class="grease grease-a" aria-hidden="true"></div>
<div class="grease grease-b" aria-hidden="true"></div>
<div class="grease grease-c" aria-hidden="true"></div>

<header class="navbar">
  <a class="nav-logo" href="/">
    <svg class="logo-gauge" viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="30" cy="30" r="27" class="gauge-ring"/>
      <g class="gauge-ticks">
        <line x1="30" y1="6" x2="30" y2="12"/>
        <line x1="30" y1="6" x2="30" y2="12" transform="rotate(45 30 30)"/>
        <line x1="30" y1="6" x2="30" y2="12" transform="rotate(90 30 30)"/>
        <line x1="30" y1="6" x2="30" y2="12" transform="rotate(135 30 30)"/>
        <line x1="30" y1="6" x2="30" y2="12" transform="rotate(180 30 30)"/>
        <line x1="30" y1="6" x2="30" y2="12" transform="rotate(225 30 30)"/>
        <line x1="30" y1="6" x2="30" y2="12" transform="rotate(270 30 30)"/>
        <line x1="30" y1="6" x2="30" y2="12" transform="rotate(315 30 30)"/>
      </g>
      <line x1="30" y1="30" x2="30" y2="11" class="gauge-needle"/>
      <circle cx="30" cy="30" r="3.5" class="gauge-hub"/>
    </svg>
    <span class="nav-wordmark">GARAGE<span class="accent">ARCADE</span></span>
  </a>
  <nav class="nav-links">
    <a href="/codes/">DTC Codes</a>
    <a href="/#guides">Knowledge Base</a>
    <a href="/#games">Game Bay</a>
  </nav>
</header>

<main>
${bodyHtml}
</main>

<footer class="site-footer">
  <div class="plate">
    <span class="plate-bolt"></span>
    <span class="plate-text">GARAGE&nbsp;ARCADE</span>
    <span class="plate-bolt"></span>
  </div>
  <p class="footer-note">Built in the workshop &middot; new builds added regularly</p>
</footer>

</body>
</html>
`;
}

// ---------- /codes/ — index of all codes ----------
router.get('/codes/?', (req, res) => {
  const codes = loadCodes();

  // Group by category, preserving first-seen order
  const groups = new Map();
  codes.forEach((item) => {
    const cat = item.category || 'Other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(item);
  });

  const groupHtml = Array.from(groups.entries()).map(([category, items]) => {
    const rows = items.map((item) => {
      const slug = item.code.toLowerCase();
      return `<li>
          <a class="dtc-code-pill" href="/codes/${escapeHtml(slug)}/">${escapeHtml(item.code)}</a>
          <span class="code-index-desc">${escapeHtml(item.description)}</span>
          <span class="severity ${severityClass(item.severity)}">${escapeHtml(item.severity || '')}</span>
        </li>`;
    }).join('\n        ');

    return `<div class="code-index-group">
      <h3>${escapeHtml(category)}</h3>
      <ul class="code-index-list">
        ${rows}
      </ul>
    </div>`;
  }).join('\n\n');

  const bodyHtml = `  <section class="library-section">
    <div class="section-head">
      <p class="section-kicker">// BAY 01</p>
      <h1>DIAGNOSTIC TROUBLE CODES</h1>
      <p class="section-desc">
        ${codes.length} OBD-II codes, what they mean, how serious they are, and how to fix them.
        Use the live scanner on the <a href="/#dtc">home page</a> to search by make and model,
        or browse the full list below.
      </p>
    </div>

    <div class="code-index">
${groupHtml}
    </div>
  </section>
`;

  res.send(pageShell({
    title: 'OBD-II Diagnostic Trouble Codes — Garage Arcade',
    description: `Browse all ${codes.length} OBD-II diagnostic trouble codes: meanings, symptoms, causes, and fixes, grouped by category.`,
    canonical: '/codes/',
    bodyHtml,
    extraHead: '<style>\n' + CODE_PAGE_CSS + '\n</style>'
  }));
});

// ---------- /codes/:code/ — individual code page ----------
router.get('/codes/:code/?', (req, res, next) => {
  const requested = String(req.params.code || '').toUpperCase();
  const codes = loadCodes();
  const item = codes.find((c) => String(c.code).toUpperCase() === requested);

  if (!item) {
    return next(); // fall through to 404
  }

  const slug = item.code.toLowerCase();
  const canonical = `/codes/${slug}/`;

  const makes = (item.makes || []).join(', ');
  const models = (item.models || []).join(', ');

  const bodyHtml = `  <section class="library-section">
    <div class="guide-topbar">
      <a href="/codes/">&larr; All diagnostic trouble codes</a>
    </div>

    <div class="section-head">
      <p class="section-kicker">// ${escapeHtml(item.category || 'DTC')}</p>
      <h1>${escapeHtml(item.code)} &mdash; ${escapeHtml(item.description)}</h1>
      <p class="section-desc">
        What ${escapeHtml(item.code)} means, how serious it is, what causes it, and how to fix it.
      </p>
    </div>

    <div class="code-detail-grid">
      <div class="code-detail-main">

        <div class="code-summary-strip">
          <div>
            <span class="report-label">SEVERITY</span>
            <strong class="severity ${severityClass(item.severity)}">${escapeHtml(item.severity || 'Unknown')}</strong>
          </div>
          <div>
            <span class="report-label">ESTIMATED REPAIR COST</span>
            <strong>${escapeHtml(item.estimatedRepairCost || 'Varies')}</strong>
          </div>
          <div>
            <span class="report-label">CODE</span>
            <strong><span class="dtc-code-pill">${escapeHtml(item.code)}</span></strong>
          </div>
        </div>

        <h2>Can you keep driving?</h2>
        <p>${escapeHtml(item.canDrive || 'Have the code checked by a mechanic as soon as possible.')}</p>

        <h2>Symptoms</h2>
        ${list(item.symptoms)}

        <h2>Common causes</h2>
        ${list(item.causes)}

        <h2>How to fix it</h2>
        ${list(item.fixes, true)}

      </div>

      <aside class="code-detail-side">
        <div class="spec-sheet">
          <div class="spec-row">
            <span class="spec-label">CODE</span>
            <span class="spec-value">${escapeHtml(item.code)}</span>
          </div>
          <div class="spec-row">
            <span class="spec-label">CATEGORY</span>
            <span class="spec-value">${escapeHtml(item.category || '—')}</span>
          </div>
          <div class="spec-row">
            <span class="spec-label">SEVERITY</span>
            <span class="spec-value">${escapeHtml(item.severity || '—')}</span>
          </div>
          <div class="spec-row">
            <span class="spec-label">EST. COST</span>
            <span class="spec-value">${escapeHtml(item.estimatedRepairCost || '—')}</span>
          </div>
          <div class="spec-row">
            <span class="spec-label">COMMON MAKES</span>
            <span class="spec-value">${escapeHtml(makes || '—')}</span>
          </div>
          <div class="spec-row">
            <span class="spec-label">COMMON MODELS</span>
            <span class="spec-value">${escapeHtml(models || '—')}</span>
          </div>
        </div>
        <p class="code-disclaimer">
          General information only — actual causes and repair costs vary by vehicle.
          Confirm with a qualified mechanic before repairs.
        </p>
      </aside>
    </div>
  </section>
`;

  // ---- Structured data: TechArticle + HowTo (for the fix steps) ----
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${item.code} — ${item.description}`,
    description: `What the ${item.code} code (${item.description}) means, its symptoms, causes, and how to fix it.`,
    about: item.code,
    articleSection: item.category || 'Diagnostics',
    mainEntityOfPage: canonical
  };

  if (item.fixes && item.fixes.length) {
    jsonLd.step = item.fixes.map((f, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: f
    }));
  }

  const extraHead =
    '<style>\n' + CODE_PAGE_CSS + '\n</style>\n' +
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

  res.send(pageShell({
    title: `${item.code} — ${item.description} | Garage Arcade`,
    description: `${item.code}: ${item.description}. Severity, symptoms, common causes, and step-by-step fixes for this OBD-II code.`,
    canonical,
    bodyHtml,
    extraHead
  }));
});

const CODE_PAGE_CSS = `
.guide-topbar{
  margin: 0 0 20px;
}
.guide-topbar a{
  font-family: var(--font-mono); font-size:.78rem; letter-spacing:.12em;
  text-transform:uppercase; text-decoration:none; color: var(--text-dim);
  border-bottom: 1px solid var(--line-strong); padding-bottom:2px;
  transition: color .15s ease, border-color .15s ease;
}
.guide-topbar a:hover{ color: var(--blue); border-color: var(--blue); }

/* ---- /codes/ index ---- */
.code-index{ display:flex; flex-direction:column; gap:28px; }
.code-index-group h3{
  font-family: var(--font-display); font-weight:700; letter-spacing:.06em;
  font-size:1.2rem; color: var(--chrome); margin: 0 0 10px;
  text-transform: uppercase;
}
.code-index-list{
  list-style:none; margin:0; padding:0;
  border: 1px solid var(--line); border-radius: 12px;
  background: rgba(11,12,15,.4);
  overflow:hidden;
}
.code-index-list li{
  display:flex; align-items:center; gap:14px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
}
.code-index-list li:last-child{ border-bottom:none; }
.code-index-list li:hover{ background: rgba(255,94,44,.06); }
.code-index-desc{ color: var(--text-dim); font-size:.92rem; flex:1; }

/* ---- /codes/:code ---- */
.code-detail-grid{
  display:grid;
  grid-template-columns: minmax(0,1.65fr) minmax(240px,.85fr);
  gap: 28px;
}
@media (max-width: 900px){
  .code-detail-grid{ grid-template-columns: 1fr; }
}
.code-detail-main h2{
  font-family: var(--font-display); font-weight:700; letter-spacing:.04em;
  font-size: 1.3rem; color: var(--chrome);
  margin: 28px 0 10px;
}
.code-detail-main h2:first-of-type{ margin-top: 22px; }
.code-detail-main p{ color: var(--text-dim); line-height:1.7; margin:0; }

.code-summary-strip{
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 8px;
}
.code-summary-strip > div{
  padding:14px; border-radius:14px;
  background: rgba(11,12,15,.6);
  border: 1px solid var(--line);
}
.code-summary-strip strong{
  font-family: var(--font-display); font-size:1.2rem; color: var(--chrome);
}

.code-detail-side .spec-sheet{ margin-bottom: 14px; }
.code-disclaimer{
  font-family: var(--font-mono); font-size:.72rem; color: var(--text-faint);
  line-height:1.6;
}
`;

module.exports = router;
