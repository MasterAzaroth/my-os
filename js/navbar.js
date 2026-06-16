// ── NAVBAR ────────────────────────────────────────────────────────────────────
// Call renderNav(pillar, activePage) on every page.
// pillar:     'self-care' | 'fitness' | 'music' | 'creative' | 'projects'
// activePage: key matching NAV_CONFIG[pillar].pages[n].key

const NAV_CONFIG = {
  'self-care': {
    label: 'Self Care',
    pages: [
      { key: 'index',   icon: '🪞', label: 'Routine', href: '/self-care/index.html' },
      { key: 'library', icon: '◈',  label: 'Library', href: '/self-care/library.html' },
      { key: 'kit',     icon: '🧴', label: 'Kit',     href: '/self-care/kit.html' },
      { key: 'plan',    icon: '📋', label: 'Plan',    href: '/self-care/plan.html' },
    ]
  },
  'fitness': {
    label: 'Fitness',
    pages: [
      { key: 'index', icon: '🏋️', label: 'Training', href: '/fitness/index.html' },
    ]
  },
  'music': {
    label: 'Music',
    pages: [
      { key: 'index', icon: '🎵', label: 'Practice', href: '/music/index.html' },
    ]
  },
  'creative': {
    label: 'Creative',
    pages: [
      { key: 'index', icon: '🎨', label: 'Studio', href: '/creative/index.html' },
    ]
  },
  'projects': {
    label: 'Projects',
    pages: [
      { key: 'index', icon: '💻', label: 'Builds', href: '/projects/index.html' },
    ]
  },
};

function renderNav(pillar, activePage) {
  const config = NAV_CONFIG[pillar];
  if (!config) return;

  const pages = config.pages;
  // Build items: left half, hub button in middle, right half
  const mid     = Math.floor(pages.length / 2);
  const left    = pages.slice(0, mid);
  const right   = pages.slice(mid);

  const btnHTML = (p) => {
    const isActive = p.key === activePage;
    return `<button class="nav-btn${isActive ? ' active' : ''}" onclick="location.href='${p.href}'">
      <span class="nav-icon">${p.icon}</span>
      <span class="nav-label">${p.label}</span>
    </button>`;
  };

  const hubBtn = `<button class="nav-btn nav-hub" onclick="goHub()">
    <span class="nav-icon">${config.label}</span>
    <span class="nav-label">tap for hub</span>
  </button>`;

  const html = `<nav class="navbar">
    ${left.map(btnHTML).join('')}
    ${hubBtn}
    ${right.map(btnHTML).join('')}
  </nav>
  <div class="toast" id="toast"></div>`;

  // Insert into #navMount if it exists, otherwise append to body
  const mount = document.getElementById('navMount');
  if (mount) {
    mount.innerHTML = html;
  } else {
    document.body.insertAdjacentHTML('beforeend', html);
  }
}
