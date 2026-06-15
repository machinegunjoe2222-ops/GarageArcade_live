// lib/cards.js
//
// Server-side HTML rendering for the homepage card grids
// (Game Bay + Knowledge Base). Mirrors the markup produced by
// public/script.js's renderCard()/loadGuides() so the page looks
// identical whether or not JavaScript runs — but crucially, this
// version is in the HTML on first response, so search engines and
// link-preview bots see real content and real <a href> links
// without needing to execute JS.
//
// public/script.js still runs client-side afterwards and
// re-renders these grids from /api/games, /api/puzzles, and
// /data/guides.json — that's fine, it just replaces this markup
// with an equivalent (and adds the animated difficulty dials).

const ICONS = {
  turbo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="2.2"/>
    <path d="M12 9.8c0-3 1.5-5.3 4.2-6.1-1 2.7-.2 5 2 6.5-3 .6-5.2-.1-6.2-2.4z"/>
    <path d="M14.2 12c3 0 5.3 1.5 6.1 4.2-2.7-1-5-.2-6.5 2-.6-3 .1-5.2 2.4-6.2z"/>
    <path d="M12 14.2c0 3-1.5 5.3-4.2 6.1 1-2.7.2-5-2-6.5 3-.6 5.2.1 6.2 2.4z"/>
    <path d="M9.8 12c-3 0-5.3-1.5-6.1-4.2 2.7 1 5 .2 6.5-2 .6 3-.1 5.2-2.4 6.2z"/>
  </svg>`,
  ecu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="6" y="6" width="12" height="12" rx="1.5"/>
    <rect x="9.5" y="9.5" width="5" height="5" rx="1"/>
    <path d="M9 2v4M12 2v4M15 2v4M9 18v4M12 18v4M15 18v4M2 9h4M2 12h4M2 15h4M18 9h4M18 12h4M18 15h4"/>
  </svg>`,
  wheel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="2.4"/>
    <path d="M12 3v6.6M12 14.4V21M5.2 7.2l4.7 4.7M14.1 12.7l4.7 4.7M18.8 7.2l-4.7 4.7M9.9 12.7L5.2 17.4"/>
  </svg>`,
  wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.7 6.3a4 4 0 1 0-4.4 5.4L4 18l2 2 6.3-6.3a4 4 0 0 0 5.4-4.4l-3 3-2-2 3-3z"/>
  </svg>`,
  stopwatch: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="13" r="8"/>
    <path d="M12 13V9M9 2h6M19 6l1.5-1.5"/>
  </svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3.2"/>
    <path d="M12 2v3M12 19v3M22 12h-3M5 12H2M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12M19.07 19.07l-2.12-2.12M7.05 7.05L4.93 4.93"/>
  </svg>`
};

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Pre-rendered (non-animated) version of the difficulty dial — same
// final visual as script.js's activateDial(), just without the
// load-triggered animation.
function diffDialMarkup(difficulty) {
  const pct = Math.max(1, Math.min(5, difficulty || 1));
  const rotation = (pct - 3) * 40; // -80deg .. 80deg
  const dash = pct * 20;           // 0..100, paired with pathLength="100"

  return `
    <svg class="diff-dial" viewBox="0 0 54 34" aria-hidden="true">
      <path class="arc-bg" d="M5 28 A22 22 0 0 1 49 28" pathLength="100"/>
      <path class="arc-fg" d="M5 28 A22 22 0 0 1 49 28" pathLength="100"
            style="stroke-dasharray:${dash} 100"/>
      <line class="needle" x1="27" y1="28" x2="27" y2="8"
            style="transform:rotate(${rotation}deg)"/>
      <circle class="needle-hub" cx="27" cy="28" r="2"/>
      <text class="diff-label" x="27" y="33">DIFFICULTY ${pct}/5</text>
    </svg>`;
}

// Mirrors script.js's renderCard() for games/puzzles.
function renderGameCard(entry) {
  const icon = ICONS[entry.icon] || ICONS.gear;
  const statusChip = entry.status === 'live'
    ? '<span class="card-status-chip live">Live</span>'
    : '<span class="card-status-chip">In the Shop</span>';

  const tags = (entry.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join('');

  const action = (entry.status === 'live' && entry.url)
    ? `<a class="card-play" href="${escapeHtml(entry.url)}">Play</a>`
    : '<span class="card-soon">Coming Soon</span>';

  return `<article class="card" data-status="${escapeHtml(entry.status)}">
    <div class="rivet tl"></div><div class="rivet tr"></div>
    <div class="rivet bl"></div><div class="rivet br"></div>
    <div class="card-top">
      <div class="card-icon">${icon}</div>
      ${statusChip}
    </div>
    <h3>${escapeHtml(entry.title)}</h3>
    <p class="card-tagline">${escapeHtml(entry.tagline)}</p>
    <p class="card-desc">${escapeHtml(entry.description)}</p>
    <div class="card-tags">${tags}</div>
    <div class="card-footer">
      ${diffDialMarkup(entry.difficulty)}
      ${action}
    </div>
  </article>`;
}

// Mirrors script.js's loadGuides() card markup.
function renderGuideCard(item) {
  return `<article class="card">
    <span class="rivet tl"></span>
    <span class="rivet tr"></span>
    <span class="rivet bl"></span>
    <span class="rivet br"></span>

    <div class="card-top">
      <span class="card-status-chip live">${escapeHtml(item.category || 'Guide')}</span>
    </div>

    <h3>${escapeHtml(item.title || 'Untitled Guide')}</h3>
    <p class="card-tagline">${escapeHtml(item.tagline || 'Workshop guide')}</p>
    <p class="card-desc">${escapeHtml(item.description || '')}</p>

    <div class="card-footer">
      <a class="card-play" href="${escapeHtml(item.url || '#')}">Read Guide</a>
    </div>
  </article>`;
}

function renderGameGrid(entries) {
  if (!entries.length) {
    return '<p class="grid-status">Nothing on the rack yet — check back soon.</p>';
  }
  return entries.map(renderGameCard).join('\n');
}

function renderGuideGrid(entries) {
  if (!entries.length) {
    return '<p class="grid-status">Nothing on the rack yet — check back soon.</p>';
  }
  return entries.map(renderGuideCard).join('\n');
}

module.exports = {
  ICONS,
  diffDialMarkup,
  renderGameCard,
  renderGuideCard,
  renderGameGrid,
  renderGuideGrid,
  escapeHtml
};
