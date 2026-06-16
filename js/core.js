// ── CONFIG ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://dcchjwowwdkpdyxaopic.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjY2hqd293d2RrcGR5eGFvcGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDM0NzUsImV4cCI6MjA5NTgxOTQ3NX0.FxozE-chmtrJcsZSiu4WYwn-GsrqYOQzgDA0pqPQbGc';

// ── DATE / TIME HELPERS ───────────────────────────────────────────────────────
const DAYS      = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const now       = new Date();
const todayIdx  = now.getDay();
const todayShort = DAYS[todayIdx];
const todayFull  = DAY_FULL[todayIdx];
const todayDate  = now.toISOString().split('T')[0];

function getDateStr(d) { return d.toISOString().split('T')[0]; }
function getDayShort(d) { return DAYS[d.getDay()]; }
function getDayFull(d)  { return DAY_FULL[d.getDay()]; }

// ── API ───────────────────────────────────────────────────────────────────────
async function api(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  if (!res.ok) throw new Error(`API error ${res.status} on ${table}`);
  return res.json();
}

async function apiPost(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  });
  return res.ok;
}

async function apiPatch(table, params, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  });
  return res.ok;
}

async function apiDelete(table, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  return res.ok;
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
// Each page navigates to a real URL. Hub button always goes back to root.
function goHub() {
  // find root relative to current depth
  const depth = location.pathname.split('/').filter(Boolean).length;
  const root  = depth > 0 ? '../'.repeat(depth) : './';
  window.location.href = root;
}

// ── OVERLAYS ─────────────────────────────────────────────────────────────────
function openOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('visible')));
}

function closeOverlay(id, cb) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('visible');
  setTimeout(() => {
    el.style.display = 'none';
    if (cb) cb();
  }, 350);
}

// ── PULL TO REFRESH ───────────────────────────────────────────────────────────
const ptrAttached = new Set();
function setupPTR(wrapperId, scrollId, spinnerId, refreshFn) {
  if (ptrAttached.has(scrollId)) return;
  ptrAttached.add(scrollId);
  const scroll  = document.getElementById(scrollId);
  const spinner = document.getElementById(spinnerId);
  if (!scroll || !spinner) return;
  let startY = 0, pulling = false, triggered = false, refreshing = false;
  const TRIGGER_PX = 60, MAX_DRAG = 80;
  scroll.addEventListener('touchstart', e => {
    if (scroll.scrollTop === 0 && !refreshing) { startY = e.touches[0].clientY; pulling = true; triggered = false; }
  }, {passive:true});
  scroll.addEventListener('touchmove', e => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0) return;
    const clamped = Math.min(dy, MAX_DRAG);
    const eased = clamped * (1 - clamped / (MAX_DRAG * 2.5));
    scroll.style.transition = 'none';
    scroll.style.transform = `translateY(${eased}px)`;
    spinner.parentElement.style.transition = 'none';
    spinner.parentElement.style.transform = `translateY(${eased}px)`;
    spinner.style.transition = 'none';
    spinner.style.opacity = String(Math.min(eased / 44, 1));
    if (dy > TRIGGER_PX && !triggered) { triggered = true; if (navigator.vibrate) navigator.vibrate(10); }
  }, {passive:true});
  scroll.addEventListener('touchend', () => {
    const indicator = spinner.parentElement;
    const SNAP = 'transform 0.4s cubic-bezier(0.25,1,0.5,1)';
    if (triggered && !refreshing) {
      scroll.style.transition = SNAP; scroll.style.transform = 'translateY(44px)';
      indicator.style.transition = SNAP; indicator.style.transform = 'translateY(44px)';
      spinner.style.transition = 'opacity 0.2s ease'; spinner.style.opacity = '1';
      refreshing = true;
      refreshFn().finally(() => {
        setTimeout(() => {
          scroll.style.transition = SNAP; scroll.style.transform = 'translateY(0)';
          indicator.style.transition = SNAP; indicator.style.transform = 'translateY(0)';
          spinner.style.transition = 'opacity 0.25s ease'; spinner.style.opacity = '0';
          setTimeout(() => { spinner.style.opacity=''; spinner.style.transition=''; scroll.style.cssText=''; indicator.style.cssText=''; refreshing=false; }, 260);
        }, 400);
      });
    } else if (pulling) {
      scroll.style.transition = SNAP; scroll.style.transform = 'translateY(0)';
      indicator.style.transition = SNAP; indicator.style.transform = 'translateY(0)';
      spinner.style.transition = 'opacity 0.15s ease'; spinner.style.opacity = '0';
      setTimeout(() => { spinner.style.opacity=''; spinner.style.transition=''; indicator.style.cssText=''; }, 420);
    }
    pulling = false; triggered = false;
  });
}

// ── SHARED UTILS ──────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7)  return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff/7)}w ago`;
  return `${Math.floor(diff/30)}mo ago`;
}

function formatDescription(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br>');
}
