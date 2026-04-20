<script>
// ═══════════════ API CONFIG ═══════════════
const API_BASE = window.location.origin;
let authToken = null;

// ═══════════════ AUTHENTICATION ═══════════════
async function apiLogin(username, password) {
  try {
    const response = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (response.ok) {
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      return data;
    } else {
      throw new Error(data.error || 'Login failed');
    }
  } catch (error) {
    throw error;
  }
}

async function apiRegister(username, password) {
  try {
    const response = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Registration failed');
    return data;
  } catch (error) {
    throw error;
  }
}

function logout() {
  authToken = null;
  localStorage.removeItem('authToken');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appWrap').style.display = 'none';
}

// ═══════════════ API CALLS ═══════════════
async function apiCall(endpoint, options = {}) {
  const headers = { ...options.headers };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please login again.');
    }
    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

async function loadEscalations() {
  const response = await apiCall('/api/escalations');
  if (response.ok) {
    data = await response.json();
    // Convert API format to local format
    data = data.map(e => ({
      id: e.id,
      ts: new Date(e.created_at).getTime(),
      date: new Date(e.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date(e.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      client: e.customer_name,
      dcName: '', // Not in API
      courier: '', // Not in API
      order: e.tracking_id,
      awb: e.tracking_id,
      payment: '', // Not in API
      modeOfEsc: '', // Not in API
      type: e.issue_type,
      remarks: e.description,
      status: e.status,
      addedBy: 'API User', // Not in API
      addedByUser: '', // Not in API
      currentStatus: '', // Not in API
      updatedAt: new Date(e.updated_at).getTime()
    }));
  } else {
    data = [];
  }
}

async function createEscalation(escalation) {
  const response = await apiCall('/api/escalations', {
    method: 'POST',
    body: {
      tracking_id: escalation.awb,
      customer_name: escalation.client,
      phone: '',
      email: '',
      issue_type: escalation.type,
      description: escalation.remarks
    }
  });
  if (response.ok) {
    const newEsc = await response.json();
    await loadEscalations(); // Reload data
    return newEsc;
  } else {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create escalation');
  }
}

async function updateEscalation(id, updates) {
  const response = await apiCall(`/api/escalations/${id}`, {
    method: 'PUT',
    body: {
      tracking_id: updates.awb,
      customer_name: updates.client,
      issue_type: updates.type,
      description: updates.remarks,
      status: updates.status
    }
  });
  if (response.ok) {
    await loadEscalations(); // Reload data
    return await response.json();
  } else {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update escalation');
  }
}

async function deleteEscalation(id) {
  const response = await apiCall(`/api/escalations/${id}`, { method: 'DELETE' });
  if (response.ok) {
    await loadEscalations(); // Reload data
  } else {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete escalation');
  }
}

// ═══════════════ STATE ═══════════════
let data = [];
let activity = [];
let selId = null;
let mStatus = 'open';
let newType = 'Delay Delivery';
let upType = 'Delay Delivery';
let newMode = '';
let activeTab = 'all';
let activeMonth = 'all'; // 'all' or 'YYYY-MM'
let statFilter = 'open';
let nCount = 0;
let excelRows=[], excelHdrs=[];

const FIELDS=['client','dcName','modeOfEsc','awb','order','payment','type','remarks'];
const FLABELS={client:'Client Name',dcName:'DC Name',modeOfEsc:'Mode of Escalation',awb:'AWB No. (Mandatory)',order:'Order No. (Optional)',payment:'Payment Mode',type:'Escalation Type',remarks:'Action / Remarks'};
const AUTO_MAP={client:['client','client name','customer','name'],dcName:['dc name','dcname','dc','distribution center','warehouse'],modeOfEsc:['mode of escalation','mode of esc.','escalation mode','escalation channel','mode','escalation source'],courier:['courier','courier name'],order:['order','order no','order no.','order_no','order number'],awb:['awb','awb no','awb no.','awb number','tracking'],payment:['payment','payment mode'],type:['type','escalation type','issue type'],remarks:['remarks','action','action/remarks','notes','comments']};
const TAT_HOURS = 72;

// ═══════════════ LOGIN ═══════════════
async function doLogin(){
  const username=document.getElementById('lUser').value.trim();
  const password=document.getElementById('lPass').value;
  try {
    const result = await apiLogin(username, password);
    currentUser = { id: result.user.id, username: result.user.username, name: username };
    document.getElementById('loginScreen').style.display='none';
    document.getElementById('appWrap').style.display='block';
    document.getElementById('uName').textContent=username;
    document.getElementById('uAvatar').textContent=username.charAt(0).toUpperCase();
    resetFilters();
    hideAnalytics();
    activeTab='all';
    document.getElementById('tableTitle').textContent='📋 All Escalations';
    document.querySelectorAll('.ship-tab').forEach((t,i)=>{if(i===0)t.classList.add('active');else t.classList.remove('active');});
    await loadEscalations();
    render(); updateStats(); updateTabs();
  } catch (error) {
    document.getElementById('lErr').textContent = error.message;
    document.getElementById('lErr').style.display='block';
    document.getElementById('lUser').classList.add('err');
    document.getElementById('lPass').classList.add('err');
  }
}

function doLogout(){
  logout();
}

// ═══════════════ DATA ═══════════════
function genId(){ return 'ESC-'+Date.now().toString(36).toUpperCase().slice(-7); }
function fmtDate(ts){ return new Date(ts).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtTime(ts){ return new Date(ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}); }
function typeClass(t){
  const m={'Delay Delivery':'delay-delivery','Damaged Delivery':'damaged-delivery','Empty Packet':'empty-packet','Extra Charge':'extra-charge','Fake Delivery':'fake-delivery','Missing Article':'missing-article','Wrong Product Delivered':'wrong-product','Order Swapped':'order-swapped','Shipment Handover but Not Connected':'shipment-handover','Order delivered but marked RTO':'delivered-marked-rto','Other':'other'};
  return m[t]||'other';
}

function getTAT(e){
  if(e.status==='close') return {label:'Closed',cls:'tat-ok',pct:100};
  const hrs=(Date.now()-e.ts)/3600000;
  const pct=Math.min(100,(hrs/TAT_HOURS)*100);
  if(hrs>=TAT_HOURS) return {label:'BREACHED',cls:'tat-breach',pct:100};
  if(hrs>=TAT_HOURS*0.75) return {label:Math.round(TAT_HOURS-hrs)+'h left',cls:'tat-warn',pct};
  return {label:Math.round(TAT_HOURS-hrs)+'h left',cls:'tat-ok',pct};
}

// Clock
function tick(){ const n=new Date(); document.getElementById('hdrClock').textContent=n.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})+' · '+n.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}); }
tick(); setInterval(tick,1000);

