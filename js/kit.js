async function initKit() {
  if(!kitItems.length) {
  }
  const numEl = document.getElementById('kitSubtitleNum');
  if(numEl) { numEl.style.opacity = '0'; }
  try {
    const [items, prods] = await Promise.all([
      api('kit_items', '?order=created_at.desc'),
      api('products', '?order=name.asc')
    ]);
    kitItems = Array.isArray(items) ? items : [];
    const prodMap = {};
    (Array.isArray(prods)?prods:[]).forEach(p => prodMap[p.id] = p);
    kitItems.forEach(item => { item._product = prodMap[item.product_id] || {}; });

    const active = kitItems.filter(i=>i.state==='Active').length;
    const backup = kitItems.filter(i=>i.state==='Backup').length;
    const passive = kitItems.filter(i=>i.state==='Passive').length;
    const parts = [];
    if(active) parts.push(active+' active');
    if(backup) parts.push(backup+' backup');
    if(passive) parts.push(passive+' passive');
    const _num = document.getElementById('kitSubtitleNum');
    const _txt = document.getElementById('kitSubtitleText');
    if(_num && _txt) {
      if(parts.length) {
        // Split e.g. "4 active · 1 backup" — number first, rest after
        const full = parts.join(' · ');
        const match = full.match(/^(\d+)(.*)/);
        if(match) { _num.textContent = match[1]; _txt.textContent = match[2]; }
        else { _num.textContent = full; _txt.textContent = ''; }
      } else { _num.textContent = ''; _txt.textContent = 'Empty'; }
      _num.style.opacity = '1';
    }

    document.getElementById('kitFilter').innerHTML = KIT_FILTER_STATES.map(s =>
      `<button class="filter-btn${kitItemFilter===s?' active':''}" onclick="setKitFilter('${s}')">${s}</button>`
    ).join('');

    renderKit();
  } catch(e) {
    console.error('initKit error:', e.message);
    document.getElementById('kitGrid').innerHTML = '<div class="empty-state"><div class="empty-glyph">∅</div><div class="empty-title">Your kit is empty</div><div class="empty-sub">Open a product in the Library and tap "Add to My Kit"</div></div>';
    const numEl = document.getElementById('kitSubtitleNum');
  if(numEl) { numEl.style.opacity = '0'; }
  }
}

function setKitFilter(state) {
  kitItemFilter = state;
  document.querySelectorAll('#kitFilter .filter-btn').forEach(b => b.classList.toggle('active', b.textContent===state));
  renderKit();
}

function renderKit() {
  let filtered = kitItemFilter==='All' ? kitItems : kitItems.filter(i=>i.state===kitItemFilter);

  // Sort
  const sort = document.getElementById('kitSort')?.value || 'date_desc';
  filtered = [...filtered].sort((a, b) => {
    const pa = a._product || {}, pb = b._product || {};
    const pctA = a.container_size > 0 && a.current_amount != null ? a.current_amount / a.container_size : null;
    const pctB = b.container_size > 0 && b.current_amount != null ? b.current_amount / b.container_size : null;
    switch(sort) {
      case 'date_asc':  return new Date(a.created_at||0) - new Date(b.created_at||0);
      case 'date_desc': return new Date(b.created_at||0) - new Date(a.created_at||0);
      case 'name_asc':  return (pa.name||'').localeCompare(pb.name||'');
      case 'name_desc': return (pb.name||'').localeCompare(pa.name||'');
      case 'price_asc':  return (a.price_paid||0) - (b.price_paid||0);
      case 'price_desc': return (b.price_paid||0) - (a.price_paid||0);
      case 'amount_asc':  return (pctA??-1) - (pctB??-1);
      case 'amount_desc': return (pctB??-1) - (pctA??-1);
      default: return 0;
    }
  });

  const grid = document.getElementById('kitGrid');
  if(!filtered.length) {
    grid.className = '';
    grid.innerHTML = `<div class="empty-state"><div class="empty-glyph">∅</div><div class="empty-title">${kitItemFilter==='All'?'Your kit is empty':'No '+kitItemFilter.toLowerCase()+' items'}</div><div class="empty-sub">${kitItemFilter==='All'?'Open a product in the Library and tap "Add to My Kit"':''}</div></div>`;
    return;
  }
  grid.className = 'kit-grid-wrap';
  grid.innerHTML = filtered.map(item => {
    const p = item._product;
    const pct = item.container_size > 0 && item.current_amount != null
      ? Math.round((item.current_amount / item.container_size) * 100) : null;
    const stateIcon = item.state==='Active'?'🟢':item.state==='Backup'?'📦':'💤';
    const imgHtml = p.cover_image_url||p.image_url
      ? `<img src="${p.cover_image_url||p.image_url}" alt="${p.name||''}">`
      : '<div class="kit-item-img-placeholder">🧴</div>';
    const barHtml = pct !== null
      ? `<div class="kit-amount-bar"><div class="kit-amount-bar-fill" style="width:${pct}%"></div></div>` : '';
    return `<div class="kit-item-card" onclick="openKitItemEdit('${item.id}')">
      <div class="kit-item-img">
        ${imgHtml}
        <div class="kit-item-state-dot">${stateIcon}</div>
        ${barHtml}
      </div>
      <div class="kit-item-body">
        <div class="kit-item-name">${p.name||'Unknown'}</div>
        ${pct !== null ? `<div class="kit-item-sub">${pct}%</div>` : ''}
      </div>
    </div>`;
  }).join('');
}


