async function initPlanner() {
  await loadPlannerData();
  switchPlannerTab(plannerActiveTab, true);
}

async function loadPlannerData() {
  try {
    const [routines, scheduled, goals, experiments, prods] = await Promise.all([
      api('routines','?order=created_at.desc'),
      api('scheduled_treatments','?done=eq.false&order=scheduled_date.asc'),
      api('goals','?active=eq.true&order=created_at.desc'),
      api('experiments','?status=eq.active&order=created_at.desc'),
      api('products','?order=name.asc')
    ]);
    plannerData.routines    = Array.isArray(routines)    ? routines    : [];
    plannerData.scheduled   = Array.isArray(scheduled)   ? scheduled   : [];
    plannerData.goals       = Array.isArray(goals)       ? goals       : [];
    plannerData.experiments = Array.isArray(experiments) ? experiments : [];
    plannerProducts         = Array.isArray(prods)       ? prods       : [];
  } catch(e) { console.error('loadPlannerData:', e); }
}

function switchPlannerTab(tab, force=false) {
  if(plannerActiveTab === tab && !force) return;
  plannerActiveTab = tab;
  document.querySelectorAll('.planner-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.planner-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('ptab-'+tab)?.classList.add('active');
  document.getElementById('pane-'+tab)?.classList.add('active');
  // Update + button context
  const addBtn = document.getElementById('plannerAddBtn');
  if(addBtn) addBtn.style.display = tab==='scheduler' ? 'none' : 'flex';
  if(tab==='operator')  renderOperator();
  if(tab==='scheduler') renderScheduler();
  if(tab==='goals')     renderGoals();
  if(tab==='lab')       renderLab();
}

// ── OPERATOR ─────────────────────────────────────────────────────────────────
function renderOperator() {
  const el = document.getElementById('operatorContent');
  if(!plannerData.routines.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-glyph">📋</div><div class="empty-title">No routines yet</div><div class="empty-sub">Tap + to create your first routine</div></div>`;
    return;
  }
  el.innerHTML = plannerData.routines.map(r => `
    <div class="routine-card" onclick="openRoutineDetail('${r.id}')">
      <div class="routine-card-icon">${r.emoji||'📋'}</div>
      <div class="routine-card-info">
        <div class="routine-card-name">${r.name}</div>
        <div class="routine-card-meta">Tap to view steps &amp; schedule</div>
      </div>
      <span style="color:var(--text3);font-size:16px">›</span>
    </div>`).join('');
}

async function openRoutineDetail(id) {
  const r = plannerData.routines.find(x=>x.id===id);
  if(!r) return;
  let steps = [];
  try { steps = await api('routine_steps',`?routine_id=eq.${id}&order=order_index.asc`); } catch(e){}
  const stepList = steps.length
    ? steps.map((s,i) => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:0.5px solid var(--border)">
          <span style="font-size:11px;color:var(--text3);width:18px;flex-shrink:0">${i+1}</span>
          <span style="font-size:13px;color:var(--text);flex:1">${s.step_name}</span>
          <button onclick="deleteRoutineStep('${s.id}','${id}')" style="background:none;border:none;color:var(--text3);font-size:16px;cursor:pointer;padding:0 4px">×</button>
        </div>`).join('')
    : `<div style="padding:20px 0;text-align:center;font-size:12px;color:var(--text3)">No steps yet — add one below</div>`;

  openPlannerSubpage(r.emoji+' '+r.name, `
    <div style="margin-bottom:20px">
      <div class="form-label" style="margin-bottom:10px">Steps</div>
      <div id="routineStepList">${stepList}</div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <input class="form-input" id="rsp_name" placeholder="New step name..." style="flex:1">
        <button onclick="addRoutineStep('${id}')" style="padding:10px 16px;border-radius:12px;border:none;background:var(--accent);color:var(--bg);font-size:13px;cursor:pointer;font-family:var(--sans);flex-shrink:0">Add</button>
      </div>
    </div>
    <button onclick="deletePlannerItem('routines','${id}')" style="width:100%;padding:12px;border-radius:14px;border:0.5px solid var(--border2);background:transparent;color:var(--red,#c45);font-size:13px;cursor:pointer;font-family:var(--sans)">Delete Routine</button>
  `);
}

async function addRoutineStep(routineId) {
  const name = document.getElementById('rsp_name')?.value.trim();
  if(!name) return;
  let steps = [];
  try { steps = await api('routine_steps',`?routine_id=eq.${routineId}&order=order_index.asc`); } catch(e){}
  await fetch(`${SUPABASE_URL}/rest/v1/routine_steps`, {
    method:'POST',
    headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},
    body: JSON.stringify({ routine_id:routineId, step_name:name, order_index:steps.length })
  });
  showToast('Step added');
  openRoutineDetail(routineId);
}

async function deleteRoutineStep(stepId, routineId) {
  await fetch(`${SUPABASE_URL}/rest/v1/routine_steps?id=eq.${stepId}`, {
    method:'DELETE', headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}
  });
  openRoutineDetail(routineId);
}

// ── SCHEDULER ────────────────────────────────────────────────────────────────


async function loadScheduleData() {
  try {
    const schedules = await api('schedules','?is_active=eq.true&limit=1');
    const sched = schedules?.[0];
    if(!sched) return;
    scheduleData.scheduleId = sched.id;
    const [live, draft] = await Promise.all([
      api('schedule_sessions',`?schedule_id=eq.${sched.id}&order=display_order.asc`),
      api('draft_sessions',`?schedule_id=eq.${sched.id}&order=display_order.asc`)
    ]);
    scheduleData.liveSessions  = live||[];
    scheduleData.draftSessions = draft||[];
    for(const s of scheduleData.draftSessions) {
      s._items = await api('draft_session_items',`?draft_session_id=eq.${s.id}&order=order_index.asc`).catch(()=>[]);
    }
  } catch(e) { console.error('loadScheduleData:', e); }
}

async function renderScheduler() {
  await loadScheduleData();
  const el = document.getElementById('schedulerContent');
  if(!el) return;
  const draft = scheduleData.draftSessions.filter(s=>s.change_status!=='deleted');
  const hasChanges = scheduleData.draftSessions.some(s=>s.change_status!=='unchanged');
  const groups={daily:[],weekly:[],monthly:[],once:[]};
  draft.forEach(s=>(groups[s.rule_type]||groups.once).push(s));
  const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const ruleLabel=s=>{
    if(s.rule_type==='daily') return 'Every day';
    if(s.rule_type==='weekly') return 'Every '+((s.rule_days||[]).map(d=>WD[d]).join(', ')||'—');
    if(s.rule_type==='monthly') return `Every ${s.rule_day_of_month}th of month`;
    if(s.rule_type==='once'&&s.rule_date) return `Once · ${new Date(s.rule_date+'T00:00:00').toLocaleDateString('en',{month:'short',day:'numeric'})}`;
    return s.rule_type;
  };
  const badge=s=>s.change_status==='new'?`<span class="sched-change-badge badge-new">New</span>`:s.change_status==='edited'?`<span class="sched-change-badge badge-edited">Edited</span>`:'';
  const card=s=>{
    const items=(s._items||[]).map(i=>i.item_type==='routine'?(plannerData.routines.find(r=>r.id===i.routine_id)?.name||'Routine'):(i.step_name||'Step')).join(' · ')||'No items yet';
    return `<div class="sched-session-card" onclick="openSessionDetail('${s.id}')">
      <div class="sched-session-icon">${s.icon||'🌅'}</div>
      <div class="sched-session-info">
        <div class="sched-session-name">${s.name}</div>
        <div class="sched-session-rule">${ruleLabel(s)}</div>
        <div class="sched-session-items">${items}</div>
      </div>
      ${badge(s)}<span style="color:var(--text3);font-size:16px;margin-left:4px">›</span>
    </div>`;
  };
  const group=(title,arr)=>arr.length?`<div class="sched-section"><div class="sched-section-title">${title}</div>${arr.map(card).join('')}</div>`:'';
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:12px;color:var(--text3)">${draft.length} session${draft.length!==1?'s':''} · ${hasChanges?'<span style="color:var(--accent)">unsaved changes</span>':'up to date'}</div>
      <button onclick="openAddSession()" style="padding:6px 14px;border-radius:12px;border:0.5px solid var(--border);background:transparent;color:var(--text2);font-size:12px;cursor:pointer;font-family:var(--sans)">+ Session</button>
    </div>
    ${group('Daily',groups.daily)}${group('Weekly',groups.weekly)}${group('Monthly',groups.monthly)}${group('One-time',groups.once)}
    ${!draft.length?'<div class="empty-state"><div class="empty-glyph">📅</div><div class="empty-title">No sessions yet</div><div class="empty-sub">Tap + Session to build your schedule</div></div>':''}
    <div class="push-bar"><button class="push-btn" onclick="openPushFlow()" ${!hasChanges?'disabled':''}>↑ Push Changes</button></div>`;
  // Calendar
  const calDiv=document.createElement('div');
  calDiv.style.marginTop='24px';
  const MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DN=['Su','Mo','Tu','We','Th','Fr','Sa'];
  const tod=new Date();
  const fd=new Date(calYear,calMonth,1).getDay();
  const dim=new Date(calYear,calMonth+1,0).getDate();
  const dip=new Date(calYear,calMonth,0).getDate();
  const dotMap={};
  plannerData.scheduled.forEach(s=>{
    const d=new Date(s.scheduled_date+'T00:00:00');
    if(d.getMonth()===calMonth&&d.getFullYear()===calYear){const k=d.getDate();if(!dotMap[k])dotMap[k]=[];dotMap[k].push('var(--accent)');}
  });
  draft.forEach(s=>{
    for(let d=1;d<=dim;d++){
      const dt=new Date(calYear,calMonth,d),dow=dt.getDay(),dom=dt.getDate();
      const ds=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      let fires=s.rule_type==='daily'||(s.rule_type==='weekly'&&(s.rule_days||[]).includes(dow))||(s.rule_type==='monthly'&&dom===s.rule_day_of_month)||(s.rule_type==='once'&&s.rule_date===ds);
      if(fires){if(!dotMap[d])dotMap[d]=[];if(dotMap[d].length<3)dotMap[d].push('var(--border2)');}
    }
  });
  let cells='';
  for(let i=fd-1;i>=0;i--)cells+=`<div class="cal-day other-month"><div class="cal-day-num">${dip-i}</div></div>`;
  for(let d=1;d<=dim;d++){
    const it=d===tod.getDate()&&calMonth===tod.getMonth()&&calYear===tod.getFullYear();
    const dots=(dotMap[d]||[]).slice(0,4).map(c=>`<div class="cal-dot" style="background:${c}"></div>`).join('');
    cells+=`<div class="cal-day${it?' today':''}" onclick="openCalDay(${d})"><div class="cal-day-num">${d}</div><div class="cal-dots">${dots}</div></div>`;
  }
  const rem=(7-((fd+dim)%7))%7;
  for(let i=1;i<=rem;i++)cells+=`<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
  calDiv.innerHTML=`<div class="cal-header"><button class="cal-nav-btn" onclick="shiftCalMonth(-1)">‹</button><div class="cal-month-label">${MN[calMonth]} ${calYear}</div><button class="cal-nav-btn" onclick="shiftCalMonth(1)">›</button></div><div class="cal-grid">${DN.map(d=>`<div class="cal-day-label">${d}</div>`).join('')}${cells}</div>`;
  el.appendChild(calDiv);
}

function shiftCalMonth(d){calMonth+=d;if(calMonth>11){calMonth=0;calYear++;}if(calMonth<0){calMonth=11;calYear--;}renderScheduler();}

function openCalDay(day){
  const date=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const dt=new Date(date+'T00:00:00'),dow=dt.getDay(),dom=dt.getDate();
  const label=dt.toLocaleDateString('en',{weekday:'long',month:'long',day:'numeric'});
  const firing=scheduleData.draftSessions.filter(s=>{
    if(s.change_status==='deleted') return false;
    if(s.rule_type==='daily') return true;
    if(s.rule_type==='weekly') return (s.rule_days||[]).includes(dow);
    if(s.rule_type==='monthly') return dom===s.rule_day_of_month;
    if(s.rule_type==='once') return s.rule_date===date;
    return false;
  });
  const treatments=plannerData.scheduled.filter(s=>s.scheduled_date===date);
  if(!firing.length&&!treatments.length){showToast('Nothing on this day');return;}
  const html=firing.map(s=>{
    const its=(s._items||[]).map(i=>i.item_type==='routine'?`<div style="padding:5px 0;font-size:12px;color:var(--text2)">📋 ${plannerData.routines.find(r=>r.id===i.routine_id)?.name||'Routine'}</div>`:`<div style="padding:5px 0;font-size:12px;color:var(--text2)">• ${i.step_name}</div>`).join('');
    return `<div style="margin-bottom:14px"><div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:4px">${s.icon} ${s.name}</div>${its||'<div style="font-size:11px;color:var(--text3)">No items</div>'}</div>`;
  }).join('')+treatments.map(t=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:0.5px solid var(--border)"><span style="font-size:13px;color:var(--text);flex:1">📅 ${t.name}</span><button onclick="markScheduledDone('${t.id}')" style="background:none;border:none;color:var(--accent);font-size:13px;cursor:pointer;font-family:var(--sans)">Done</button></div>`).join('');
  openPlannerSubpage(label,html);
}


async function openAddSession(){
  openPlannerSubpage('New Session',`
    <div class="form-field"><div class="form-label">Name</div><input class="form-input" id="ns_name" placeholder="e.g. Morning, Evening, Sunday Reset"></div>
    <div class="form-field"><div class="form-label">Icon</div><input class="form-input" id="ns_icon" placeholder="🌅" maxlength="4" style="width:80px"></div>
    <div class="form-field"><div class="form-label">Recurrence</div><select class="form-input" id="ns_rule" onchange="updateRuleUI()" style="color:var(--text2)"><option value="daily">Every day</option><option value="weekly">Weekly — specific days</option><option value="monthly">Monthly — specific date</option><option value="once">Once — specific date</option></select></div>
    <div id="ns_rule_extra"></div>
    <button onclick="saveNewSession()" style="width:100%;padding:14px;border-radius:14px;border:none;background:var(--accent);color:var(--bg);font-size:14px;font-weight:500;cursor:pointer;font-family:var(--sans);margin-top:8px">Create Session</button>
  `);
  setTimeout(updateRuleUI,100);
}

function updateRuleUI(){
  const rule=document.getElementById('ns_rule')?.value;
  const extra=document.getElementById('ns_rule_extra'); if(!extra) return;
  const DY=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  if(rule==='weekly') extra.innerHTML=`<div class="form-field"><div class="form-label">Days</div><div style="display:flex;gap:6px;flex-wrap:wrap">${DY.map((d,i)=>`<button class="pill filter-btn" id="wd_${i}" onclick="toggleWeekday(${i})" style="min-width:44px">${d}</button>`).join('')}</div></div>`;
  else if(rule==='monthly') extra.innerHTML=`<div class="form-field"><div class="form-label">Day of month</div><input class="form-input" type="number" id="ns_dom" min="1" max="31" placeholder="e.g. 1" style="width:100px"></div>`;
  else if(rule==='once') extra.innerHTML=`<div class="form-field"><div class="form-label">Date</div><input class="form-input" type="date" id="ns_date" style="color:var(--text2)"></div>`;
  else extra.innerHTML='';
}

function toggleWeekday(i){
  if(selectedWeekdays.has(i)) selectedWeekdays.delete(i); else selectedWeekdays.add(i);
  document.getElementById('wd_'+i)?.classList.toggle('active',selectedWeekdays.has(i));
}

async function saveNewSession(){
  const name=document.getElementById('ns_name')?.value.trim();
  if(!name){showToast('Enter a name');return;}
  if(!scheduleData.scheduleId){showToast('No active schedule');return;}
  const rule=document.getElementById('ns_rule')?.value;
  const icon=document.getElementById('ns_icon')?.value.trim()||'🌅';
  let data={schedule_id:scheduleData.scheduleId,name,icon,rule_type:rule,display_order:scheduleData.draftSessions.length,change_status:'new'};
  if(rule==='weekly') data.rule_days=[...selectedWeekdays];
  if(rule==='monthly') data.rule_day_of_month=parseInt(document.getElementById('ns_dom')?.value)||1;
  if(rule==='once') data.rule_date=document.getElementById('ns_date')?.value;
  selectedWeekdays.clear();
  const res=await fetch(`${SUPABASE_URL}/rest/v1/draft_sessions`,{method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(data)});
  if(res.ok){showToast('Session created');closePlannerSubpage();await renderScheduler();}
  else showToast('Error');
}

async function openSessionDetail(draftId){
  await loadScheduleData();
  const s=scheduleData.draftSessions.find(x=>x.id===draftId); if(!s) return;
  const items=s._items||[];
  const WD2=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const rt=s.rule_type==='daily'?'Every day':s.rule_type==='weekly'?'Every '+((s.rule_days||[]).map(d=>WD2[d]).join(', ')):s.rule_type==='monthly'?`Every ${s.rule_day_of_month}th`:s.rule_date||'Once';
  const ih=items.map((it,idx)=>`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:0.5px solid var(--border)"><span style="font-size:11px;color:var(--text3);width:18px">${idx+1}</span><span style="font-size:13px;color:var(--text);flex:1">${it.item_type==='routine'?'📋 '+(plannerData.routines.find(r=>r.id===it.routine_id)?.name||'Routine'):'• '+(it.step_name||'Step')}</span><button onclick="deleteDraftItem('${it.id}','${draftId}')" style="background:none;border:none;color:var(--text3);font-size:16px;cursor:pointer">×</button></div>`).join('');
  const ro=plannerData.routines.map(r=>`<option value="${r.id}">${r.emoji||'📋'} ${r.name}</option>`).join('');
  openPlannerSubpage(s.icon+' '+s.name,`
    <div style="font-size:11px;color:var(--text3);margin-bottom:16px">${rt}</div>
    <div class="form-label" style="margin-bottom:8px">Items</div>
    <div id="sessionItemList">${ih||'<div style="padding:12px 0;font-size:12px;color:var(--text3)">No items yet</div>'}</div>
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
      <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em">Add routine</div>
      <div style="display:flex;gap:8px"><select class="form-input" id="si_routine" style="flex:1;color:var(--text2)"><option value="">— pick routine —</option>${ro}</select><button onclick="addSessionItem('${draftId}','routine')" style="padding:10px 14px;border-radius:12px;border:none;background:var(--accent);color:var(--bg);font-size:13px;cursor:pointer;font-family:var(--sans);flex-shrink:0">Add</button></div>
      <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-top:4px">Add single step</div>
      <div style="display:flex;gap:8px"><input class="form-input" id="si_step" placeholder="Step name..." style="flex:1"><button onclick="addSessionItem('${draftId}','step')" style="padding:10px 14px;border-radius:12px;border:0.5px solid var(--border);background:var(--bg3);color:var(--text);font-size:13px;cursor:pointer;font-family:var(--sans);flex-shrink:0">Add</button></div>
    </div>
    <button onclick="deleteSession('${draftId}')" style="width:100%;padding:12px;border-radius:14px;border:0.5px solid var(--border2);background:transparent;color:#c45;font-size:13px;cursor:pointer;font-family:var(--sans);margin-top:20px">Remove Session</button>
  `);
}

async function addSessionItem(draftId,type){
  const session=scheduleData.draftSessions.find(s=>s.id===draftId);
  const nextIdx=(session?._items||[]).length;
  let data={draft_session_id:draftId,item_type:type,order_index:nextIdx};
  if(type==='routine'){data.routine_id=document.getElementById('si_routine')?.value;if(!data.routine_id){showToast('Pick a routine');return;}}
  else{data.step_name=document.getElementById('si_step')?.value.trim();if(!data.step_name){showToast('Enter a step name');return;}}
  const res=await fetch(`${SUPABASE_URL}/rest/v1/draft_session_items`,{method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(data)});
  if(res.ok){
    if(session?.change_status==='unchanged') await fetch(`${SUPABASE_URL}/rest/v1/draft_sessions?id=eq.${draftId}`,{method:'PATCH',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({change_status:'edited'})});
    showToast('Added');await loadScheduleData();openSessionDetail(draftId);renderScheduler();
  }
}

async function deleteDraftItem(itemId,draftId){
  await fetch(`${SUPABASE_URL}/rest/v1/draft_session_items?id=eq.${itemId}`,{method:'DELETE',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
  await loadScheduleData();openSessionDetail(draftId);renderScheduler();
}

async function deleteSession(draftId){
  const s=scheduleData.draftSessions.find(x=>x.id===draftId);
  if(s?.change_status==='new') await fetch(`${SUPABASE_URL}/rest/v1/draft_sessions?id=eq.${draftId}`,{method:'DELETE',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
  else await fetch(`${SUPABASE_URL}/rest/v1/draft_sessions?id=eq.${draftId}`,{method:'PATCH',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({change_status:'deleted'})});
  closePlannerSubpage();await renderScheduler();
}

async function openPushFlow(){
  const draft=scheduleData.draftSessions;
  const added=draft.filter(s=>s.change_status==='new');
  const edited=draft.filter(s=>s.change_status==='edited');
  const deleted=draft.filter(s=>s.change_status==='deleted');
  const dh=`${added.length?`<div style="margin-bottom:12px"><div style="font-size:11px;color:#4a7c59;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Added</div>${added.map(s=>`<div class="diff-block diff-added">${s.icon} ${s.name}</div>`).join('')}</div>`:''}${edited.length?`<div style="margin-bottom:12px"><div style="font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Edited</div>${edited.map(s=>`<div class="diff-block diff-edited">${s.icon} ${s.name}</div>`).join('')}</div>`:''}${deleted.length?`<div style="margin-bottom:12px"><div style="font-size:11px;color:#c45;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Removed</div>${deleted.map(s=>`<div class="diff-block diff-removed">${s.icon} ${s.name}</div>`).join('')}</div>`:''}`;
  const sh=draft.filter(s=>s.change_status!=='deleted').map(s=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid var(--border)"><span style="font-size:16px">${s.icon}</span><span style="font-size:13px;color:var(--text)">${s.name}</span><span style="font-size:10px;color:var(--text3);margin-left:auto">${s.rule_type}</span></div>`).join('');
  openPlannerSubpage('Push Changes',`
    <div style="margin-bottom:20px"><div class="form-label" style="margin-bottom:10px">What's changing</div>${dh||'<div style="font-size:12px;color:var(--text3)">No changes</div>'}</div>
    <div style="margin-bottom:24px"><div class="form-label" style="margin-bottom:10px">New schedule overview</div>${sh||'<div style="font-size:12px;color:var(--text3)">Empty</div>'}</div>
    <button onclick="confirmPush()" style="width:100%;padding:14px;border-radius:14px;border:none;background:var(--accent);color:var(--bg);font-size:14px;font-weight:600;cursor:pointer;font-family:var(--serif)">↑ Confirm Push</button>
    <button onclick="closePlannerSubpage()" style="width:100%;padding:12px;border-radius:14px;border:0.5px solid var(--border2);background:transparent;color:var(--text3);font-size:13px;cursor:pointer;font-family:var(--sans);margin-top:8px">Cancel</button>
  `);
}

async function confirmPush(){
  showToast('Pushing...');
  const sid=scheduleData.scheduleId;
  try{
    await fetch(`${SUPABASE_URL}/rest/v1/schedule_sessions?schedule_id=eq.${sid}`,{method:'DELETE',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
    for(const ds of scheduleData.draftSessions.filter(s=>s.change_status!=='deleted')){
      const lr=await fetch(`${SUPABASE_URL}/rest/v1/schedule_sessions`,{method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({schedule_id:sid,name:ds.name,icon:ds.icon,rule_type:ds.rule_type,rule_days:ds.rule_days,rule_day_of_month:ds.rule_day_of_month,rule_date:ds.rule_date,display_order:ds.display_order})});
      const [ls]=await lr.json();
      for(const item of ds._items||[]) await fetch(`${SUPABASE_URL}/rest/v1/session_items`,{method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({session_id:ls.id,item_type:item.item_type,routine_id:item.routine_id||null,step_name:item.step_name||null,product_id:item.product_id||null,order_index:item.order_index})});
    }
    await fetch(`${SUPABASE_URL}/rest/v1/draft_sessions?schedule_id=eq.${sid}&change_status=neq.deleted`,{method:'PATCH',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({change_status:'unchanged'})});
    await fetch(`${SUPABASE_URL}/rest/v1/draft_sessions?schedule_id=eq.${sid}&change_status=eq.deleted`,{method:'DELETE',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
    await fetch(`${SUPABASE_URL}/rest/v1/schedules?id=eq.${sid}`,{method:'PATCH',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({pushed_at:new Date().toISOString()})});
    showToast('✓ Schedule pushed live');closePlannerSubpage();await renderScheduler();
    if(document.getElementById('screen-selfcare')?.classList.contains('visible')) initSelfCare();
  }catch(e){console.error(e);showToast('Push failed');}
}
// ── GOALS ────────────────────────────────────────────────────────────────────
function renderGoals() {
  const el = document.getElementById('goalsContent');
  if(!plannerData.goals.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-glyph">🎯</div><div class="empty-title">No goals yet</div><div class="empty-sub">Tap + to set your first goal</div></div>`;
    return;
  }
  el.innerHTML = plannerData.goals.map(g => {
    const total = g.frequency_count * (g.frequency_type==='daily'?7:1);
    const dots  = Array.from({length:Math.min(total,14)},(_,i)=>`<div class="goal-dot${i<2?' done':''}"></div>`).join('');
    const deadline = g.deadline ? `<span style="font-size:10px;color:var(--text3)">until ${new Date(g.deadline+'T00:00:00').toLocaleDateString('en',{month:'short',day:'numeric'})}</span>` : '';
    return `<div class="goal-card" onclick="openGoalDetail('${g.id}')">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div class="goal-card-name">${g.name}</div>
        ${deadline}
      </div>
      <div class="goal-card-freq">${g.frequency_count}× per ${g.frequency_type}</div>
      <div class="goal-dots">${dots}</div>
    </div>`;
  }).join('');
}

function openGoalDetail(id) {
  const g = plannerData.goals.find(x=>x.id===id);
  if(!g) return;
  const freq = `${g.frequency_count}× per ${g.frequency_type}`;
  const deadline = g.deadline ? new Date(g.deadline+'T00:00:00').toLocaleDateString('en',{month:'long',day:'numeric',year:'numeric'}) : 'None';
  openPlannerSubpage('🎯 '+g.name, `
    <div class="form-field"><div class="form-label">Frequency</div><div style="font-size:14px;color:var(--text);margin-top:4px">${freq}</div></div>
    <div class="form-field"><div class="form-label">Deadline</div><div style="font-size:13px;color:var(--text2);margin-top:4px">${deadline}</div></div>
    <button onclick="deletePlannerItem('goals','${id}')" style="width:100%;padding:12px;border-radius:14px;border:0.5px solid var(--border2);background:transparent;color:var(--red,#c45);font-size:13px;cursor:pointer;font-family:var(--sans);margin-top:16px">Remove Goal</button>
  `);
}

// ── LAB ──────────────────────────────────────────────────────────────────────
function renderLab() {
  const el = document.getElementById('labContent');
  if(!plannerData.experiments.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-glyph">🧪</div><div class="empty-title">No experiments running</div><div class="empty-sub">Tap + to start testing a product</div></div>`;
    return;
  }
  const prodMap = {};
  plannerProducts.forEach(p => prodMap[p.id]=p);
  el.innerHTML = plannerData.experiments.map(exp => {
    const p   = prodMap[exp.product_id]||{};
    const img = p.cover_image_url||p.image_url;
    const days = Math.floor((new Date()-new Date(exp.start_date+'T00:00:00'))/86400000);
    const total = exp.end_date ? Math.floor((new Date(exp.end_date+'T00:00:00')-new Date(exp.start_date+'T00:00:00'))/86400000) : null;
    const pct  = total ? Math.min(Math.round((days/total)*100),100) : null;
    return `<div class="exp-card" onclick="openExpDetail('${exp.id}')">
      <div class="exp-card-img">${img?`<img src="${img}" alt="">`:'🧪'}</div>
      <div class="exp-card-info">
        <div class="exp-card-name">${exp.name}</div>
        <div class="exp-card-sub">${p.name||''} · Day ${days}${total?` of ${total}`:''}</div>
        ${pct!==null?`<div class="exp-progress"><div class="exp-progress-fill" style="width:${pct}%"></div></div>`:''}
        <div class="exp-card-sub" style="margin-top:4px">${exp.checkin_frequency} check-ins</div>
      </div>
      <span style="color:var(--text3);font-size:16px">›</span>
    </div>`;
  }).join('');
}

async function openExpDetail(id) {
  const exp = plannerData.experiments.find(x=>x.id===id);
  if(!exp) return;
  let checkins = [];
  try { checkins = await api('experiment_checkins',`?experiment_id=eq.${id}&order=date.desc`); } catch(e){}
  const checkinHtml = checkins.length
    ? checkins.map(c=>`<div class="checkin-card">
        <div class="checkin-date">${new Date(c.date+'T00:00:00').toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'})}</div>
        ${c.notes?`<div class="checkin-notes">${c.notes}</div>`:''}
      </div>`).join('')
    : `<div style="padding:12px 0;text-align:center;font-size:12px;color:var(--text3)">No check-ins yet</div>`;
  openPlannerSubpage('🧪 '+exp.name, `
    ${exp.notes?`<div class="form-field"><div class="form-label">Context</div><div style="font-size:13px;color:var(--text2);line-height:1.5;margin-top:4px">${exp.notes}</div></div>`:''}
    <div class="form-field">
      <div class="form-label">Check-ins</div>
      <div id="expCheckinList" style="margin-top:8px">${checkinHtml}</div>
      <textarea class="form-textarea" id="exp_checkin_notes" placeholder="How is your skin reacting? Any changes?" style="margin-top:12px"></textarea>
      <button onclick="addCheckin('${id}')" style="width:100%;padding:12px;border-radius:12px;border:none;background:var(--accent);color:var(--bg);font-size:13px;cursor:pointer;font-family:var(--sans);margin-top:8px">+ Log Check-in</button>
    </div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button onclick="concludeExperiment('${id}','keep')"  style="flex:1;padding:10px;border-radius:12px;border:0.5px solid var(--border);background:transparent;color:var(--text2);font-size:12px;cursor:pointer;font-family:var(--sans)">✓ Keep</button>
      <button onclick="concludeExperiment('${id}','maybe')" style="flex:1;padding:10px;border-radius:12px;border:0.5px solid var(--border);background:transparent;color:var(--text2);font-size:12px;cursor:pointer;font-family:var(--sans)">? Maybe</button>
      <button onclick="concludeExperiment('${id}','ditch')" style="flex:1;padding:10px;border-radius:12px;border:0.5px solid var(--border);background:transparent;color:var(--red,#c45);font-size:12px;cursor:pointer;font-family:var(--sans)">✕ Ditch</button>
    </div>
    <button onclick="deletePlannerItem('experiments','${id}')" style="width:100%;padding:12px;border-radius:14px;border:0.5px solid var(--border2);background:transparent;color:var(--red,#c45);font-size:13px;cursor:pointer;font-family:var(--sans);margin-top:8px">Abandon</button>
  `);
}

// ── SLIDE-IN SUBPAGE ──────────────────────────────────────────────────────────
function openPlannerSubpage(title, bodyHtml) {
  document.getElementById('plannerSubpageTitle').textContent = title;
  document.getElementById('plannerSubpageBody').innerHTML = bodyHtml;
  const sp = document.getElementById('plannerSubpage');
  sp.style.display = 'flex';
  requestAnimationFrame(()=>requestAnimationFrame(()=>sp.classList.add('open')));
}
function closePlannerSubpage() {
  const sp = document.getElementById('plannerSubpage');
  sp.classList.remove('open');
  setTimeout(()=>{ sp.style.display='none'; }, 380);
}

// ── ADD PICKER ────────────────────────────────────────────────────────────────
function openPlannerAdd() {
  const typeMap = { operator:'routine', scheduler:'scheduled', goals:'goal', lab:'experiment' };
  openOverlay('plannerAddOverlay');
}

// ── FORMS ────────────────────────────────────────────────────────────────────
function openPlannerForm(type) {
  plannerFormType = type;
  closeOverlay('plannerAddOverlay');
  const titles = { routine:'New Routine', scheduled:'Schedule Treatment', goal:'New Goal', experiment:'New Experiment' };
  document.getElementById('plannerFormTitle').textContent = titles[type]||'New';
  const prodOptions = plannerProducts.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  const body = document.getElementById('plannerFormBody');
  const saveBtn = (label,fn) => `<button onclick="${fn}" style="width:100%;padding:14px;border-radius:14px;border:none;background:var(--accent);color:var(--bg);font-size:14px;font-weight:500;cursor:pointer;font-family:var(--sans);margin-top:8px">${label}</button>`;
  const today = new Date().toISOString().split('T')[0];
  if(type==='routine') {
    body.innerHTML = `
      <div class="form-field"><div class="form-label">Name</div><input class="form-input" id="pf_name" placeholder="e.g. Sunday Reset"></div>
      <div class="form-field"><div class="form-label">Emoji</div><input class="form-input" id="pf_emoji" placeholder="✨" maxlength="4" style="width:80px"></div>
      ${saveBtn('Save Routine',"savePlannerItem('routine')")}`;
  } else if(type==='scheduled') {
    body.innerHTML = `
      <div class="form-field"><div class="form-label">Treatment name</div><input class="form-input" id="pf_name" placeholder="e.g. Clay mask"></div>
      <div class="form-field"><div class="form-label">Product (optional)</div><select class="form-input" id="pf_product" style="color:var(--text2)"><option value="">— none —</option>${prodOptions}</select></div>
      <div class="form-field"><div class="form-label">Date</div><input class="form-input" type="date" id="pf_date" value="${today}" style="color:var(--text2)"></div>
      <div class="form-field"><div class="form-label">Note (optional)</div><input class="form-input" id="pf_note" placeholder="Any reminder..."></div>
      ${saveBtn('Schedule It',"savePlannerItem('scheduled')")}`;
  } else if(type==='goal') {
    body.innerHTML = `
      <div class="form-field"><div class="form-label">Goal</div><input class="form-input" id="pf_name" placeholder="e.g. Use retinol 3× a week"></div>
      <div class="form-field"><div class="form-label">Frequency</div>
        <div style="display:flex;gap:8px;align-items:center">
          <input class="form-input" type="number" id="pf_freq_count" value="1" min="1" style="width:70px">
          <span style="color:var(--text3);font-size:13px">× per</span>
          <select class="form-input" id="pf_freq_type" style="flex:1;color:var(--text2)">
            <option value="daily">day</option>
            <option value="weekly" selected>week</option>
            <option value="monthly">month</option>
          </select>
        </div></div>
      <div class="form-field"><div class="form-label">Deadline (optional)</div><input class="form-input" type="date" id="pf_deadline" style="color:var(--text2)"></div>
      ${saveBtn('Set Goal',"savePlannerItem('goal')")}`;
  } else if(type==='experiment') {
    body.innerHTML = `
      <div class="form-field"><div class="form-label">Name</div><input class="form-input" id="pf_name" placeholder="e.g. Retinol 0.5% trial"></div>
      <div class="form-field"><div class="form-label">Product</div><select class="form-input" id="pf_product" style="color:var(--text2)"><option value="">— none —</option>${prodOptions}</select></div>
      <div class="form-field"><div class="form-label">Start date</div><input class="form-input" type="date" id="pf_start" value="${today}" style="color:var(--text2)"></div>
      <div class="form-field"><div class="form-label">End date (optional)</div><input class="form-input" type="date" id="pf_end" style="color:var(--text2)"></div>
      <div class="form-field"><div class="form-label">Check-in frequency</div>
        <select class="form-input" id="pf_checkin" style="color:var(--text2)">
          <option value="freeform">Freeform</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select></div>
      <div class="form-field"><div class="form-label">Notes / context</div><textarea class="form-textarea" id="pf_notes" placeholder="What are you testing? What's the hypothesis?"></textarea></div>
      ${saveBtn('Start Experiment',"savePlannerItem('experiment')")}`;
  }
  setTimeout(()=>openOverlay('plannerFormOverlay'), 350);
}

function closePlannerForm() { closeOverlay('plannerFormOverlay'); }

async function savePlannerItem(type) {
  const name = document.getElementById('pf_name')?.value.trim();
  if(!name) { showToast('Please enter a name'); return; }
  let table, data;
  if(type==='routine') {
    table='routines'; data={name,emoji:document.getElementById('pf_emoji')?.value.trim()||'✨'};
  } else if(type==='scheduled') {
    table='scheduled_treatments'; data={name,product_id:document.getElementById('pf_product')?.value||null,scheduled_date:document.getElementById('pf_date')?.value,note:document.getElementById('pf_note')?.value.trim()||null};
  } else if(type==='goal') {
    table='goals'; data={name,frequency_type:document.getElementById('pf_freq_type')?.value,frequency_count:parseInt(document.getElementById('pf_freq_count')?.value)||1,deadline:document.getElementById('pf_deadline')?.value||null};
  } else if(type==='experiment') {
    table='experiments'; data={name,product_id:document.getElementById('pf_product')?.value||null,start_date:document.getElementById('pf_start')?.value,end_date:document.getElementById('pf_end')?.value||null,checkin_frequency:document.getElementById('pf_checkin')?.value,notes:document.getElementById('pf_notes')?.value.trim()||null};
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(data)});
  if(res.ok) {
    showToast('✓ Saved');
    closePlannerForm();
    await loadPlannerData();
    switchPlannerTab(plannerActiveTab, true);
  } else { showToast('Error saving'); }
}

// ── SHARED ACTIONS ────────────────────────────────────────────────────────────
async function addCheckin(experimentId) {
  const notes = document.getElementById('exp_checkin_notes')?.value.trim();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/experiment_checkins`,{method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({experiment_id:experimentId,date:new Date().toISOString().split('T')[0],notes:notes||null})});
  if(res.ok) { showToast('✓ Logged'); openExpDetail(experimentId); }
}

async function concludeExperiment(id, verdict) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/experiments?id=eq.${id}`,{method:'PATCH',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({status:'concluded',verdict,end_date:new Date().toISOString().split('T')[0]})});
  if(res.ok) { showToast('Experiment concluded'); closePlannerSubpage(); await loadPlannerData(); renderLab(); }
}

async function markScheduledDone(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/scheduled_treatments?id=eq.${id}`,{method:'PATCH',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({done:true})});
  if(res.ok) { showToast('✓ Done'); closePlannerSubpage(); await loadPlannerData(); renderScheduler(); }
}

async function deletePlannerItem(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`,{method:'DELETE',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
  if(res.ok) { showToast('Removed'); closePlannerSubpage(); await loadPlannerData(); switchPlannerTab(plannerActiveTab,true); }
}

// ── END PLANNER ───────────────────────────────────────────────────────────────

</script>
</body>
