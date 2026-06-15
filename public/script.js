// ============================================================
//  GARAGE ARCADE — script.js
//  Builds the hero tachometer, pulls the game/puzzle library
//  from /api/games and /api/puzzles (served by server.js from
//  data/games.json), and renders the card grids. Falls back to
//  a bundled copy of the library if the API isn't reachable
//  (e.g. when this file is opened as a static preview).
// ============================================================

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

// Bundled copy of data/games.json so this page still renders if
// served outside of the Express app (no /api routes available).
const FALLBACK_LIBRARY = [
  { id:"voidrunner", title:"Voidrunner", tagline:"3D space shooter",
    description:"Strap into the cockpit and aim with your reticle as drones, cruisers and asteroids barrel toward you out of the void. Full 3D, built on Three.js.",
    category:"game", status:"live", difficulty:4, tags:["3D","Shooter","Arcade"], icon:"turbo", url:"/games/voidrunner/index.html" },
  { id:"wiring-match", title:"Wiring Match", tagline:"ECU diagnostic memory game",
    description:"Every harness has been unplugged. Flip the connector pairs, match each sensor to its circuit, and clear the board before the diagnostic timer runs out.",
    category:"puzzle", status:"live", difficulty:2, tags:["Memory","ECU","Quick Play"], icon:"ecu", url:"/games/wiring-match/index.html" },
  { id:"drift-circuit", title:"Drift Circuit", tagline:"Top-down drift racer",
    description:"Throw your hatchback sideways through a neon-lit night circuit. Chain drift angles for boost and chase the leaderboard ghost.",
    category:"game", status:"coming-soon", difficulty:3, tags:["Racing","Arcade"], icon:"wheel", url:null },
  { id:"torque-logic", title:"Torque Logic", tagline:"Bolt-pattern logic puzzle",
    description:"A torque-sequence puzzle in the spirit of classic logic grids — tighten bolts in the correct star pattern without warping the head gasket.",
    category:"puzzle", status:"coming-soon", difficulty:3, tags:["Logic","Workshop"], icon:"wrench", url:null },
  { id:"pit-stop-rush", title:"Pit Stop Rush", tagline:"Reflex tyre-change challenge",
    description:"Four wheels, one timer, zero margin for error. Tap the right tools in sequence to get your driver back on track before the field passes you by.",
    category:"game", status:"coming-soon", difficulty:5, tags:["Reflex","Time Attack"], icon:"stopwatch", url:null },
  { id:"gear-ratio-riddles", title:"Gear Ratio Riddles", tagline:"Daily mechanical riddles",
    description:"A laid-back daily puzzle for grease-stained brains — gear ratios, drivetrain trivia and workshop riddles, one per day.",
    category:"puzzle", status:"coming-soon", difficulty:1, tags:["Daily","Trivia"], icon:"gear", url:null }
];

// ---------- Hero tachometer ----------
function buildHeroDial(){
  const group = document.getElementById('dial-tick-group');
  if(!group) return;

  const TOTAL = 24;
  const SWEEP_START = -130;
  const SWEEP_END = 130;

  for(let i = 0; i < TOTAL; i++){
    const t = i / (TOTAL - 1);
    const angle = SWEEP_START + t * (SWEEP_END - SWEEP_START);
    const isMajor = i % 4 === 0;
    const isDanger = i >= TOTAL - 4;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '110');
    line.setAttribute('y1', isMajor ? '10' : '14');
    line.setAttribute('x2', '110');
    line.setAttribute('y2', '22');
    line.setAttribute('transform', `rotate(${angle} 110 110)`);

    const classes = [];
    if(isMajor) classes.push('major');
    if(isDanger) classes.push('danger');
    if(classes.length) line.setAttribute('class', classes.join(' '));

    group.appendChild(line);
  }
}

// ---------- Difficulty dial ----------
function diffDialMarkup(difficulty){
  const pct = Math.max(1, Math.min(5, difficulty || 1));
  const rotation = (pct - 3) * 40; // -80deg .. 80deg
  const dash = pct * 20;           // 0..100, paired with pathLength="100"

  return `
    <svg class="diff-dial" viewBox="0 0 54 34" aria-hidden="true">
      <path class="arc-bg" d="M5 28 A22 22 0 0 1 49 28" pathLength="100"/>
      <path class="arc-fg" d="M5 28 A22 22 0 0 1 49 28" pathLength="100"
            style="stroke-dasharray:0 100" data-dash="${dash}"/>
      <line class="needle" x1="27" y1="28" x2="27" y2="8"
            style="transform:rotate(0deg)" data-rot="${rotation}"/>
      <circle class="needle-hub" cx="27" cy="28" r="2"/>
      <text class="diff-label" x="27" y="33">DIFFICULTY ${pct}/5</text>
    </svg>`;
}

