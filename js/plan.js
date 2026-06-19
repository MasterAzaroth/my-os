// ════════════════════════════════════════════════════════════════════════════
// PLAN TAB — Steps Library · Routines · Schedule
// ════════════════════════════════════════════════════════════════════════════

const PLAN_BODY_PARTS = ['🦱 Hair','🫧 Face','🧔 Facial Hair','👄 Lips','🦷 Oral','🫁 Body','🪒 Body Hair','🤲 Hands','💅 Nails','🦶 Feet'];
const TIME_LABELS = ['AM','Morning','Lunch','Afternoon','PM','Evening','Night'];
const WEEKDAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const NTH_LABELS = {1:'1st',2:'2nd',3:'3rd',4:'4th',[-1]:'Last'};

let planTab = 'steps'; // 'steps' | 'routines' | 'schedule'
let careSteps = [];
let allRoutines = [];
let stepFormData = {};
let routineFormData = {};
let routineFormSteps = []; // [{care_step_id, name, body_part}]
let selectedRoutineIds = new Set();
let routineMultiSelectMode = false;
let activeStepBodyPartFilter = 'All';

// ── INIT ──────────────────────────────────────────────────────────────────────
async function initPlanner() {
  await loadAllPlanData();
  switchPlanTab('steps');
}

async function loadAllPlanData() {
  const [steps, routines] = await Promise.all([
    api('care_steps', '?order=body_part.asc,name.asc').catch(()=>[]),
    api('routines', '?order=created_at.desc').catch(()=>[]),
  ]);
  careSteps = steps || [];
  allRoutines = routines || [];
}