// Backdrop close
['newMO','upMO','bulkMO','umMO','viewMO'].forEach(id=>document.getElementById(id).addEventListener('click',function(e){if(e.target===this)closeMo(id);}));

async function restoreSession(){
  const token = localStorage.getItem('authToken');
  if (token) {
    authToken = token;
    try {
      await loadEscalations();
      document.getElementById('loginScreen').style.display='none';
      document.getElementById('appWrap').style.display='block';
      document.getElementById('uName').textContent='User';
      document.getElementById('uAvatar').textContent='U';
      resetFilters();
      hideAnalytics();
      activeTab='all';
      document.getElementById('tableTitle').textContent='📋 All Escalations';
      document.querySelectorAll('.ship-tab').forEach((t,i)=>{if(i===0)t.classList.add('active');else t.classList.remove('active');});
      render(); updateStats(); updateTabs();
    } catch (error) {
      logout();
    }
  }
}

// ═══════════════ TYPE / STATUS SELECT ═══════════════
function selType(mode,t){
  if(mode==='new') newType=t; else upType=t;
  const pre=mode==='new'?'nT':'uT';
  const map={
    'Delay Delivery':[pre+'_delay_delivery','sel-delay-delivery'],
    'Damaged Delivery':[pre+'_damaged','sel-damaged'],
    'Empty Packet':[pre+'_empty','sel-empty'],
    'Extra Charge':[pre+'_extra','sel-extra'],
    'Fake Delivery':[pre+'_fake_delivery','sel-fake-delivery'],
    'Missing Article':[pre+'_missing','sel-missing'],
    'Wrong Product Delivered':[pre+'_wrong','sel-wrong'],
    'Order Swapped':[pre+'_swapped','sel-swapped'],
    'Shipment Handover but Not Connected':[pre+'_handover','sel-handover'],
    'Order delivered but marked RTO':[pre+'_rto','sel-rto'],
    'Other':[pre+'_other','sel-other']
  };
  Object.entries(map).forEach(([type,[id,cls]])=>{
    const el=document.getElementById(id); if(!el) return;
    el.className='type-opt'+(type===t?' '+cls:'');
  });
}
function selMode(m){
  newMode = m;
  document.getElementById('nM_whatsapp').className = 'type-opt' + (m==='WhatsApp' ? ' sel-handover' : '');
  document.getElementById('nM_email').className    = 'type-opt' + (m==='Email'     ? ' sel-extra'   : '');
  document.getElementById('nM_drive').className    = 'type-opt' + (m==='Drive'     ? ' sel-swapped' : '');
  document.getElementById('nModeErr').style.display = 'none';
  validateNew();
}
function selStatus(s){
  mStatus=s;
  document.getElementById('so_open').className='so'+(s==='open'?' s-open':'');
  document.getElementById('so_close').className='so'+(s==='close'?' s-close':'');
}

