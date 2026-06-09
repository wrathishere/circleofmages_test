// ─── CONFIG ───
const SHEET_ID = '1FFEg75S6-HKlN58pMROvtTkBry1FYGrVruPsUbaf4qA';
const SHEET_NAMES = { ranks: 'ranks', reqs: 'reqs', influenceTasks: 'influence points', tracker: 'tracker', layout: 'nodelayout' };
const RANK_ICON_PATH = 'images/ranks/';
const DEFAULT_RANK_ICON = `${RANK_ICON_PATH}default.png`;

// ─── FALLBACK DATA ───
const FALLBACK = {
  ranks: [
    { name:'Initiate',   description:'Every great mage begins with a single candle.', lore:'The first flame remembers the shape of every future star.', rewards:'L7 Pointy Hat; Sparkler; Arcane Studies', req1:'Offering to Goddess Freyja' },
    { name:'Apprentice', description:'The foundations of magic take root.', lore:'Patience is the first spell.', rewards:'Apprentice Robes; Herb Pouch; Rune Tablet', req1:'Novice Herbalism', req2:'Novice Potion-making', req3:'Novice Runework' },
    { name:'Enchanter',  description:'The threads of arcane weave between your fingers.', lore:'The circle recognizes those who can bind power.', rewards:'Feather Cape; Eitr Robes; 2 Bloodstones', 'influence points':'30', req1:'Advanced Herbalism', req2:'Advanced Potion-making', req3:'Advanced Runework', req4:'The Harrowing', req5:'Here Lies the Abyss', req6:'Horcrux Hunt' },
    { name:'Archmage',   description:'The apex of mortal mastery.', lore:'A crown orbits the Archmage like a loyal moon.', rewards:'L22 Staff; Embla Hood; Lava Bombs', 'influence points':'70', req1:'Expert Herbalism', req2:'Expert Potion-making', req3:'Expert Runework' }
  ],
  reqs: [],
  influenceTasks: [
    { name:'Airbender',        Description:'Glide from a mountain to the ocean.', Points:'2' },
    { name:'Happy Landing',    Description:'Fly and land at Spawn.',               Points:'2' },
    { name:'The Floor is Lava',Description:'Jump between Basalt platforms.',       Points:'4' },
    { name:'Excess Energies',  Description:'Donate 1 stack of Refined Eitr.',      Points:'4' },
    { name:'Wandcrafter',      Description:'Donate two fully upgraded magic weapons.', Points:'6' }
  ],
  tracker: [
    { 'Player Name':'Archmage Lyra','Ranking':'Enchanter','Influence Points':'34','Offering to Goddess Freyja':'TRUE','Novice Herbalism':'TRUE','Novice Potion-making':'TRUE','Novice Runework':'TRUE','The Harrowing':'TRUE','Advanced Herbalism':'TRUE','Advanced Potion-making':'TRUE','Advanced Runework':'TRUE','Here Lies the Abyss':'FALSE','Horcrux Hunt':'FALSE','Expert Herbalism':'FALSE','Expert Potion-making':'FALSE','Expert Runework':'FALSE','Airbender':'TRUE','Happy Landing':'TRUE','The Floor is Lava':'FALSE','Excess Energies':'FALSE','Wandcrafter':'FALSE' }
  ],
  nodelayout: [
    { name:'Initiate',   x:'50', y:'12', conn1:'Apprentice' },
    { name:'Apprentice', x:'25', y:'35', conn1:'Enchanter' },
    { name:'Enchanter',  x:'70', y:'35', conn1:'Archmage' },
    { name:'Archmage',   x:'50', y:'65' }
  ]
};

const REWARD_ICONS = ['✦','🎩','🪄','🧥','🔮','💎','💣','🧪','🏅','👑'];

let S = { ranks:[], reqRegistry:new Map(), influenceTasks:[], players:[], layout:new Map(), connections:[], selectedPlayer:null, selectedRankId:null, selectedReqName:null };

// ─── UTILS ───
const slugify = v => String(v||'').trim().toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const esc     = v => String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const normKey = v => String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
const isTruthy= v => ['true','yes','y','1','complete','completed','done'].includes(String(v).trim().toLowerCase());
const splitList=v => String(v||'').split(/[;|\n]+/).map(s=>s.trim()).filter(Boolean);
const cleanIcon=v => String(v||'').split('/').pop().replace(/[^a-zA-Z0-9._-]/g,'')||'default.png';