function switchPlanTab(tab) {
  planTab = tab;
  document.querySelectorAll('.plan-tab').forEach(b => b.classList.toggle('active', b.dataset.tab===tab));
  document.querySelectorAll('.plan-pane').forEach(p => p.classList.toggle('active', p.id===`planPane-${tab}`));
  if (tab === 'steps') renderStepsLibrary();
  if (tab === 'routines') renderRoutinesList();
  if (tab === 'schedule') renderSchedulePreview();
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1 — STEPS LIBRARY (Body Part > Step)
// ════════════════════════════════════════════════════════════════════════════

function renderStepsLibrary() {
  const wrap = document.getElementById('stepsBodyPartFilter');
  const present = ['All', ...PLAN_BODY_PARTS.filter(bp => careSteps.some(s=>s.body_part===bp))];
  wrap.innerHTML = present.map(bp =>
    `<button class="lib-filter-btn${activeStepBodyPartFilter===bp?' active':''}" onclick="setStepBodyPartFilter('${bp.replace(/'/g,"\\'")}')">${bp}</button>`
  ).join('');

  const grouped = {};
  careSteps.forEach(s => {
    if (activeStepBodyPartFilter !== 'All' && s.body_part !== activeStepBodyPartFilter) return;
    if (!grouped[s.body_part]) grouped[s.body_part] = [];
    grouped[s.body_part].push(s);
  });

  const container = document.getElementById('stepsLibraryList');
  const bodyParts = Object.keys(grouped).sort();
  if (!bodyParts.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-glyph">∅</div><div class="empty-title">No steps yet</div><div class="empty-sub">Tap + to create your first step</div></div>`;
    return;
  }

  container.innerHTML = bodyParts.map(bp => `
    <div class="step-bp-section">
      <div class="step-bp-label">${bp}</div>
      ${grouped[bp].map(s => `
        <div class="step-row" onclick="openStepDetail('${s.id}')">
          <div class="step-row-info">
            <div class="step-row-name">${escHtml(s.name)}</div>
            ${s.product_id ? `<div class="step-row-product">🔗 ${escHtml(getProductName(s.product_id))}</div>` : '<div class="step-row-product step-row-noproduct">No product linked</div>'}
          </div>
          <div class="step-row-chevron">›</div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function setStepBodyPartFilter(bp) {
  activeStepBodyPartFilter = bp;
  renderStepsLibrary();
}

function getProductName(productId) {
  const p = (window._planAllProducts || []).find(x => x.id === productId);
  return p ? p.name : 'Unknown product';
}

async function ensureProductsLoaded() {
  if (!window._planProductsLoaded) {
    window._planAllProducts = await api('products', '?order=name.asc').catch(()=>[]);
    window._planProductsLoaded = true;
  }
}

function openStepForm(existingId) {
  stepFormData = existingId ? { ...careSteps.find(s=>s.id===existingId) } : {};
  ensureProductsLoaded().then(() => renderStepForm());
  openOverlay('stepFormOverlay');
}

function renderStepForm() {
  const products = window._planAllProducts || [];
  document.getElementById('stepFormTitle').textContent = stepFormData.id ? 'Edit Step' : 'New Step';
  document.getElementById('stepFormBody').innerHTML = `
    <div class="form-field">
      <div class="form-label">Step Name <span class="form-required">*</span></div>
      <input class="form-input" id="sf_name" placeholder="e.g. Apply moisturizer" value="${escHtml(stepFormData.name||'')}">
    </div>
    <div class="form-field">
      <div class="form-label">Body Part <span class="form-required">*</span></div>
      <div class="form-chips-wrap" id="sf_bodypart_chips">
        ${PLAN_BODY_PARTS.map(bp => `<button class="form-chip${stepFormData.body_part===bp?' selected':''}" onclick="selectStepBodyPart('${bp}')">${bp}</button>`).join('')}
      </div>
    </div>
    <div class="form-field">
      <div class="form-label">Linked Product (optional)</div>
      <select class="form-input" id="sf_product">
        <option value="">None</option>
        ${products.map(p => `<option value="${p.id}" ${stepFormData.product_id===p.id?'selected':''}>${escHtml(p.name)}${p.brand?' — '+escHtml(p.brand):''}</option>`).join('')}
      </select>
      <div class="form-note">Linking a product means when you check this step off in the tracker, this product is pre-selected as what you used.</div>
    </div>
  `;
}

function selectStepBodyPart(bp) {
  stepFormData.body_part = bp;
  document.querySelectorAll('#sf_bodypart_chips .form-chip').forEach(b => b.classList.toggle('selected', b.textContent===bp));
}

function closeStepForm() { closeOverlay('stepFormOverlay'); }

async function saveStep() {
  const name = document.getElementById('sf_name')?.value.trim();
  const bodyPart = stepFormData.body_part;
  const productId = document.getElementById('sf_product')?.value || null;
  if (!name) { showToast('Step name is required'); return; }
  if (!bodyPart) { showToast('Pick a body part'); return; }

  const payload = { name, body_part: bodyPart, product_id: productId };
  let ok;
  if (stepFormData.id) {
    ok = await apiPatch('care_steps', `?id=eq.${stepFormData.id}`, payload);
  } else {
    ok = await apiPost('care_steps', payload);
  }
  if (ok) {
    showToast(stepFormData.id ? '✓ Step updated' : '✓ Step created');
    closeStepForm();
    await loadAllPlanData();
    renderStepsLibrary();
  } else {
    showToast('Something went wrong');
  }
}

function openStepDetail(stepId) {
  const s = careSteps.find(x=>x.id===stepId);
  if (!s) return;
  openPlanSubpage(s.name, `
    <div class="detail-stat" style="margin-bottom:10px">
      <div class="detail-stat-label">Body Part</div>
      <div class="detail-stat-val">${s.body_part}</div>
    </div>
    <div class="detail-stat" style="margin-bottom:20px">
      <div class="detail-stat-label">Linked Product</div>
      <div class="detail-stat-val">${s.product_id ? escHtml(getProductName(s.product_id)) : 'None'}</div>
    </div>
    <button class="form-next-btn" onclick="closePlanSubpage();openStepForm('${s.id}')" style="margin-bottom:10px">Edit Step</button>
    <button class="form-next-btn secondary" onclick="deleteStep('${s.id}')" style="color:var(--red,#c45);border-color:rgba(180,60,60,0.3)">Delete Step</button>
  `);
}

async function deleteStep(stepId) {
  const usedIn = await api('routine_care_steps', `?care_step_id=eq.${stepId}&select=routine_id`).catch(()=>[]);
  if (usedIn && usedIn.length) {
    showToast(`Used in ${usedIn.length} routine${usedIn.length===1?'':'s'} — remove there first`);
    return;
  }
  await apiDelete('care_steps', `?id=eq.${stepId}`);
  showToast('Step deleted');
  closePlanSubpage();
  await loadAllPlanData();
  renderStepsLibrary();
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2 — ROUTINES
// ════════════════════════════════════════════════════════════════════════════

function renderRoutinesList() {
  const container = document.getElementById('routinesList');
  if (!allRoutines.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-glyph">∅</div><div class="empty-title">No routines yet</div><div class="empty-sub">Tap + to build your first routine</div></div>`;
    updatePushBarState();
    return;
  }

  container.innerHTML = allRoutines.map(r => {
    const isOccasional = r.recurrence_type === 'occasional';
    const isLive = r.is_pushed;
    const badgeClass = isLive ? 'routine-badge-live' : 'routine-badge-inactive';
    const badgeText = isLive ? (isOccasional ? 'Active today' : 'Active') : 'Inactive';
    const typeBadge = isOccasional ? '<span class="routine-type-badge routine-type-occasional">Occasional</span>' : '<span class="routine-type-badge routine-type-recurring">Recurring</span>';
    const selected = selectedRoutineIds.has(r.id);
    return `
    <div class="routine-card${selected?' routine-card-selected':''}" onclick="${routineMultiSelectMode ? `toggleRoutineSelect('${r.id}')` : `openRoutineDetail('${r.id}')`}">
      ${routineMultiSelectMode ? `<div class="routine-select-check${selected?' checked':''}">${selected?'✓':''}</div>` : ''}
      <div class="routine-card-icon">${r.emoji||'📋'}</div>
      <div class="routine-card-info">
        <div class="routine-card-name">${escHtml(r.name)}</div>
        <div class="routine-card-meta">${r.time_label?escHtml(r.time_label)+' · ':''}${describeRecurrence(r)}</div>
      </div>
      <div class="routine-card-badges">
        ${typeBadge}
        <span class="routine-badge ${badgeClass}">${badgeText}</span>
      </div>
    </div>`;
  }).join('');

  updatePushBarState();
}

function describeRecurrence(r) {
  if (r.recurrence_type === 'daily') return 'Daily';
  if (r.recurrence_type === 'weekly') return 'Weekly · ' + (r.recurrence_days||[]).map(d=>WEEKDAY_NAMES[d]).join('/');
  if (r.recurrence_type === 'monthly_date') return `Monthly · day ${r.recurrence_date}`;
  if (r.recurrence_type === 'monthly_nth_weekday') return `Monthly · ${NTH_LABELS[r.recurrence_nth]||''} ${WEEKDAY_NAMES[r.recurrence_weekday]}`;
  return 'Occasional';
}

function toggleRoutineMultiSelect() {
  routineMultiSelectMode = !routineMultiSelectMode;
  if (!routineMultiSelectMode) selectedRoutineIds.clear();
  document.getElementById('routineMultiSelectBtn').classList.toggle('active', routineMultiSelectMode);
  document.getElementById('routinePushBar').style.display = routineMultiSelectMode ? 'flex' : 'none';
  renderRoutinesList();
}

function toggleRoutineSelect(id) {
  if (selectedRoutineIds.has(id)) selectedRoutineIds.delete(id);
  else selectedRoutineIds.add(id);
  renderRoutinesList();
}

function updatePushBarState() {
  const bar = document.getElementById('routinePushBar');
  if (!bar) return;
  const pushBtn = document.getElementById('routinePushBtn');
  const uncommitBtn = document.getElementById('routineUncommitBtn');
  const n = selectedRoutineIds.size;
  if (pushBtn) {
    pushBtn.disabled = n === 0;
    pushBtn.textContent = n > 0 ? `Push ${n} routine${n===1?'':'s'}` : 'Push';
  }
  if (uncommitBtn) {
    const anyLive = [...selectedRoutineIds].some(id => allRoutines.find(r=>r.id===id)?.is_pushed);
    uncommitBtn.disabled = !anyLive;
  }
}

function openRoutineBuilder(existingId) {
  if (existingId) {
    const r = allRoutines.find(x=>x.id===existingId);
    routineFormData = { ...r };
    loadRoutineStepsForEdit(existingId);
  } else {
    routineFormData = { recurrence_type: 'daily', recurrence_days: [], emoji: '📋' };
    routineFormSteps = [];
    renderRoutineBuilder();
  }
  openOverlay('routineBuilderOverlay');
}

async function loadRoutineStepsForEdit(routineId) {
  const rcs = await api('routine_care_steps', `?routine_id=eq.${routineId}&order=order_index.asc&select=order_index,care_steps(id,name,body_part)`).catch(()=>[]);
  routineFormSteps = (rcs||[]).map(x => ({ care_step_id: x.care_steps?.id, name: x.care_steps?.name, body_part: x.care_steps?.body_part }));
  renderRoutineBuilder();
}

function renderRoutineBuilder() {
  document.getElementById('routineBuilderTitle').textContent = routineFormData.id ? 'Edit Routine' : 'New Routine';
  const rt = routineFormData.recurrence_type || 'daily';

  document.getElementById('routineBuilderBody').innerHTML = `
    <div class="form-field">
      <div class="form-label">Label <span class="form-required">*</span></div>
      <input class="form-input" id="rf_name" placeholder="e.g. Tanning Routine" value="${escHtml(routineFormData.name||'')}">
    </div>
    <div class="form-field">
      <div class="form-label">Emoji</div>
      <input class="form-input" id="rf_emoji" placeholder="📋" value="${escHtml(routineFormData.emoji||'📋')}" style="width:60px;text-align:center">
    </div>
    <div class="form-field">
      <div class="form-label">Time of Day / Occasion</div>
      <div class="form-chips-wrap" id="rf_time_chips">
        ${TIME_LABELS.map(t => `<button class="form-chip${routineFormData.time_label===t?' selected':''}" onclick="selectRoutineTime('${t}')">${t}</button>`).join('')}
        <button class="form-chip" onclick="customRoutineTime()" style="border-style:dashed">+ Custom</button>
      </div>
    </div>

    <div class="form-field">
      <div class="form-label">Repeats</div>
      <div class="form-chips-wrap" id="rf_recur_chips">
        <button class="form-chip${rt==='daily'?' selected':''}" onclick="setRecurType('daily')">Daily</button>
        <button class="form-chip${rt==='weekly'?' selected':''}" onclick="setRecurType('weekly')">Weekly</button>
        <button class="form-chip${rt==='monthly_date'?' selected':''}" onclick="setRecurType('monthly_date')">Monthly (date)</button>
        <button class="form-chip${rt==='monthly_nth_weekday'?' selected':''}" onclick="setRecurType('monthly_nth_weekday')">Monthly (nth weekday)</button>
        <button class="form-chip${rt==='occasional'?' selected':''}" onclick="setRecurType('occasional')">Occasional</button>
      </div>
    </div>

    <div id="recurDetailField">${renderRecurDetail(rt)}</div>

    <div class="form-field">
      <div class="form-label">Steps (${routineFormSteps.length})</div>
      <div id="routineStepsPicked">${renderPickedSteps()}</div>
      <button class="form-add-price-btn" onclick="openStepPickerForRoutine()" style="margin-top:8px">+ Add Step</button>
    </div>
  `;
}

function renderRecurDetail(rt) {
  if (rt === 'weekly') {
    const days = routineFormData.recurrence_days || [];
    return `<div class="form-field">
      <div class="form-label">Which days</div>
      <div class="form-chips-wrap" id="rf_weekday_chips">
        ${WEEKDAY_NAMES.map((d,i) => `<button class="form-chip${days.includes(i)?' selected':''}" onclick="toggleRoutineWeekday(${i})">${d}</button>`).join('')}
      </div>
    </div>`;
  }
  if (rt === 'monthly_date') {
    return `<div class="form-field">
      <div class="form-label">Day of month</div>
      <input class="form-input" type="number" min="1" max="31" id="rf_month_date" value="${routineFormData.recurrence_date||15}" onchange="routineFormData.recurrence_date=parseInt(this.value)">
    </div>`;
  }
  if (rt === 'monthly_nth_weekday') {
    const nth = routineFormData.recurrence_nth ?? 2;
    const wd = routineFormData.recurrence_weekday ?? 2;
    return `<div class="form-field">
      <div class="form-label">Which week</div>
      <div class="form-chips-wrap" style="margin-bottom:10px">
        ${[1,2,3,4,-1].map(n => `<button class="form-chip${nth===n?' selected':''}" onclick="setNthWeek(${n})">${NTH_LABELS[n]}</button>`).join('')}
      </div>
      <div class="form-label">Which weekday</div>
      <div class="form-chips-wrap">
        ${WEEKDAY_NAMES.map((d,i) => `<button class="form-chip${wd===i?' selected':''}" onclick="setNthWeekday(${i})">${d}</button>`).join('')}
      </div>
    </div>`;
  }
  if (rt === 'occasional') {
    return `<div class="form-note" style="padding:10px 0">Occasional routines don't auto-repeat. After committing, you'll push this routine manually on each day you want to perform it.</div>`;
  }
  return '';
}

function setRecurType(rt) {
  routineFormData.recurrence_type = rt;
  if (rt === 'weekly' && !routineFormData.recurrence_days) routineFormData.recurrence_days = [];
  if (rt === 'monthly_date' && !routineFormData.recurrence_date) routineFormData.recurrence_date = 15;
  if (rt === 'monthly_nth_weekday') {
    if (routineFormData.recurrence_nth == null) routineFormData.recurrence_nth = 2;
    if (routineFormData.recurrence_weekday == null) routineFormData.recurrence_weekday = 2;
  }
  renderRoutineBuilder();
}

function toggleRoutineWeekday(i) {
  const days = routineFormData.recurrence_days || [];
  const idx = days.indexOf(i);
  if (idx >= 0) days.splice(idx,1); else days.push(i);
  routineFormData.recurrence_days = days;
  document.querySelectorAll('#rf_weekday_chips .form-chip').forEach((b,j) => b.classList.toggle('selected', days.includes(j)));
}

function setNthWeek(n) { routineFormData.recurrence_nth = n; renderRoutineBuilder(); }
function setNthWeekday(i) { routineFormData.recurrence_weekday = i; renderRoutineBuilder(); }

function selectRoutineTime(t) {
  routineFormData.time_label = t;
  document.querySelectorAll('#rf_time_chips .form-chip').forEach(b => b.classList.toggle('selected', b.textContent===t));
}

function customRoutineTime() {
  const val = prompt('Enter custom time/occasion label:');
  if (!val || !val.trim()) return;
  routineFormData.time_label = val.trim();
  renderRoutineBuilder();
}

function renderPickedSteps() {
  if (!routineFormSteps.length) return `<div class="form-note">No steps added yet</div>`;
  return routineFormSteps.map((s,i) => `
    <div class="picked-step-row">
      <span class="picked-step-order">${i+1}</span>
      <span class="picked-step-name">${escHtml(s.name)}</span>
      <span class="picked-step-bp">${s.body_part}</span>
      <button class="picked-step-remove" onclick="removeRoutineStep(${i})">×</button>
    </div>
  `).join('');
}

function removeRoutineStep(idx) {
  routineFormSteps.splice(idx,1);
  document.getElementById('routineStepsPicked').innerHTML = renderPickedSteps();
  const stepsLabel = document.querySelector('#routineBuilderBody .form-field:last-child .form-label');
  if (stepsLabel) stepsLabel.textContent = `Steps (${routineFormSteps.length})`;
}

function openStepPickerForRoutine() {
  const alreadyPicked = new Set(routineFormSteps.map(s=>s.care_step_id));
  const grouped = {};
  careSteps.forEach(s => {
    if (alreadyPicked.has(s.id)) return;
    if (!grouped[s.body_part]) grouped[s.body_part] = [];
    grouped[s.body_part].push(s);
  });
  const bodyParts = Object.keys(grouped).sort();
  document.getElementById('stepPickerForRoutineBody').innerHTML = bodyParts.length
    ? bodyParts.map(bp => `
        <div class="step-bp-section">
          <div class="step-bp-label">${bp}</div>
          ${grouped[bp].map(s => `
            <div class="step-row" onclick="pickStepForRoutine('${s.id}')">
              <div class="step-row-info"><div class="step-row-name">${escHtml(s.name)}</div></div>
              <div class="step-row-chevron">+</div>
            </div>
          `).join('')}
        </div>
      `).join('')
    : `<div class="form-note" style="padding:20px 0;text-align:center">All steps already added, or no steps exist yet. Create steps in the Steps tab first.</div>`;
  openOverlay('stepPickerForRoutineOverlay');
}

function pickStepForRoutine(stepId) {
  const s = careSteps.find(x=>x.id===stepId);
  if (!s) return;
  routineFormSteps.push({ care_step_id: s.id, name: s.name, body_part: s.body_part });
  closeOverlay('stepPickerForRoutineOverlay');
  document.getElementById('routineStepsPicked').innerHTML = renderPickedSteps();
  const stepsLabel = document.querySelector('#routineBuilderBody .form-field:last-child .form-label');
  if (stepsLabel) stepsLabel.textContent = `Steps (${routineFormSteps.length})`;
}

function closeRoutineBuilder() { closeOverlay('routineBuilderOverlay'); }

async function commitRoutine() {
  const name = document.getElementById('rf_name')?.value.trim();
  const emoji = document.getElementById('rf_emoji')?.value.trim() || '📋';
  if (!name) { showToast('Routine label is required'); return; }
  if (!routineFormSteps.length) { showToast('Add at least one step'); return; }

  const rt = routineFormData.recurrence_type;
  if (rt === 'weekly' && !(routineFormData.recurrence_days||[]).length) { showToast('Pick at least one weekday'); return; }

  const payload = {
    name, emoji,
    time_label: routineFormData.time_label || null,
    recurrence_type: rt,
    recurrence_days: rt==='weekly' ? routineFormData.recurrence_days : null,
    recurrence_date: rt==='monthly_date' ? routineFormData.recurrence_date : null,
    recurrence_nth: rt==='monthly_nth_weekday' ? routineFormData.recurrence_nth : null,
    recurrence_weekday: rt==='monthly_nth_weekday' ? routineFormData.recurrence_weekday : null,
  };

  let routineId = routineFormData.id;
  if (routineId) {
    await apiPatch('routines', `?id=eq.${routineId}`, payload);
  } else {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routines`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    routineId = data?.[0]?.id;
  }

  if (!routineId) { showToast('Something went wrong'); return; }

  await apiDelete('routine_care_steps', `?routine_id=eq.${routineId}`);
  const stepRows = routineFormSteps.map((s,i) => ({ routine_id: routineId, care_step_id: s.care_step_id, order_index: i }));
  if (stepRows.length) await apiPost('routine_care_steps', stepRows);

  showToast('✓ Routine committed');
  closeRoutineBuilder();
  await loadAllPlanData();
  renderRoutinesList();
}

async function openRoutineDetail(id) {
  const r = allRoutines.find(x=>x.id===id);
  if (!r) return;
  const rcs = await api('routine_care_steps', `?routine_id=eq.${id}&order=order_index.asc&select=order_index,care_steps(name,body_part)`).catch(()=>[]);
  const stepList = (rcs||[]).length
    ? rcs.map((s,i) => `<div class="picked-step-row" style="cursor:default">
        <span class="picked-step-order">${i+1}</span>
        <span class="picked-step-name">${escHtml(s.care_steps?.name||'')}</span>
        <span class="picked-step-bp">${s.care_steps?.body_part||''}</span>
      </div>`).join('')
    : `<div class="form-note">No steps</div>`;

  openPlanSubpage(`${r.emoji||'📋'} ${r.name}`, `
    <div class="detail-grid-2" style="margin-bottom:20px">
      <div class="detail-stat"><div class="detail-stat-label">Time</div><div class="detail-stat-val">${r.time_label||'—'}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Repeats</div><div class="detail-stat-val">${describeRecurrence(r)}</div></div>
    </div>
    <div class="detail-stat" style="margin-bottom:20px">
      <div class="detail-stat-label">Status</div>
      <div class="detail-stat-val">${r.is_pushed ? '🟢 Live in tracker' : '⚪ Not pushed'}</div>
    </div>
    <div class="form-field">
      <div class="form-label">Steps</div>
      ${stepList}
    </div>
    <button class="form-next-btn" onclick="closePlanSubpage();openRoutineBuilder('${r.id}')" style="margin:16px 0 10px">Edit Routine</button>
    ${r.is_pushed
      ? `<button class="form-next-btn secondary" onclick="uncommitRoutines(['${r.id}'])">Uncommit (remove from tracker)</button>`
      : `<button class="form-next-btn" onclick="pushRoutines(['${r.id}'])" style="margin-bottom:10px">Push to Tracker</button>`}
    <button class="form-next-btn secondary" onclick="deleteRoutine('${r.id}')" style="color:var(--red,#c45);border-color:rgba(180,60,60,0.3);margin-top:10px">Delete Routine</button>
  `);
}

async function deleteRoutine(id) {
  const r = allRoutines.find(x=>x.id===id);
  if (r?.is_pushed) await uncommitRoutines([id], true);
  await apiDelete('routine_care_steps', `?routine_id=eq.${id}`);
  await apiDelete('routines', `?id=eq.${id}`);
  showToast('Routine deleted');
  closePlanSubpage();
  await loadAllPlanData();
  renderRoutinesList();
}

// ── PUSH / UNCOMMIT ──────────────────────────────────────────────────────────

async function ensureLiveSchedule() {
  let schedules = await api('schedules', '?is_active=eq.true&limit=1').catch(()=>[]);
  if (schedules && schedules.length) return schedules[0].id;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/schedules`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({ is_active: true, name: 'Live Schedule' })
  });
  const data = await res.json();
  return data?.[0]?.id;
}

function pushSelectedRoutines() {
  if (!selectedRoutineIds.size) return;
  pushRoutines([...selectedRoutineIds]);
}

async function pushRoutines(routineIds) {
  const scheduleId = await ensureLiveSchedule();
  if (!scheduleId) { showToast('Could not create schedule'); return; }

  for (const id of routineIds) {
    const r = allRoutines.find(x=>x.id===id);
    if (!r) continue;

    let sessionId = r.schedule_session_id;
    const sessionPayload = {
      schedule_id: scheduleId,
      name: r.name,
      icon: r.emoji || '📋',
      display_order: 0,
      rule_type: (r.recurrence_type === 'monthly_date' || r.recurrence_type === 'monthly_nth_weekday') ? 'monthly' : (r.recurrence_type === 'occasional' ? 'once' : r.recurrence_type),
      rule_days: r.recurrence_type === 'weekly' ? r.recurrence_days : null,
      rule_day_of_month: r.recurrence_type === 'monthly_date' ? r.recurrence_date : null,
      rule_date: r.recurrence_type === 'occasional' ? getDateStr(new Date()) : null,
    };

    if (sessionId) {
      await apiPatch('schedule_sessions', `?id=eq.${sessionId}`, sessionPayload);
    } else {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/schedule_sessions`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(sessionPayload)
      });
      const data = await res.json();
      sessionId = data?.[0]?.id;
      if (sessionId) {
        await apiDelete('session_items', `?session_id=eq.${sessionId}`);
        await apiPost('session_items', { session_id: sessionId, item_type: 'routine', routine_id: id, order_index: 0 });
      }
    }

    await apiPatch('routines', `?id=eq.${id}`, {
      is_pushed: true,
      schedule_session_id: sessionId,
      pushed_for_date: r.recurrence_type === 'occasional' ? getDateStr(new Date()) : null,
    });
  }

  showToast(`✓ Pushed ${routineIds.length} routine${routineIds.length===1?'':'s'}`);
  selectedRoutineIds.clear();
  routineMultiSelectMode = false;
  const bar = document.getElementById('routinePushBar');
  if (bar) bar.style.display = 'none';
  document.getElementById('routineMultiSelectBtn')?.classList.remove('active');
  await loadAllPlanData();
  renderRoutinesList();
}

function uncommitSelectedRoutines() {
  const liveSelected = [...selectedRoutineIds].filter(id => allRoutines.find(r=>r.id===id)?.is_pushed);
  if (!liveSelected.length) return;
  uncommitRoutines(liveSelected);
}

async function uncommitRoutines(routineIds, silent) {
  for (const id of routineIds) {
    const r = allRoutines.find(x=>x.id===id);
    if (!r) continue;
    if (r.schedule_session_id) {
      await apiDelete('session_items', `?session_id=eq.${r.schedule_session_id}`);
      await apiDelete('schedule_sessions', `?id=eq.${r.schedule_session_id}`);
    }
    await apiPatch('routines', `?id=eq.${id}`, { is_pushed: false, schedule_session_id: null, pushed_for_date: null });
  }
  if (!silent) {
    showToast(`Removed ${routineIds.length} routine${routineIds.length===1?'':'s'} from tracker`);
    selectedRoutineIds.clear();
    routineMultiSelectMode = false;
    const bar = document.getElementById('routinePushBar');
    if (bar) bar.style.display = 'none';
    document.getElementById('routineMultiSelectBtn')?.classList.remove('active');
    closePlanSubpage();
    await loadAllPlanData();
    renderRoutinesList();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3 — SCHEDULE PREVIEW (read-only calendar of what's pushed)
// ════════════════════════════════════════════════════════════════════════════

let scheduleCalMonth = new Date().getMonth();
let scheduleCalYear = new Date().getFullYear();

async function renderSchedulePreview() {
  const liveRoutines = allRoutines.filter(r => r.is_pushed);
  document.getElementById('scheduleLiveCount').textContent = `${liveRoutines.length} live routine${liveRoutines.length===1?'':'s'}`;

  const firstDay = new Date(scheduleCalYear, scheduleCalMonth, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(scheduleCalYear, scheduleCalMonth+1, 0).getDate();
  const today = new Date();

  document.getElementById('scheduleCalLabel').textContent = `${['January','February','March','April','May','June','July','August','September','October','November','December'][scheduleCalMonth]} ${scheduleCalYear}`;

  let cells = '';
  for (let i=0;i<startOffset;i++) cells += `<div class="cal-day other-month"></div>`;
  for (let d=1; d<=daysInMonth; d++) {
    const date = new Date(scheduleCalYear, scheduleCalMonth, d);
    const dateStr = getDateStr(date);
    const isToday = dateStr === getDateStr(today);
    const matches = liveRoutines.filter(r => routineMatchesDate(r, date, dateStr));
    const dots = matches.slice(0,4).map(() => `<span class="cal-dot" style="background:var(--accent)"></span>`).join('');
    cells += `<div class="cal-day${isToday?' today':''}" onclick="showScheduleDayDetail('${dateStr}')">
      <div class="cal-day-num">${d}</div>
      <div class="cal-dots">${dots}</div>
    </div>`;
  }

  document.getElementById('scheduleCalGrid').innerHTML = cells;
}

function routineMatchesDate(r, date, dateStr) {
  const dow = date.getDay(), dom = date.getDate();
  if (r.recurrence_type === 'daily') return true;
  if (r.recurrence_type === 'weekly') return (r.recurrence_days||[]).includes(dow);
  if (r.recurrence_type === 'monthly_date') return dom === r.recurrence_date;
  if (r.recurrence_type === 'monthly_nth_weekday') return weekdayMatchesNth(date, r.recurrence_weekday, r.recurrence_nth);
  if (r.recurrence_type === 'occasional') return r.pushed_for_date === dateStr;
  return false;
}

function weekdayMatchesNth(date, weekday, nth) {
  if (date.getDay() !== weekday) return false;
  const dom = date.getDate();
  if (nth === -1) {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
    return dom > daysInMonth - 7;
  }
  const occurrence = Math.ceil(dom / 7);
  return occurrence === nth;
}

function shiftScheduleCalMonth(delta) {
  scheduleCalMonth += delta;
  if (scheduleCalMonth > 11) { scheduleCalMonth = 0; scheduleCalYear++; }
  if (scheduleCalMonth < 0) { scheduleCalMonth = 11; scheduleCalYear--; }
  renderSchedulePreview();
}

function showScheduleDayDetail(dateStr) {
  const date = new Date(dateStr);
  const liveRoutines = allRoutines.filter(r => r.is_pushed);
  const matches = liveRoutines.filter(r => routineMatchesDate(r, date, dateStr));
  const label = date.toLocaleDateString('en', {weekday:'long', month:'long', day:'numeric'});
  openPlanSubpage(label, matches.length
    ? matches.map(r => `<div class="sched-session-card" style="cursor:default">
        <div class="sched-session-icon">${r.emoji||'📋'}</div>
        <div class="sched-session-info">
          <div class="sched-session-name">${escHtml(r.name)}</div>
          <div class="sched-session-rule">${r.time_label||''}</div>
        </div>
      </div>`).join('')
    : `<div class="form-note" style="padding:20px 0;text-align:center">Nothing scheduled this day</div>`
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SHARED — Plan subpage (slide-in detail panel)
// ════════════════════════════════════════════════════════════════════════════

function openPlanSubpage(title, bodyHtml) {
  document.getElementById('planSubpageTitle').textContent = title;
  document.getElementById('planSubpageBody').innerHTML = bodyHtml;
  document.getElementById('planSubpage').classList.add('open');
}

function closePlanSubpage() {
  document.getElementById('planSubpage').classList.remove('open');
}