// ═══════════════ VALIDATE ═══════════════
function validateNew(){
  const client=document.getElementById('nClient').value.trim();
  const awb=document.getElementById('nAwb').value.trim();
  const remarks=document.getElementById('nRemarks').value.trim();
  const ok=client&&awb&&remarks&&newMode;
  document.getElementById('nSubmitBtn').disabled=!ok;
}
function validateUpdate(){
  const remarks=document.getElementById('uRemarks').value.trim();
  document.getElementById('uSubmitBtn').disabled=!(remarks);
}

// ═══════════════ NEW ESCALATION ═══════════════
function openNewModal(){
  const now=new Date();
  document.getElementById('nDate').value=now.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  document.getElementById('nTime').value=now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});
  document.getElementById('nLoggedBy').value='API User';
  ['nClient','nDcName','nOrder','nAwb','nRemarks'].forEach(id=>{const el=document.getElementById(id);el.value='';el.classList.remove('err');});
  document.getElementById('nAwbErr').style.display='none';
  document.getElementById('nModeErr').style.display='none';
  document.getElementById('nPayment').value='Prepaid';
  newType='Delay Delivery';
  newMode='';
  selType('new','Delay Delivery');
  // Reset mode buttons
  ['nM_whatsapp','nM_email','nM_drive'].forEach(id=>{ document.getElementById(id).className='type-opt'; });
  document.getElementById('nSubmitBtn').disabled=true;
  openMo('newMO');
}

async function submitNew(){
  const client=document.getElementById('nClient').value.trim();
  const awb=document.getElementById('nAwb').value.trim();
  const remarks=document.getElementById('nRemarks').value.trim();
  if(!client||!awb||!remarks){toast('t-err','⚠️ Missing Fields','Client, AWB and Remarks are required.');return;}
  if(!newMode){
    document.getElementById('nModeErr').style.display='block';
    toast('t-err','⚠️ Mode Required','Please select a Mode of Escalation (WhatsApp / Email / Drive).');
    return;
  }
  try {
    const escalation = {
      client, awb, remarks, type: newType, modeOfEsc: newMode,
      order: document.getElementById('nOrder').value.trim(),
      payment: document.getElementById('nPayment').value
    };
    await createEscalation(escalation);
    closeMo('newMO');
    toast('t-err','🚨 Escalation Logged',`${client} — ${newType}`);
    render(); updateStats(); updateTabs();
  } catch (error) {
    toast('t-err','❌ Error',error.message);
  }
}