function getField(row, ...names) {
  const entries = Object.entries(row||{});
  for (const n of names) {
    const found = entries.find(([k])=>normKey(k)===normKey(n));
    if (found) return found[1];
  }
  return '';
}

// ─── CSV ───
const csvUrl = sheet => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${new URLSearchParams({tqx:'out:csv',sheet})}`;

function parseCsv(csv) {
  const rows=[]; let cur='',row=[],inQ=false;
  for (let i=0;i<csv.length;i++) {
    const c=csv[i],n=csv[i+1];
    if (c==='"'&&inQ&&n==='"'){cur+='"';i++;}
    else if(c==='"'){inQ=!inQ;}
    else if(c===','&&!inQ){row.push(cur);cur='';}
    else if((c==='\n'||c==='\r')&&!inQ){
      if(c==='\r'&&n==='\n')i++;
      row.push(cur);
      if(row.some(x=>x.trim()))rows.push(row);
      row=[];cur='';
    } else cur+=c;
  }
  row.push(cur);
  if(row.some(x=>x.trim()))rows.push(row);
  if(!rows.length)return[];
  const headers=rows[0].map(h=>h.trim());
  return rows.slice(1).map(cells=>headers.reduce((o,h,i)=>{o[h]=(cells[i]||'').trim();return o},{}));
}

async function loadSheet(name, fallback=[], optional=false) {
  try {
    const r = await fetch(csvUrl(name),{cache:'no-store'});
    if(!r.ok) throw new Error(r.status);
    const rows = parseCsv(await r.text());
    return rows.length||optional ? rows : fallback;
  } catch(e) {
    console.warn(`Fallback for ${name}:`,e);
    return fallback;
  }
}

async function loadAll() {
  const [ranks,reqs,influenceTasks,tracker,nodelayout] = await Promise.all([
    loadSheet(SHEET_NAMES.ranks,         FALLBACK.ranks),
    loadSheet(SHEET_NAMES.reqs,          FALLBACK.reqs, true),
    loadSheet(SHEET_NAMES.influenceTasks,FALLBACK.influenceTasks, true),
    loadSheet(SHEET_NAMES.tracker,       FALLBACK.tracker),
    loadSheet(SHEET_NAMES.layout,        FALLBACK.nodelayout)
  ]);
  return {ranks,reqs,influenceTasks,tracker,nodelayout};
}

// ─── PARSE ───
function buildReqRegistry(rows) {
  return new Map(rows.map(row=>{
    const name=getField(row,'name');
    if(!name) return null;
    return [normKey(name),{name, type:getField(row,'type')||'Requirement', description:getField(row,'description','Description')}];
  }).filter(Boolean));
}

function parseRank(row, index) {
  const name = getField(row,'name','rank name','rank');
  const reqs = [];
  Object.keys(row).forEach(key=>{
    const m = normKey(key).match(/^req\s*(\d+)$/);
    if(!m) return;
    const rName = row[key].trim();
    if(!rName) return;
    const reg = S.reqRegistry.get(normKey(rName));
    reqs.push({ name:rName, description:getField(row,`req${m[1]} description`,`req ${m[1]} description`)||reg?.description||'', type:reg?.type||'', isInfluence:false, _order:parseInt(m[1],10) });
  });
  const ipVal = parseInt(getField(row,'influence points','influence'),10);
  if(ipVal>0) reqs.push({ name:`${ipVal} Influence Points`, description:`Earn at least ${ipVal} influence points.`, type:'Influence', isInfluence:true, threshold:ipVal, _order:999 });
  reqs.sort((a,b)=>a._order-b._order);
  return { id:slugify(name||`rank-${index+1}`), order:index, name, description:getField(row,'description','rank description')||'', lore:getField(row,'lore','flavor')||'', rewards:splitList(getField(row,'rewards','reward')), requirements:reqs };
}

function parseLayoutAndConnections(rows) {
  const layout=new Map(), connections=[];
  rows.forEach(row=>{
    const name=getField(row,'name','rank');
    if(!name) return;
    const id=slugify(name);
    layout.set(id,{ x:parseCoord(getField(row,'x')), y:parseCoord(getField(row,'y')), icon:getField(row,'icon')||`${id}.png` });
    Object.keys(row).forEach(key=>{
      if(!/^conn\d+$/i.test(normKey(key))) return;
      const target=row[key].trim();
      if(target) connections.push({from:id, to:slugify(target)});
    });
  });
  return {layout,connections};
}

function parseCoord(v){ const n=Number(v); return Number.isFinite(n)?Math.min(93,Math.max(7,n)):50; }

function applyData(data) {
  S.reqRegistry   = buildReqRegistry(data.reqs);
  S.influenceTasks= data.influenceTasks;
  S.ranks         = data.ranks.map((r,i)=>parseRank(r,i)).filter(r=>r.name);
  S.players       = data.tracker;
  const {layout,connections} = parseLayoutAndConnections(data.nodelayout);
  S.layout        = layout;
  S.connections   = connections.length ? connections : S.ranks.slice(1).map((r,i)=>({from:S.ranks[i].id,to:r.id}));
}

// ─── PLAYER LOGIC ───
const getPlayerName = p => getField(p,'Player Name','player','name')||'Unknown';
const getInfluence  = p => parseInt(getField(p,'Influence Points','influence')||'0',10);

function reqDone(player, req) {
  if(req.isInfluence) return getInfluence(player) >= req.threshold;
  return isTruthy(getField(player, req.name));
}

function rankCompleted(rank, player) {
  return rank.requirements.length>0 && rank.requirements.every(r=>reqDone(player,r));
}

function rankStatus(rank, player, completedIds) {
  if(rankCompleted(rank,player)) return 'completed';
  const incoming = S.connections.filter(c=>c.to===rank.id);
  const prereqOk = incoming.length===0 || incoming.every(c=>completedIds.has(c.from));
  return prereqOk ? 'available' : 'locked';
}

function getProgress(player) {
  const allReqs    = [...new Set(S.ranks.flatMap(r=>r.requirements.map(q=>q.name)))];
  const completedIds = new Set(S.ranks.filter(r=>rankCompleted(r,player)).map(r=>r.id));
  const ranked     = S.ranks.map(r=>({...r, status:rankStatus(r,player,completedIds)}));
  const doneRanks  = ranked.filter(r=>r.status==='completed');
  const doneReqs   = allReqs.filter(n=>{ const req=S.ranks.flatMap(r=>r.requirements).find(r=>r.name===n); return req?reqDone(player,req):false; }).length;
  return {
    ranks:ranked,
    completedRequirements:doneReqs,
    totalRequirements:allReqs.length,
    percent:allReqs.length?Math.round(doneReqs/allReqs.length*100):0,
    currentRank:doneRanks[doneRanks.length-1]?.name||getField(player,'Ranking','rank')||'Unranked',
    nextRank:ranked.find(r=>r.status==='available')||ranked.find(r=>r.status!=='completed'),
    highestRemaining:[...ranked].reverse().find(r=>r.status!=='completed'),
    completedIds
  };
}

// ─── ICON ───
function getIconSrc(rank) {
  const l=S.layout.get(rank.id);
  return `${RANK_ICON_PATH}${cleanIcon(l?.icon||`${rank.id}.png`)}`;
}
function iconImg(rank, cls='rank-icon-img') {
  return `<img class="${esc(cls)}" src="${esc(getIconSrc(rank))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_RANK_ICON}'">`;
}

// ─── RENDER SIDEBAR ───
function renderSidebar(prog) {
  const p=S.selectedPlayer;
  const curRankObj=prog.ranks.find(r=>r.name===prog.currentRank)||prog.ranks.find(r=>r.status==='completed')||prog.ranks[0];
  const rem=prog.nextRank?.requirements.filter(r=>!reqDone(p,r)).length||0;
  document.getElementById('sidebarPlayerName').textContent=getPlayerName(p);
  document.getElementById('sidebarCurrentRank').textContent=prog.currentRank;
  document.getElementById('sidebarInfluence').textContent=getInfluence(p);
  document.getElementById('currentRankIcon').innerHTML=curRankObj?iconImg(curRankObj,'sidebar-rank-icon-img'):'✦';
  document.getElementById('progressPercent').textContent=`${prog.percent}%`;
  document.getElementById('progressCounts').textContent=`${prog.completedRequirements} / ${prog.totalRequirements} done`;
  document.getElementById('ringFill').style.strokeDashoffset=String(264-(264*prog.percent/100));
  document.getElementById('nextRankName').textContent=prog.nextRank?.name||'All complete';
  document.getElementById('nextRankDesc').textContent=prog.nextRank?`${rem} requirements remaining`:'The circle is complete';
  document.getElementById('finalGoalName').textContent=prog.highestRemaining?.name||'Legacy Secured';
  document.getElementById('finalGoalDesc').textContent=prog.highestRemaining?'Highest rank remaining':'No ranks remaining';
}

// ─── RENDER PLAYER SELECTOR ───
function renderSelector() {
  const sel=document.getElementById('playerSelect');
  sel.innerHTML=S.players.map((p,i)=>`<option value="${i}">${esc(getPlayerName(p))}</option>`).join('');
  sel.value=String(S.players.indexOf(S.selectedPlayer));
}

// ─── RENDER NODES ───
const statusLabel = s => s==='completed'?'Completed':s==='available'?'Available':'Locked';

function renderNodes(prog) {
  const canvas=document.getElementById('mapCanvas');
  // Remove old nodes only
  canvas.querySelectorAll('.node').forEach(n=>n.remove());

  prog.ranks.forEach(rank=>{
    const layout=S.layout.get(rank.id)||{x:50,y:50};
    const node=document.createElement('button');
    node.type='button';
    node.className=`node node-${rank.status}${rank.status==='available'?' pulse':''}`;
    node.id=`node-${rank.id}`;
    node.dataset.rankId=rank.id;
    // Set position individually — cssText would wipe transition
    node.style.left = `${layout.x}%`;
    node.style.top  = `${layout.y}%`;
    node.innerHTML=`
      <div class="node-header">
        <div class="node-icon-wrap">${iconImg(rank)}</div>
        <div class="node-title-group">
          <div class="node-title">${esc(rank.name)}</div>
          <div class="node-status s-${rank.status}"><span class="status-dot"></span>${statusLabel(rank.status)}</div>
        </div>
      </div>
      <div class="node-body">
        <div class="node-checklist">${rank.requirements.map(r=>{
          const done=reqDone(S.selectedPlayer,r);
          return `<div class="check-item${done?' done':''}"><span class="check-icon ${done?'c':'x'}">${done?'✓':'○'}</span>${esc(r.name)}</div>`;
        }).join('')}</div>
      </div>`;
    node.addEventListener('click',()=>{
      selectNode(rank.id);
      if(window.innerWidth<900) openDrawer();
    });
    canvas.appendChild(node);
  });
}

// ─── DRAW PATHS ───
function drawPaths(prog=getProgress(S.selectedPlayer)) {
  const canvas=document.getElementById('mapCanvas');
  const svg=document.getElementById('pathSvg');
  const rect=canvas.getBoundingClientRect();
  if(!rect.width) return; // canvas not visible yet

  function center(id){
    const el=document.getElementById(`node-${id}`);
    if(!el) return null;
    const r=el.getBoundingClientRect();
    return {x:r.left-rect.left+r.width/2, y:r.top-rect.top+r.height/2};
  }

  function pStatus(conn){
    const f=prog.ranks.find(r=>r.id===conn.from), t=prog.ranks.find(r=>r.id===conn.to);
    if(f?.status==='completed'&&t?.status==='completed') return 'completed';
    if(f?.status==='completed'&&t?.status==='available')  return 'available';
    return 'locked';
  }

  const colors={completed:'#60d090',available:'#9b6dff',locked:'#4a3a60'};
  svg.innerHTML=S.connections.map(conn=>{
    const a=center(conn.from), b=center(conn.to);
    if(!a||!b) return '';
    const cpx=a.x+(b.x-a.x)*0.5, st=pStatus(conn);
    return `<path d="M${a.x},${a.y} C${cpx},${a.y} ${cpx},${b.y} ${b.x},${b.y}" fill="none" stroke="${colors[st]}" stroke-width="2.5" class="path-${st}" stroke-linecap="round"/>`;
  }).join('');
}

// ─── SELECT NODE → RIGHT PANEL ───
function renderReqRow(req, player, index) {
  const done=reqDone(player,req);
  const sel=S.selectedReqName===req.name;
  const extra=req.isInfluence?` data-influence="1" data-threshold="${req.threshold}"`:'';
  return `<button type="button" class="req-row req-button ${done?'done':'pending'}${sel?' selected':''}" data-req-index="${index}"${extra}>
    <div class="req-circle">${done?'✓':'○'}</div>
    <div class="req-name">${esc(req.name)}${req.isInfluence?` <span class="ip-badge">🔮 ${getInfluence(player)} / ${req.threshold}</span>`:''}</div>
  </button>`;
}

function selectNode(id) {
  const prog=getProgress(S.selectedPlayer);
  const rank=prog.ranks.find(r=>r.id===id)||prog.nextRank||prog.ranks[0];
  if(!rank) return;
  if(S.selectedRankId!==rank.id) S.selectedReqName=null;
  S.selectedRankId=rank.id;

  document.getElementById('detailIcon').innerHTML=iconImg(rank,'detail-rank-icon-img');
  document.getElementById('detailTitle').textContent=rank.name.toUpperCase();
  document.getElementById('detailSub').textContent=statusLabel(rank.status);
  document.getElementById('detailLore').textContent=rank.description||rank.lore||'No description.';
  document.getElementById('detailReqs').innerHTML=rank.requirements.map((r,i)=>renderReqRow(r,S.selectedPlayer,i)).join('')||'<div class="req-row pending">No requirements.</div>';
  document.getElementById('detailRewards').innerHTML=rank.rewards.map((r,i)=>`<div class="reward-tile"><div class="reward-tile-icon">${REWARD_ICONS[i%REWARD_ICONS.length]}</div><div class="reward-tile-name">${esc(r)}</div></div>`).join('')||'<div class="reward-tile"><div class="reward-tile-icon">✦</div><div class="reward-tile-name">None</div></div>';

  document.querySelectorAll('.node').forEach(n=>n.classList.toggle('selected',n.dataset.rankId===rank.id));

  // Req row click handlers
  document.querySelectorAll('.req-button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const idx=Number(btn.dataset.reqIndex);
      const req=rank.requirements[idx];
      if(!req) return;
      if(req.isInfluence) { openInfluenceModal(); return; }
      S.selectedReqName=req.name;
      document.querySelectorAll('.req-button').forEach(b=>b.classList.toggle('selected',Number(b.dataset.reqIndex)===idx));
      renderReqDetail(req);
    });
  });

  renderReqDetail(rank.requirements.find(r=>r.name===S.selectedReqName)||null);
}

function renderReqDetail(req) {
  const nameEl=document.getElementById('requirementDetailName');
  const typeEl=document.getElementById('requirementDetailType');
  const descEl=document.getElementById('requirementDetailDescription');
  if(!req){ nameEl.textContent='Select a requirement to view details.'; typeEl.textContent=''; descEl.textContent=''; return; }
  nameEl.textContent=req.name;
  typeEl.textContent=req.type?`Type: ${req.type}`:'';
  descEl.textContent=req.description||'No description provided.';
}

// ─── INFLUENCE MODAL ───
function openInfluenceModal() {
  const player=S.selectedPlayer;
  const influence=getInfluence(player);
  const tasks=S.influenceTasks;

  const rows=tasks.map(t=>{
    const name=getField(t,'name');
    const desc=getField(t,'description','Description');
    const pts =getField(t,'points','Points');
    const notes=getField(t,'notes','Notes');
    const done=isTruthy(getField(player,name));
    return `<div class="ip-row${done?' ip-done':''}">
      <div class="ip-check">${done?'✓':'○'}</div>
      <div class="ip-info">
        <div class="ip-name">${esc(name)}</div>
        ${desc?`<div class="ip-desc">${esc(desc)}</div>`:''}
        ${notes?`<div class="ip-notes">${esc(notes)}</div>`:''}
      </div>
      <div class="ip-pts">${pts?`+${pts}`:''}</div>
    </div>`;
  }).join('');

  document.getElementById('ipModalInfluence').textContent=`${influence} pts earned`;
  document.getElementById('ipTaskList').innerHTML=rows||'<div style="color:var(--text3);padding:12px;font-style:italic;">No tasks found.</div>';
  document.getElementById('ipModal').classList.add('open');
}

function closeInfluenceModal() {
  document.getElementById('ipModal').classList.remove('open');
}

// ─── MOBILE DRAWER ───
function openDrawer() {
  document.getElementById('rightPanel').classList.add('drawer-open');
  document.getElementById('drawerBackdrop').classList.add('visible');
}
function closeDrawer() {
  document.getElementById('rightPanel').classList.remove('drawer-open');
  document.getElementById('drawerBackdrop').classList.remove('visible');
}

// ─── BOTTOM NAV ───
function initBottomNav() {
  let leftVisible=false;
  document.querySelectorAll('.bnav-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const view=btn.dataset.view;
      document.querySelectorAll('.bnav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const lp=document.getElementById('leftPanel');
      if(view==='map'){
        lp.classList.remove('mobile-visible');
        closeDrawer();
        leftVisible=false;
      } else if(view==='player'){
        lp.classList.add('mobile-visible');
        closeDrawer();
        leftVisible=true;
      } else if(view==='detail'){
        lp.classList.remove('mobile-visible');
        openDrawer();
        leftVisible=false;
      }
    });
  });
}

// ─── FULL RENDER ───
function renderApp() {
  if(!S.selectedPlayer) return;
  const prog=getProgress(S.selectedPlayer);
  renderSelector();
  renderSidebar(prog);
  renderNodes(prog);
  // Double rAF: first frame nodes are inserted, second frame they have layout
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    drawPaths(prog);
    selectNode(S.selectedRankId||prog.nextRank?.id||prog.ranks[0]?.id);
  }));
}

async function refresh() {
  const name=getPlayerName(S.selectedPlayer), rid=S.selectedRankId;
  applyData(await loadAll());
  S.selectedPlayer=S.players.find(p=>getPlayerName(p)===name)||S.players[0];
  S.selectedRankId=S.ranks.some(r=>r.id===rid)?rid:null;
  renderApp();
}

// ─── INIT ───
async function init() {
  applyData(await loadAll());
  S.selectedPlayer=S.players[0];

  document.getElementById('playerSelect').addEventListener('change',e=>{
    S.selectedPlayer=S.players[Number(e.target.value)];
    S.selectedRankId=null; S.selectedReqName=null;
    renderApp();
  });

  document.getElementById('drawerBackdrop').addEventListener('click',closeDrawer);
  document.getElementById('drawerClose').addEventListener('click',closeDrawer);
  document.getElementById('ipModalClose').addEventListener('click',closeInfluenceModal);
  document.getElementById('ipModal').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeInfluenceModal(); });

  initBottomNav();
  renderApp();
  setInterval(refresh,60000);
}

let rafResize;
window.addEventListener('resize',()=>{ cancelAnimationFrame(rafResize); rafResize=requestAnimationFrame(()=>drawPaths()); });
window.addEventListener('DOMContentLoaded', init);

// ─── DIAGNOSTIC (remove after fix confirmed) ───
function diagnose() {
  const canvas = document.getElementById('mapCanvas');
  const cr = canvas.getBoundingClientRect();
  console.log('[diagnose] canvas rect:', JSON.stringify(cr));
  console.log('[diagnose] S.ranks:', S.ranks.map(r=>r.name));
  console.log('[diagnose] S.layout keys:', [...S.layout.keys()]);
  console.log('[diagnose] S.players count:', S.players.length);
  console.log('[diagnose] selectedPlayer:', S.selectedPlayer ? 'yes' : 'null');
  const nodes = document.querySelectorAll('.node');
  console.log('[diagnose] DOM nodes found:', nodes.length);
  nodes.forEach(n => {
    const r = n.getBoundingClientRect();
    console.log(`  node #${n.id} left=${n.style.left} top=${n.style.top} | rect w=${r.width} h=${r.height} x=${r.x} y=${r.y} | visible=${r.width>0&&r.height>0}`);
  });
}
// Run diagnosis 1 second after load
setTimeout(diagnose, 1000);