// ── KIT ITEM EDIT ────────────────────────────────────────────────────────────
let kitEditItem = null;

function openKitItemEdit(itemId) {
  kitEditItem = kitItems.find(i => i.id === itemId);
  if(!kitEditItem) return;
  const p = kitEditItem._product;
  document.getElementById('kitEditTitle').innerHTML = `<span onclick="closeOverlay('kitEditOverlay');setTimeout(()=>openDetail('${kitEditItem.product_id}'),300)" style="cursor:pointer;border-bottom:0.5px solid var(--border2)">${p.name||'Kit Item'}</span>`;
  renderKitEditBody();
  openOverlay('kitEditOverlay');
}

function renderKitEditBody() {
  const item = kitEditItem;
  const pct = item.container_size > 0 && item.current_amount != null
    ? Math.round((item.current_amount / item.container_size) * 100) : null;

  document.getElementById('kitEditBody').innerHTML = `
    <div class="form-field">
      <div class="form-label">Status</div>
      <div class="form-chips-wrap">
        ${['Active','Backup','Passive'].map(s => `
          <button class="form-chip${item.state===s?' selected':''}" onclick="setKitEditState('${s}')">${s==='Active'?'🟢':s==='Backup'?'📦':'💤'} ${s}</button>`).join('')}
      </div>
    </div>

    ${item.container_size ? `
    <div class="form-field">
      <div class="form-label">Amount remaining</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <div style="flex:1;height:6px;background:var(--border);border-radius:4px;overflow:hidden">
          <div id="kitEditBar" style="height:100%;background:var(--accent);border-radius:4px;width:${pct||0}%;transition:width 0.2s"></div>
        </div>
        <span id="kitEditPct" style="font-size:12px;color:var(--text2);min-width:36px;text-align:right">${pct||0}%</span>
      </div>
      <input type="range" class="form-slider" id="kitEditSlider"
        min="0" max="${item.container_size}" step="1"
        value="${item.current_amount||0}"
        oninput="updateKitEditAmount(this.value)">
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        <span style="font-size:10px;color:var(--text3)">0 ${item.container_unit||'ml'}</span>
        <span id="kitEditAmtLabel" style="font-size:10px;color:var(--text2)">${item.current_amount||0} ${item.container_unit||'ml'}</span>
        <span style="font-size:10px;color:var(--text3)">${item.container_size} ${item.container_unit||'ml'}</span>
      </div>
    </div>` : ''}

    <div class="form-field">
      <div class="form-label">Opened date</div>
      <input class="form-input" type="date" id="kitEditOpened"
        value="${item.opened_date||''}"
        style="-webkit-appearance:none;color:var(--text2)">
    </div>

    <div class="form-field">
      <div class="form-label">Price paid (€)</div>
      <input class="form-input" type="number" id="kitEditPrice"
        placeholder="e.g. 24.99" value="${item.price_paid||''}">
    </div>

    <div class="form-field">
      <div class="form-label">Purchased from</div>
      <input class="form-input" id="kitEditSource"
        placeholder="e.g. Douglas" value="${item.purchased_from||''}">
    </div>

    <button onclick="saveKitEdit()"
      style="width:100%;padding:14px;border-radius:14px;border:none;background:var(--accent);color:var(--bg);font-size:14px;font-weight:500;cursor:pointer;font-family:var(--sans);margin-top:4px">
      Save changes
    </button>

    <button onclick="deleteKitItem()"
      style="width:100%;padding:12px;border-radius:14px;border:0.5px solid var(--border2);background:transparent;color:var(--red);font-size:13px;cursor:pointer;font-family:var(--sans);margin-top:8px;margin-bottom:4px">
      Remove from kit
    </button>
  `;
}

function setKitEditState(state) {
  kitEditItem.state = state;
  renderKitEditBody();
}