// ═══════════════ VIEW MODAL ═══════════════
function openViewModal(id){
  const e=data.find(x=>x.id==id); if(!e) return;
  const tat=getTAT(e);
  document.getElementById('viewBody').innerHTML=`
    <div class="tat-info-bar">
      <div><div class="ti-lbl">TAT Status (${TAT_HOURS}h SLA)</div><div class="ti-val"><span class="tat-badge ${tat.cls}">${tat.label}</span></div></div>
      <div style="text-align:right"><div class="ti-lbl">Escalation ID</div><div class="ti-val" style="color:var(--ac);font-family:'DM Mono',monospace;font-size:13px">${e.id}</div></div>
    </div>
    <div class="view-section">
      <div class="vs-title">Shipment Details</div>
      <div class="vs-grid">
        <div class="vs-item"><div class="vs-lbl">Client Name</div><div class="vs-val">${e.client}</div></div>
        <div class="vs-item"><div class="vs-lbl">Order No.</div><div class="vs-val" style="color:var(--ac)">${e.order}</div></div>
        <div class="vs-item"><div class="vs-lbl">AWB No.</div><div class="vs-val">${e.awb||'—'}</div></div>
        <div class="vs-item"><div class="vs-lbl">Type</div><div class="vs-val"><span class="pb ${typeClass(e.type)}">${e.type}</span></div></div>
        <div class="vs-item"><div class="vs-lbl">Status</div><div class="vs-val"><span class="sb-badge ${e.status}">${e.status==='open'?'🔴 Open':'✅ Close'}</span></div></div>
        <div class="vs-item"><div class="vs-lbl">Logged At</div><div class="vs-val">${e.date} ${e.time||''}</div></div>
      </div>
    </div>
    <div class="view-section">
      <div class="vs-title">Action / Remarks</div>
      <div class="vs-remarks">${e.remarks||'—'}</div>
    </div>
    <button class="m-save green" onclick="closeMo('viewMO');openUpdateModal('${e.id}')" style="">✏️ Edit This Escalation</button>
  `;
  openMo('viewMO');
}

// ═══════════════ UPDATE MODAL ═══════════════
function openUpdateModal(id){
  const e=data.find(x=>x.id==id); if(!e) return;
  selId=id; mStatus=e.status;
  document.getElementById('moInfo').innerHTML=`
    <div class="di-item"><div class="di-lbl">Escalation ID</div><div class="di-val" style="color:var(--ac)">${e.id}</div></div>
    <div class="di-item"><div class="di-lbl">Logged At</div><div class="di-val">${e.date}${e.time?' · '+e.time:''}</div></div>
    <div class="di-item"><div class="di-lbl">Order No.</div><div class="di-val">${e.order}</div></div>
  `;
  document.getElementById('uClient').value=e.client||'';
  document.getElementById('uOrder').value=e.order||'';
  document.getElementById('uAwb').value=e.awb||'';
  document.getElementById('uPayment').value=e.payment||'Prepaid';
  document.getElementById('uRemarks').value=e.remarks||'';
  document.getElementById('uRemarks').classList.remove('err');
  document.getElementById('uCurrentStatus').value=e.currentStatus||'';
  document.getElementById('uCurrentStatus').classList.remove('err');
  selType('up',e.type||'Delay Delivery');
  selStatus(e.status||'open');
  document.getElementById('uSubmitBtn').disabled=true;
  openMo('upMO');
}

async function saveUpdate(){
  const remarks=document.getElementById('uRemarks').value.trim();
  const currentStatus=document.getElementById('uCurrentStatus').value.trim();
  if(!remarks){document.getElementById('uRemarks').classList.add('err');toast('t-err','⚠️ Remarks Required','Action/Remarks cannot be empty.');return;}
  const e=data.find(x=>x.id==selId); if(!e) return;
  const wasOpen=e.status==='open';
  try {
    await updateEscalation(selId, {
      client: document.getElementById('uClient').value.trim(),
      order: document.getElementById('uOrder').value.trim(),
      awb: document.getElementById('uAwb').value.trim(),
      payment: document.getElementById('uPayment').value,
      type: upType,
      remarks,
      status: mStatus
    });
    closeMo('upMO');
    if(wasOpen&&mStatus==='close') toast('t-ok','✅ Escalation Closed',`${e.client} — ${e.order}`);
    else toast('t-ok','💾 Updated',`${e.client} — ${e.order}`);
    render(); updateStats(); updateTabs();
  } catch (error) {
    toast('t-err','❌ Error',error.message);
  }
}

async function delEntry(id,ev){
  ev.stopPropagation();
  if(!confirm('Delete this escalation? This cannot be undone.')) return;
  try {
    await deleteEscalation(id);
    render(); updateStats(); updateTabs();
    toast('t-info','🗑️ Deleted','Escalation removed.');
  } catch (error) {
    toast('t-err','❌ Error',error.message);
  }
}