function animateDials(container){
  const dials = container.querySelectorAll('.diff-dial');
  if(!('IntersectionObserver' in window)){
    dials.forEach(activateDial);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if(entry.isIntersecting){
        activateDial(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  dials.forEach((d) => observer.observe(d));
}

function activateDial(dial){
  const needle = dial.querySelector('.needle');
  const arc = dial.querySelector('.arc-fg');
  requestAnimationFrame(() => {
    needle.style.transform = `rotate(${needle.dataset.rot}deg)`;
    arc.style.strokeDasharray = `${arc.dataset.dash} 100`;
  });
}

// ---------- Card rendering ----------
function renderCard(entry){
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.status = entry.status;

  const icon = ICONS[entry.icon] || ICONS.gear;
  const statusChip = entry.status === 'live'
    ? '<span class="card-status-chip live">Live</span>'
    : '<span class="card-status-chip">In the Shop</span>';

  const tags = (entry.tags || []).map((t) => `<span>${t}</span>`).join('');

  const action = (entry.status === 'live' && entry.url)
    ? `<a class="card-play" href="${entry.url}">Play</a>`
    : '<span class="card-soon">Coming Soon</span>';

  card.innerHTML = `
    <div class="rivet tl"></div><div class="rivet tr"></div>
    <div class="rivet bl"></div><div class="rivet br"></div>
    <div class="card-top">
      <div class="card-icon">${icon}</div>
      ${statusChip}
    </div>
    <h3>${entry.title}</h3>
    <p class="card-tagline">${entry.tagline}</p>
    <p class="card-desc">${entry.description}</p>
    <div class="card-tags">${tags}</div>
    <div class="card-footer">
      ${diffDialMarkup(entry.difficulty)}
      ${action}
    </div>
  `;
  return card;
}

function renderGrid(elementId, entries){
  const grid = document.getElementById(elementId);
  if(!grid) return;
  grid.innerHTML = '';

  if(!entries.length){
    grid.innerHTML = '<p class="grid-status">Nothing on the rack yet — check back soon.</p>';
    return;
  }

  entries.forEach((entry) => grid.appendChild(renderCard(entry)));
  animateDials(grid);
}

// ---------- Data loading ----------
async function loadEntries(endpoint, fallbackFilter){
  try{
    const res = await fetch(endpoint);
    if(!res.ok) throw new Error('Bad response from ' + endpoint);
    return await res.json();
  }catch(err){
    return FALLBACK_LIBRARY.filter(fallbackFilter);
  }
}

async function init(){
  buildHeroDial();

  const [games, puzzles] = await Promise.all([
    loadEntries('/api/games', (e) => e.category === 'game'),
    loadEntries('/api/puzzles', (e) => e.category === 'puzzle')
  ]);

  renderGrid('gamesGrid', games);
  renderGrid('puzzlesGrid', puzzles);
}

document.addEventListener('DOMContentLoaded', init);

// ---------- Guide rendering ----------
async function loadGuides() {
  const grid = document.getElementById("guidesGrid");
  if (!grid) return;

  try {
    const response = await fetch("/data/guides.json");
    if (!response.ok) throw new Error("Could not load guides.json");

    const guides = await response.json();
    grid.innerHTML = "";

    guides.forEach(item => {
      const card = document.createElement("article");
      card.className = "card";

      card.innerHTML = `
        <span class="rivet tl"></span>
        <span class="rivet tr"></span>
        <span class="rivet bl"></span>
        <span class="rivet br"></span>

        <div class="card-top">
          <span class="card-status-chip live">${item.category || "Guide"}</span>
        </div>

        <h3>${item.title || "Untitled Guide"}</h3>
        <p class="card-tagline">${item.tagline || "Workshop guide"}</p>
        <p class="card-desc">${item.description || ""}</p>

        <div class="card-footer">
          <a class="card-play" href="${item.url || "#"}">Read Guide</a>
        </div>
      `;

      grid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<p class="grid-status">Failed to load guides.</p>';
  }
}

document.addEventListener("DOMContentLoaded", loadGuides);