function updateKitEditAmount(val) {
  const v = parseFloat(val);
  kitEditItem.current_amount = v;
  const pct = Math.round((v / kitEditItem.container_size) * 100);
  const bar = document.getElementById('kitEditBar');
  const pctEl = document.getElementById('kitEditPct');
  const lbl = document.getElementById('kitEditAmtLabel');
  if(bar) bar.style.width = pct + '%';
  if(pctEl) pctEl.textContent = pct + '%';
  if(lbl) lbl.textContent = v + ' ' + (kitEditItem.container_unit||'ml');
}

async function saveKitEdit() {
  const opened = document.getElementById('kitEditOpened')?.value;
  const price = document.getElementById('kitEditPrice')?.value;
  const source = document.getElementById('kitEditSource')?.value;
  if(opened) kitEditItem.opened_date = opened;
  if(price !== undefined) kitEditItem.price_paid = parseFloat(price)||null;
  if(source !== undefined) kitEditItem.purchased_from = source||null;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/kit_items?id=eq.${kitEditItem.id}`, {
    method: 'PATCH',
    headers: {'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},
    body: JSON.stringify({
      state: kitEditItem.state,
      current_amount: kitEditItem.current_amount,
      opened_date: kitEditItem.opened_date||null,
      price_paid: kitEditItem.price_paid||null,
      purchased_from: kitEditItem.purchased_from||null
    })
  });

  if(res.ok) {
    showToast('✓ Saved');
    closeOverlay('kitEditOverlay');
    renderKit();
  } else {
    showToast('Error saving');
  }
}

async function deleteKitItem() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/kit_items?id=eq.${kitEditItem.id}`, {
    method: 'DELETE',
    headers: {'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}
  });
  if(res.ok) {
    kitItems = kitItems.filter(i => i.id !== kitEditItem.id);
    showToast('Removed from kit');
    closeOverlay('kitEditOverlay');
    renderKit();
    // Update subtitle
    const active = kitItems.filter(i=>i.state==='Active').length;
    const backup = kitItems.filter(i=>i.state==='Backup').length;
    const passive = kitItems.filter(i=>i.state==='Passive').length;
    const parts = [];
    if(active) parts.push(active+' active');
    if(backup) parts.push(backup+' backup');
    if(passive) parts.push(passive+' passive');
    const _num = document.getElementById('kitSubtitleNum');
    const _txt = document.getElementById('kitSubtitleText');
    if(_num && _txt) {
      if(parts.length) {
        // Split e.g. "4 active · 1 backup" — number first, rest after
        const full = parts.join(' · ');
        const match = full.match(/^(\d+)(.*)/);
        if(match) { _num.textContent = match[1]; _txt.textContent = match[2]; }
        else { _num.textContent = full; _txt.textContent = ''; }
      } else { _num.textContent = ''; _txt.textContent = 'Empty'; }
      _num.style.opacity = '1';
    }
  } else {
    showToast('Error removing');
  }
}

function closeKitEdit() {
  closeOverlay('kitEditOverlay');
}
// ─────────────────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr) {
  const d = new Date(dateStr);
  const diff = Math.floor((new Date() - d) / 86400000);
  if(diff === 0) return 'today';
  if(diff === 1) return 'yesterday';
  if(diff < 30) return diff+'d ago';
  if(diff < 365) return Math.floor(diff/30)+'mo ago';
  return Math.floor(diff/365)+'y ago';
}

// SAVE STATE
function activateSave() {
  hasChanges = true;
  const btn = document.getElementById('saveBtn');
  btn.classList.add('active');
}

function deactivateSave() {
  hasChanges = false;
  const btn = document.getElementById('saveBtn');
  btn.classList.remove('active');
}

// BARCODE SUCCESS PILL
function showBarcodeSuccess(source, productName) {
  const existing = document.getElementById('barcodeSuccessPill');
  if(existing) existing.remove();

  const pill = document.createElement('div');
  pill.id = 'barcodeSuccessPill';
  pill.innerHTML = `<span style="color:#4a7c59;font-size:14px">●</span> Found on ${source}${productName ? ': <strong>' + productName + '</strong>' : ''}`;
  pill.style.cssText = `
    position:fixed;bottom:calc(80px + env(safe-area-inset-bottom,0px));left:50%;
    transform:translateX(-50%) translateY(20px);
    background:#0d1f14;border:0.5px solid #2a4a32;border-radius:20px;
    padding:10px 18px;font-size:12px;color:#7ab98a;
    opacity:0;transition:all 0.3s;pointer-events:none;
    white-space:nowrap;z-index:100;max-width:90vw;
    overflow:hidden;text-overflow:ellipsis;
  `;
  document.body.appendChild(pill);
  requestAnimationFrame(() => {
    pill.style.opacity = '1';
    pill.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    pill.style.opacity = '0';
    pill.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => pill.remove(), 300);
  }, 4000);
}