// ═══════════════ RENDER ═══════════════
function filterStat(f,el){ hideAnalytics(); statFilter=f; activeTab='all'; document.querySelectorAll('.stat').forEach(s=>s.classList.remove('active')); el.classList.add('active'); document.querySelectorAll('.ship-tab').forEach((t,i)=>{if(i===0)t.classList.add('active');else t.classList.remove('active');}); document.getElementById('tableTitle').textContent={all:'📋 All Escalations',open:'🔴 Open Escalations',close:'✅ Closed Escalations'}[f]||'📋 All Escalations'; render(); }
function getFiltered(){
  let d=[...data];
  const q=document.getElementById('srchInp').value.toLowerCase();
  if(q) d=d.filter(e=>[e.client,e.order,e.awb,e.type,e.remarks].join(' ').toLowerCase().includes(q));
  // Month filter
  if(activeMonth!=='all'){ const [myr,mmo]=activeMonth.split('-').map(Number); d=d.filter(e=>{ if(!e.ts) return false; const dd=new Date(e.ts); return dd.getFullYear()===myr&&dd.getMonth()+1===mmo; }); }
  if(activeTab==='fake') d=d.filter(e=>e.type==='Fake Delivery');
  else if(activeTab==='delay') d=d.filter(e=>e.type==='Delay Delivery');
  else if(activeTab==='reattempt') d=d.filter(e=>['Damaged Delivery','Empty Packet','Missing Article','Wrong Product Delivered','Order Swapped'].includes(e.type));
  else if(activeTab==='other') d=d.filter(e=>!['Fake Delivery','Delay Delivery','Damaged Delivery','Empty Packet','Missing Article','Wrong Product Delivered','Order Swapped','Extra Charge','Shipment Handover but Not Connected','Order delivered but marked RTO'].includes(e.type));
  else if(activeTab==='tab_open') d=d.filter(e=>e.status==='open');
  else if(activeTab==='tab_close') d=d.filter(e=>e.status==='close');
  else if(activeTab==='tab_breach') d=d.filter(e=>e.status==='open'&&((Date.now()-e.ts)/3600000)>=TAT_HOURS);
  if(statFilter==='open') d=d.filter(e=>e.status==='open');
  else if(statFilter==='close') d=d.filter(e=>e.status==='close');
  // Date range filter
  const from=document.getElementById('fFrom').value;
  const to=document.getElementById('fTo').value;
  if(from){
    const [fy,fm,fd]=from.split('-').map(Number);
    const fdDate=new Date(fy,fm-1,fd,0,0,0,0);
    d=d.filter(e=>new Date(e.ts)>=fdDate);
  }
  if(to){
    const [ty,tm,td]=to.split('-').map(Number);
    const tdDate=new Date(ty,tm-1,td,23,59,59,999);
    d=d.filter(e=>new Date(e.ts)<=tdDate);
  }
  return d;
}

function buildMonthShipTabs(){
  var monthMap={};
  data.forEach(function(e){ if(!e.ts) return; var d=new Date(e.ts); var k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); monthMap[k]=(monthMap[k]||0)+1; });
  var keys=Object.keys(monthMap).sort().reverse();
  var inner=document.getElementById('monthTabsInner');
  if(!inner) return;
  if(!keys.length){ inner.innerHTML='<span style="font-size:10px;color:var(--mt);font-family:DM Mono,monospace;padding:2px 4px">No data yet</span>'; return; }
  var allCount=data.length;
  var btnStyle='padding:3px 11px;border-radius:20px;font-size:10px;font-family:DM Mono,monospace;font-weight:700;cursor:pointer;border:1px solid;transition:all .2s;white-space:nowrap;margin-right:2px;';
  var activeStyle=btnStyle+'background:var(--ac);border-color:var(--ac);color:#fff;';
  var inactiveStyle=btnStyle+'background:var(--sf);border-color:var(--bd);color:var(--tx);';
  var html='<button onclick="setMonthTab(\'all\')" style="'+( activeMonth==='all' ? activeStyle : inactiveStyle )+'">All <span style="font-size:9px;opacity:.75">'+allCount+'</span></button>';
  keys.forEach(function(k){
    var parts=k.split('-'); var yr=parts[0]; var mo=parts[1];
    var lbl=new Date(parseInt(yr),parseInt(mo)-1,1).toLocaleString('en-IN',{month:'short',year:'2-digit'});
    var isAct=activeMonth===k;
    var cnt=monthMap[k];
    var openCnt=data.filter(function(e){ if(!e.ts) return false; var d=new Date(e.ts); return d.getFullYear()===parseInt(yr)&&d.getMonth()+1===parseInt(mo)&&e.status==='open'; }).length;
    var badge=openCnt ? '<span style="margin-left:3px;font-size:8px;background:rgba(220,38,38,.15);color:var(--rd);padding:1px 4px;border-radius:8px">'+openCnt+' Open</span>' : '';
    html+='<button onclick="setMonthTab(\''+k+'\')" style="'+(isAct?activeStyle:inactiveStyle)+'">'+lbl+' <span style="font-size:9px;opacity:.75">'+cnt+'</span>'+badge+'</button>';
  });
  inner.innerHTML=html;
}

