// lib/guide-page.js
//
// Renders a complete, self-contained guide article page
// (public/guides/<slug>/index.html) from a small amount of
// metadata plus an HTML fragment for the article body.
//
// This is the single source of truth for guide page markup —
// the admin editor at /admin/guides calls renderGuidePage() and
// writes the result straight to disk, so every guide page shares
// the same SEO head tags, nav, footer, and structured data.

const { escapeHtml } = require('./cards');

// ---------- shared chrome (nav + background flourishes + footer) ----------
function navAndBackground() {
  return `<div class="bg-grid" aria-hidden="true"></div>
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
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="plate">
    <span class="plate-bolt"></span>
    <span class="plate-text">GARAGE&nbsp;ARCADE</span>
    <span class="plate-bolt"></span>
  </div>
  <p class="footer-note">Built in the workshop &middot; new builds added regularly</p>
</footer>`;
}

// ---------- main export ----------
//
// guide: {
//   slug, title, tagline, description, category, bodyHtml
// }
//
// bodyHtml is trusted, already-sanitized HTML (the article content).
function renderGuidePage(guide) {
  const slug = guide.slug;
  const title = guide.title || 'Untitled Guide';
  const tagline = guide.tagline || '';
  const description = guide.description || tagline || '';
  const category = guide.category || 'Knowledge Base';
  const bodyHtml = guide.bodyHtml || '<p></p>';

  const canonical = `/guides/${slug}/`;
  const pageTitle = `${title} — Garage Arcade`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    articleSection: category,
    mainEntityOfPage: canonical
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(pageTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="stylesheet" href="/styles.css">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>

${navAndBackground()}

<div class="guide-topbar">
  <a href="/#guides">&larr; Back to Knowledge Base</a>
</div>

<main>
  <section class="library-section guide-article">
    <div class="section-head">
      <p class="section-kicker">// ${escapeHtml(category.toUpperCase())}</p>
      <h1>${escapeHtml(title.toUpperCase())}</h1>
      ${tagline ? `<p class="section-desc">${escapeHtml(tagline)}</p>` : ''}
    </div>
    <div class="guide-body">
${bodyHtml}
    </div>
  </section>
</main>

${footer()}

</body>
</html>
`;
}

// ---------- extracting the editable body back out of a saved page ----------
//
// Pulls the inner HTML of the .guide-body container back out of a
// previously-rendered guide page, so the admin editor can load it
// for re-editing. Returns null if the markup doesn't match the
// expected shape (e.g. a hand-edited or legacy page).
function extractBodyHtml(html) {
  const start = html.indexOf('<div class="guide-body">');
  if (start === -1) return null;

  const contentStart = start + '<div class="guide-body">'.length;
  const end = html.indexOf('\n    </div>\n  </section>', contentStart);
  if (end === -1) return null;

  return html.slice(contentStart, end).replace(/^\n/, '').replace(/\n$/, '');
}

module.exports = {
  renderGuidePage,
  extractBodyHtml
};