function setMonthTab(key){
  activeMonth=key;
  buildMonthShipTabs();
  render();
  if(key==='all'){ document.getElementById('tableTitle').textContent='📋 All Escalations'; return; }
  var parts=key.split('-').map(Number);
  var lbl=new Date(parts[0],parts[1]-1,1).toLocaleString('en-IN',{month:'long',year:'numeric'});
  document.getElementById('tableTitle').textContent='📅 '+lbl;
}

function render(){
  const rows=getFiltered(); const tb=document.getElementById('tb');
  if(!rows.length){tb.innerHTML=`<tr><td colspan="15"><div class="empty"><div class="empty-ico">📭</div>No escalations found</div></td></tr>`;return;}
  tb.innerHTML=rows.map((e,i)=>{
    const isOpen=e.status==='open'; const tc=typeClass(e.type); const tat=getTAT(e);
    const dt=e.date+(e.time?`<br><span style="font-size:10px;color:var(--mt)">${e.time}</span>`:'');
    return `<tr class="${isOpen?'open-row':''}">
      <td class="mono" style="font-size:10px;color:var(--mt)">${i+1}</td>
      <td class="mono" style="font-size:11px;white-space:nowrap;line-height:1.5">${dt}</td>
      <td style="font-weight:600;color:var(--dark)">${e.client}</td>
      <td style="font-size:11px;color:var(--dark);font-weight:500">${e.dcName||'—'}</td>
      <td style="font-size:10px;color:var(--bl);font-family:'DM Mono',monospace">${e.modeOfEsc||e.courier||'—'}</td>
      <td class="mono" style="font-size:11px;color:var(--ac);font-weight:600">${e.order}</td>
      <td class="mono" style="font-size:11px">${e.awb||'—'}</td>
      <td><span class="pay-badge">${e.payment||'—'}</span></td>
      <td><span class="pb ${tc}">${e.type}</span></td>
      <td style="color:var(--mt);font-size:11px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(e.remarks||'').replace(/"/g,'&quot;')}">${e.remarks||'—'}</td>
      <td style="font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(e.currentStatus||'').replace(/"/g,'&quot;')}"><span style="color:${e.currentStatus?'var(--gn)':'var(--mt)'};font-family:'DM Mono',monospace">${e.currentStatus||'—'}</span></td>
      <td><span class="tat-badge ${tat.cls}">${tat.label}</span></td>
      <td><span class="sb-badge ${e.status}">${isOpen?'🔴 Open':'✅ Close'}</span></td>
      <td style="font-size:10px;color:var(--pp);font-family:'DM Mono',monospace;white-space:nowrap">${e.addedBy||'—'}</td>
      <td onclick="event.stopPropagation()" style="display:flex;gap:4px;align-items:center;flex-wrap:nowrap">
        <button class="act-btn vb" onclick="openViewModal('${e.id}')" title="View">👁</button>
        <button class="act-btn ub" onclick="openUpdateModal('${e.id}')" title="Update">✏️</button>
        <button class="act-btn db" onclick="delEntry('${e.id}',event)" title="Delete">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function updateStats(){
  const total=data.length;
  const open=data.filter(e=>e.status==='open').length;
  const closed=data.filter(e=>e.status==='close').length;
  document.getElementById('sTotal').textContent=total;
  document.getElementById('sOpen').textContent=open;
  document.getElementById('sClosed').textContent=closed;
  document.getElementById('sRate').textContent=total?Math.round(closed/total*100)+'%':'0%';
}
function updateTabs(){ 
  document.getElementById('tc_all').textContent=data.length; 
  document.getElementById('tc_fake').textContent=data.filter(e=>e.type==='Fake Delivery').length; 
  document.getElementById('tc_delay').textContent=data.filter(e=>e.type==='Delay Delivery').length; 
  document.getElementById('tc_reattempt').textContent=data.filter(e=>['Damaged Delivery','Empty Packet','Missing Article','Wrong Product Delivered','Order Swapped'].includes(e.type)).length; 
  document.getElementById('tc_other').textContent=data.filter(e=>!['Fake Delivery','Delay Delivery','Damaged Delivery','Empty Packet','Missing Article','Wrong Product Delivered','Order Swapped','Extra Charge','Shipment Handover but Not Connected','Order delivered but marked RTO'].includes(e.type)).length; 
  document.getElementById('tc_tab_open').textContent=data.filter(e=>e.status==='open').length; 
  document.getElementById('tc_tab_close').textContent=data.filter(e=>e.status==='close').length;
  document.getElementById('tc_tab_breach').textContent=data.filter(e=>e.status==='open'&&((Date.now()-e.ts)/3600000)>=TAT_HOURS).length;

  buildMonthShipTabs();
}

// ═══════════════ HELPERS ═══════════════
function openMo(id){
  const modal = document.getElementById(id);
  modal.classList.add('open');
}
function closeMo(id){document.getElementById(id).classList.remove('open');}

// ═══════════════ ANALYTICS ═══════════════
let analyticsActive = false;

function showAnalytics(el){
  analyticsActive = true;
  document.getElementById('tableTitle').textContent='📊 Analytics Dashboard';
  document.querySelector('.table-hdr').style.display='none';
  document.querySelector('.filter-bar').style.display='none';
  document.querySelector('.table-scroll').style.display='none';
  document.getElementById('analyticsPanel').style.display='block';
  renderAnalytics();
}

function hideAnalytics(){
  analyticsActive = false;
  document.querySelector('.table-hdr').style.display='';
  document.querySelector('.filter-bar').style.display='';
  document.querySelector('.table-scroll').style.display='';
  document.getElementById('analyticsPanel').style.display='none';
}

function setTab(tab,el){
  hideAnalytics();
  activeTab=tab;
  document.querySelectorAll('.ship-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  const titles={all:'📋 All Escalations',fake:'🚫 Fake Attempt',delay:'⏰ Delay in Delivery',reattempt:'🔄 Reattempt',other:'📌 Other',tab_open:'🔴 Open Escalations',tab_close:'✅ Closed Escalations',tab_breach:'⚠️ TAT Breached'};
  document.getElementById('tableTitle').textContent=titles[tab]||'Escalations';
  render();
}

// Analytics functions (simplified)
function renderAnalytics(){
  // Simplified analytics - you can expand this
  const total = data.length;
  const open = data.filter(e => e.status === 'open').length;
  const closed = data.filter(e => e.status === 'close').length;
  
  document.getElementById('anTotalKpi').innerHTML = `<div class="an-kpi-label">Total</div><div class="an-kpi-value" style="color:var(--ac)">${total}</div>`;
  document.getElementById('anOpenKpi').innerHTML = `<div class="an-kpi-label">Open</div><div class="an-kpi-value" style="color:var(--rd)">${open}</div>`;
  document.getElementById('anClosedKpi').innerHTML = `<div class="an-kpi-label">Closed</div><div class="an-kpi-value" style="color:var(--gn)">${closed}</div>`;
}

// Other functions (toast, etc.)
function toast(type,title,msg){ const icons={'t-ok':'✅','t-err':'🚨','t-info':'ℹ️','t-bulk':'📤'}; const d=document.createElement('div'); d.className=`toast ${type}`; d.innerHTML=`<div class="ti">${icons[type]||'ℹ️'}</div><div class="tco"><div class="ttl">${title}</div><div class="tmg">${msg}</div></div>`; document.getElementById('tc').appendChild(d); setTimeout(()=>{d.classList.add('fo');setTimeout(()=>d.remove(),300);},3800); }

// Initialize
window.addEventListener('load', () => {
  restoreSession();
});
</script>