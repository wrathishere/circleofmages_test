// ─── CONFIG ───
const SHEET_ID = '1FFEg75S6-HKlN58pMROvtTkBry1FYGrVruPsUbaf4qA';
const SHEET_NAMES = { 
  ranks: 'ranks', 
  reqs: 'reqs', 
  influenceTasks: 'influence points', 
  tracker: 'tracker', 
  layout: 'nodelayout',
  influenceStat: 'influence stat',
  arcaneMastery: 'arcane_mastery',
  hostedEvents: 'hosted_events',
  sections: 'sections',
  supremeArts: 'supreme_arts'
};
const RANK_ICON_PATH   = 'images/ranks/';
const REWARD_ICON_PATH = 'images/rewards/';
const DEFAULT_RANK_ICON   = `${RANK_ICON_PATH}default.png`;
const DEFAULT_REWARD_ICON = `${REWARD_ICON_PATH}default.png`;

const FALLBACK = {
  ranks: [
    { name:'Initiate',   description:'Every great mage begins with a single candle.', rewards:'L7 Pointy Hat; Sparkler', req1:'Offering to Goddess Freyja' },
    { name:'Apprentice', description:'The foundations of magic take root.',             rewards:'Apprentice Robes; Herb Pouch', req1:'Novice Herbalism', req2:'Novice Potion-making', req3:'Novice Runework' },
    { name:'Enchanter',  description:'The threads of arcane weave between your fingers.', rewards:'Feather Cape; Eitr Robes', 'influence points':'30', req1:'Advanced Herbalism', req2:'Advanced Potion-making', req3:'Advanced Runework', req4:'The Harrowing', req5:'Here Lies the Abyss', req6:'Horcrux Hunt' },
    { name:'Archmage',   description:'The apex of mortal mastery.', rewards:'L22 Staff; Embla Hood', 'influence points':'70', req1:'Expert Herbalism', req2:'Expert Potion-making', req3:'Expert Runework' }
  ],
  reqs: [],
  influenceTasks: [
    { name:'Airbender', description:'Glide from a mountain to the ocean.', points:'2' },
    { name:'Happy Landing', description:'Fly and land at Spawn.', points:'2' },
    { name:'Excess Energies', description:'Donate 1 stack of Refined Eitr.', points:'4' }
  ],
  tracker: [],
  nodelayout: [
    { name:'Initiate',   x:'50', y:'12', conn1:'Apprentice' },
    { name:'Apprentice', x:'25', y:'35', conn1:'Enchanter' },
    { name:'Enchanter',  x:'70', y:'35', conn1:'Archmage' },
    { name:'Archmage',   x:'50', y:'65' }
  ]
};

const REWARD_ICONS = ['✦','🎩','🪄','🧥','🔮','💎','💣','🧪','🏅','👑'];

const SUPREME_WAYS = [
  { code: 'ke', name: 'Knight Enchanter' },
  { code: 'aa', name: 'Arcane Alchemist' },
  { code: 'ds', name: 'Draconic Scholar' },
  { code: 'hc', name: 'High Conjurer' }
];

let S = {
  ranks:[], reqRegistry:new Map(), influenceTasks:[],
  players:[], layout:new Map(), connections:[],
  selectedPlayer:null, selectedRankId:null, selectedReqName:null,
  selectedReqData:null, activeReqTab:'instruction',
  activeIpTask:null,
  influenceStat:[],
  supremeArts:[],
  arcaneMastery:[],
  hostedEvents:[],
  sections:new Map(),
  activeAmTab:'description', activeAmQuest:null,
  activeHeTab:'description', activeHeQuest:null
};

// ─── UTILS ───
const slugify   = v => String(v||'').trim().toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const esc       = v => String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const normKey   = v => String(v||'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[^\x20-\x7E]/g,'');
const isTruthy  = v => ['true','yes','y','1','complete','completed','done'].includes(String(v).trim().toLowerCase());
const splitList = v => String(v||'').split(/[;|\n]+/).map(s=>s.trim()).filter(Boolean);
const cleanIcon = v => String(v||'').split('/').pop().replace(/[^a-zA-Z0-9._-]/g,'')||'default.png';

function parseFormatting(text) {
  if (!text) return '';
  const lines = esc(text).split(/\r?\n/);
  let html = '', inList = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listMatch = line.match(/^\s*([-*+•])\s+(.*)$/);
    if (listMatch) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${listMatch[2]}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += line;
      if (i < lines.length - 1 && !lines[i+1]?.match(/^\s*([-*+•])\s+/)) html += '<br>';
    }
  }
  if (inList) html += '</ul>';
  return html.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>');
}

function getField(row, ...names) {
  if (!row) return '';
  const entries = Object.entries(row);
  for (const name of names) {
    const want = normKey(name);
    const found = entries.find(([k]) => normKey(k) === want);
    if (found && found[1] !== undefined) return found[1];
  }
  return '';
}

// ─── CSV ───
function parseCsv(csv) {
  if (csv.charCodeAt(0) === 0xFEFF) csv = csv.slice(1);
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
  const headers=rows[0].map(h=>h.trim().replace(/^\uFEFF/,'').replace(/[^\x20-\x7E\u00C0-\uFFFF]/g,'').trim());
  return rows.slice(1).map(cells=>headers.reduce((o,h,i)=>{o[h]=(cells[i]||'').trim();return o},{}));
}

const csvUrl = sheet => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${new URLSearchParams({tqx:'out:csv',sheet})}`;

async function loadSheet(name, fallback=[], optional=false) {
  try {
    const r = await fetch(csvUrl(name),{cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const rows = parseCsv(await r.text());
    return (rows.length||optional) ? rows : fallback;
  } catch(e) {
    console.warn(`[loadSheet] "${name}" failed:`,e.message);
    return fallback;
  }
}

async function loadAll() {
  const [ranks,reqs,influenceTasks,tracker,nodelayout,influenceStat,arcaneMastery,hostedEvents,sections,supremeArts] = await Promise.all([
    loadSheet(SHEET_NAMES.ranks,         FALLBACK.ranks),
    loadSheet(SHEET_NAMES.reqs,          FALLBACK.reqs, true),
    loadSheet(SHEET_NAMES.influenceTasks,FALLBACK.influenceTasks, true),
    loadSheet(SHEET_NAMES.tracker,       FALLBACK.tracker),
    loadSheet(SHEET_NAMES.layout,        FALLBACK.nodelayout),
    loadSheet(SHEET_NAMES.influenceStat, [], true),
    loadSheet(SHEET_NAMES.arcaneMastery, [], true),
    loadSheet(SHEET_NAMES.hostedEvents,  [], true),
    loadSheet(SHEET_NAMES.sections,      [], true),
    loadSheet(SHEET_NAMES.supremeArts,   [], true)
  ]);
  return {ranks,reqs,influenceTasks,tracker,nodelayout,influenceStat,arcaneMastery,hostedEvents,sections,supremeArts};
}

// ─── PARSERS ───
function buildReqRegistry(rows) {
  return new Map(rows.map(row=>{
    const name=getField(row,'name');
    if(!name) return null;
    return [normKey(name),{
      name,
      type:getField(row,'type')||'Requirement',
      description:getField(row,'description','Description'),
      instruction:getField(row,'instruction','instructions'),
      rules:getField(row,'rules'),
      lore:getField(row,'lore','flavor')
    }];
  }).filter(Boolean));
}

function parseRank(row, index) {
  const name = getRankName(row);
  const reqs = [];
  Object.keys(row).forEach(key=>{
    const m=normKey(key).match(/^req\s*(\d+)$/);
    if(!m) return;
    const rName=row[key].trim();
    if(!rName) return;
    const reg=S.reqRegistry.get(normKey(rName));
    reqs.push({name:rName,description:reg?.description||'',type:reg?.type||'',instruction:reg?.instruction||'',rules:reg?.rules||'',lore:reg?.lore||'',isInfluence:false,isArcaneMastery:false,isSupremeArts:false,_order:parseInt(m[1],10)});
  });
  const ipVal=parseInt(getField(row,'influence points','influence'),10);
  if(ipVal>0) reqs.push({name:`${ipVal} Influence Points`,description:`Earn at least ${ipVal} influence points.`,type:'Influence',isInfluence:true,threshold:ipVal,_order:999});
  const amVal=parseInt(getField(row,'arcane_mastery','arcane mastery'),10);
  if(amVal>0) reqs.push({name:`${amVal} Arcane Mastery`,description:`Complete any ${amVal} Arcane Mastery quests.`,type:'Arcane Mastery',isArcaneMastery:true,threshold:amVal,_order:998});
  SUPREME_WAYS.forEach((way,idx)=>{
    const saVal=parseInt(getField(row,`supreme_arts_${way.code}`),10);
    if(saVal>0) reqs.push({name:`${saVal} ${way.name}`,description:`Complete any ${saVal} ${way.name} quests.`,type:`Supreme Arts - ${way.name}`,isSupremeArtsByType:true,supremeWayCode:way.code,supremeWayName:way.name,threshold:saVal,_order:997-idx});
  });
  reqs.sort((a,b)=>a._order-b._order);

  const rewards = [];
  for(let i=1;i<=20;i++){
    const rName = getField(row,`reward${i}`);
    if(!rName) {
      if(i===1){
        const plain=splitList(getField(row,'rewards','reward'));
        if(plain.length) { plain.forEach(p=>rewards.push({name:p,description:'',image:''})); }
      }
      break;
    }
    rewards.push({
      name:rName,
      description:getField(row,`reward${i}_description`,`reward${i} description`),
      image:getField(row,`reward${i}_image`,`reward${i} image`)
    });
  }

  return {
    id:slugify(name||`rank-${index+1}`),order:index,name,
    description:getField(row,'description','rank description')||'',
    lore:getField(row,'lore','flavor')||'',
    image:getField(row,'image')||'',
    rewards,requirements:reqs
  };
}

function parseCoord(v){const n=Number(v);return Number.isFinite(n)?Math.min(90,Math.max(10,n)):50;}

function parseLayoutAndConnections(rows) {
  const layout=new Map(),connections=[];
  rows.forEach(row=>{
    const name=getField(row,'name','rank')||Object.values(row)[0]||'';
    if(!name) return;
    const id=slugify(name);
    const hasPx=getField(row,'px')!=='' && getField(row,'py')!=='';
    layout.set(id,{
      x:parseCoord(getField(row,'x')),
      y:parseCoord(getField(row,'y')),
      px:hasPx?parseCoord(getField(row,'px')):null,
      py:hasPx?parseCoord(getField(row,'py')):null,
      icon:getField(row,'icon')||`${id}.png`
    });
    Object.keys(row).forEach(key=>{
      if(!/^conn\d+$/i.test(normKey(key))) return;
      const target=row[key].trim();
      if(target) connections.push({from:id,to:slugify(target)});
    });
  });
  return {layout,connections};
}

function buildSectionsMap(rows) {
  const map = new Map();
  rows.forEach(row => {
    const section = normKey(getField(row, 'section'));
    if (!section) return;
    map.set(section, {
      description:  getField(row, 'description'),
      announcement: getField(row, 'announcement'),
      active:       isTruthy(getField(row, 'announcement toggle', 'announcement_toggle', 'anouncement toogle'))
    });
  });
  return map;
}

function getSection(key) {
  return S.sections.get(normKey(key)) || {description:'', announcement:'', active:false};
}

function renderSectionInfo(descId, annId, annTextId, wrapId, sectionKey) {
  const s = getSection(sectionKey);
  const wrap = document.getElementById(wrapId);
  const descEl = document.getElementById(descId);
  const annEl = document.getElementById(annId);
  const annTextEl = document.getElementById(annTextId);
  if (!wrap) return;
  const hasDesc = !!s.description;
  const hasAnn = s.active && !!s.announcement;
  wrap.style.display = (hasDesc || hasAnn) ? '' : 'none';
  if (descEl) { descEl.textContent = s.description; descEl.style.display = hasDesc ? '' : 'none'; }
  if (annEl) annEl.style.display = hasAnn ? '' : 'none';
  if (annTextEl) annTextEl.textContent = s.announcement;
}

// ─── ARCANE MASTERY HELPERS ───
function getAmDoneCount(player) {
  if (!player) return 0;
  return S.arcaneMastery.filter(q => isTruthy(getField(player, getField(q, 'name')))).length;
}

function amQuestDone(player, quest) {
  if (!player) return false;
  return isTruthy(getField(player, getField(quest, 'name')));
}

function applyData(data) {
  S.reqRegistry    = buildReqRegistry(data.reqs);
  S.influenceTasks = data.influenceTasks;
  S.ranks          = data.ranks.map((r,i)=>parseRank(r,i)).filter(r=>r.name);
  S.players        = data.tracker;
  S.influenceStat  = data.influenceStat || [];
  S.arcaneMastery  = data.arcaneMastery || [];
  S.hostedEvents   = data.hostedEvents || [];
  S.supremeArts    = data.supremeArts || [];
  S.sections       = buildSectionsMap(data.sections || []);
  const {layout,connections} = parseLayoutAndConnections(data.nodelayout);
  S.layout      = layout;
  S.connections = connections.length ? connections : S.ranks.slice(1).map((r,i)=>({from:S.ranks[i].id,to:r.id}));
}

// ─── SUPREME ARTS HELPERS ───
function getSaDoneCount(player) {
  if (!player) return 0;
  return S.supremeArts.filter(q => isTruthy(getField(player, getField(q, 'name')))).length;
}

function saQuestDone(player, quest) {
  if (!player) return false;
  return isTruthy(getField(player, getField(quest, 'name')));
}

function getSaDoneCountByWay(player, wayName) {
  if (!player) return 0;
  return S.supremeArts.filter(q => {
    const types = getSupremeTypes(q);
    const hasWay = types.some(t => normKey(t) === normKey(wayName));
    return hasWay && saQuestDone(player, q);
  }).length;
}

function getSupremeEarned(player, task) {
  const row = getPlayerSupremeStatRow(player);
  if (!row) return 0;
  const tName = getField(task, 'name');
  const val = getField(row, tName);
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function getPlayerSupremeStatRow(player) {
  if (!player || !S.supremeArts.length) return null;
  const pName = normKey(getPlayerName(player));
  return S.supremeArts.find(row => {
    const rowName = getField(row, 'Player Name', 'player', 'name');
    return normKey(rowName) === pName;
  });
}

// ─── INFLUENCE STAT ROW MATCHERS ───
function getPlayerInfluenceStatRow(player) {
  if (!player || !S.influenceStat.length) return null;
  const pName = normKey(getPlayerName(player));
  return S.influenceStat.find(row => {
    const rowName = getField(row, 'Player Name', 'player', 'name');
    return normKey(rowName) === pName;
  });
}

function getTaskEarnedPoints(player, task) {
  const row = getPlayerInfluenceStatRow(player);
  if (!row) return 0;
  const tName = getField(task, 'name');
  const val = getField(row, tName);
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 0 : parsed;
}

// ─── BOTTOM NAVIGATION HELPER ───
function setBnavActive(view) {
  document.querySelectorAll('.bnav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

// ─── PLAYER LOGIC ───
const getPlayerName = p => getField(p,'Player Name','player','name')||'Unknown';
const getInfluence  = p => parseInt(getField(p,'Influence Points','influence')||'0',10);

function getRankName(row) {
  const byField = getField(row,'name','rank name','rank');
  if (byField) return byField;
  return Object.values(row||{})[0] || '';
}

function reqDone(player, req) {
  if(!player) return false;
  if(req.isInfluence) return getInfluence(player)>=req.threshold;
  if(req.isArcaneMastery) return getAmDoneCount(player)>=req.threshold;
  if(req.isSupremeArtsByType) return getSaDoneCountByWay(player,req.supremeWayName)>=req.threshold;
  return isTruthy(getField(player,req.name));
}

function rankCompleted(rank, player) {
  if(!player) return false;
  return rank.requirements.length>0 && rank.requirements.every(r=>reqDone(player,r));
}

function rankStatus(rank, player, completedIds) {
  if(!player) return 'neutral';
  if(rankCompleted(rank,player)) return 'completed';
  const incoming=S.connections.filter(c=>c.to===rank.id);
  const prereqOk=incoming.length===0||incoming.every(c=>completedIds.has(c.from));
  return prereqOk?'available':'locked';
}

function getProgress(player) {
  if(!player) {
    const ranked=S.ranks.map(r=>({...r,status:'neutral'}));
    return {ranks:ranked,completedRequirements:0,totalRequirements:0,percent:0,currentRank:null,nextRank:null,highestRemaining:null,completedIds:new Set()};
  }
  const allReqNames=[...new Set(S.ranks.flatMap(r=>r.requirements.map(q=>q.name)))];
  const completedIds=new Set(S.ranks.filter(r=>rankCompleted(r,player)).map(r=>r.id));
  const ranked=S.ranks.map(r=>({...r,status:rankStatus(r,player,completedIds)}));
  const doneRanks=ranked.filter(r=>r.status==='completed');
  const doneReqCount=allReqNames.filter(n=>{
    const req=S.ranks.flatMap(r=>r.requirements).find(r=>r.name===n);
    return req?reqDone(player,req):false;
  }).length;
  return {
    ranks:ranked,
    completedRequirements:doneReqCount,
    totalRequirements:allReqNames.length,
    percent:allReqNames.length?Math.round(doneReqCount/allReqNames.length*100):0,
    currentRank:doneRanks[doneRanks.length-1]?.name||getField(player,'Ranking','rank')||'Unranked',
    nextRank:ranked.find(r=>r.status==='available')||ranked.find(r=>r.status!=='completed'),
    highestRemaining:[...ranked].reverse().find(r=>r.status!=='completed'),
    completedIds
  };
}

// ─── ICONS ───
function getIconSrc(rank){
  const img=(rank.image||'').trim();
  if(img) return /^https?:\/\//i.test(img) ? img : `${RANK_ICON_PATH}${cleanIcon(img)}`;
  const l=S.layout.get(rank.id);
  return `${RANK_ICON_PATH}${cleanIcon(l?.icon||`${rank.id}.png`)}`;
}
function iconImg(rank,cls='rank-icon-img'){return `<img class="${esc(cls)}" src="${esc(getIconSrc(rank))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_RANK_ICON}'">`;}

// ─── RENDER STATUS BAR ───
function renderStatusBar(prog) {
  const player = S.selectedPlayer;
  const metaEl = document.getElementById('sbPlayerMeta');
  const hintEl = document.getElementById('selectNameHint');
  if(hintEl) hintEl.classList.toggle('hidden', !!player);
  if(player){
    document.getElementById('sbCurrentRank').textContent = prog.currentRank||'Unranked';
    document.getElementById('sbInfluence').textContent   = `${getInfluence(player)} Influence`;
    metaEl.style.display = '';
  } else {
    metaEl.style.display = 'none';
  }
  const pct = prog.percent;
  document.getElementById('progressPercent').textContent = player ? `${pct}%` : '—';
  document.getElementById('ringFill').style.strokeDashoffset = player ? String(264-(264*pct/100)) : '264';
  document.getElementById('progressCounts').textContent = player
    ? `${prog.completedRequirements} / ${prog.totalRequirements} Complete`
    : 'Select a player';
  document.getElementById('nextRankName').textContent = player
    ? (prog.nextRank?.name || 'All Complete')
    : '—';
  document.getElementById('nextRankDesc').textContent = player
    ? (prog.nextRank ? `${prog.nextRank.requirements.filter(r=>!reqDone(player,r)).length} Requirements Remaining` : 'The Circle is Complete')
    : '—';
  document.getElementById('sbDuelWin').textContent = player
    ? (isTruthy(getField(player,'Mage Duel','mage duel')) ? '✓' : '✕')
    : '—';
  document.getElementById('sbEraCount').textContent = player
    ? (getField(player,'Multi Era Count','multi era count','MultiEraCount')||'0')
    : '—';
}

function renderSelector() {
  const sel = document.getElementById('playerSelect');
  const current = S.selectedPlayer ? S.players.indexOf(S.selectedPlayer) : -1;
  sel.innerHTML = `<option value="" disabled${current===-1?' selected':''}>Select a Player</option>`
    + S.players.map((p,i)=>`<option value="${i}"${i===current?' selected':''}>${esc(getPlayerName(p))}</option>`).join('');
}

// ─── RENDER NODES ───
function isMobileView(){ return window.innerWidth < 900; }

const statusLabel = s => s==='completed'?'Completed':s==='available'?'Available':s==='neutral'?'View Info':'Locked';

function renderNodes(prog) {
  const canvas = document.getElementById('mapCanvas');
  canvas.querySelectorAll('.node').forEach(n=>n.remove());
  const mobile = isMobileView();
  const firstRank = prog.ranks[0];
  const showStartBadge = firstRank && firstRank.status !== 'completed';
  const doneRanks = prog.ranks.filter(r=>r.status==='completed');
  const currentRankId = doneRanks.length ? doneRanks[doneRanks.length-1].id : null;
  prog.ranks.forEach(rank=>{
    const layout=S.layout.get(rank.id)||{x:50,y:50,px:null,py:null};
    const left = (mobile && layout.px!=null) ? layout.px : layout.x;
    const top  = (mobile && layout.py!=null) ? layout.py : layout.y;
    const isCurrent = rank.id===currentRankId;
    const node=document.createElement('button');
    node.type='button';
    node.className=`node node-${rank.status}${rank.status==='available'?' pulse':''}${isCurrent?' node-current':''}`;
    node.id=`node-${rank.id}`;
    node.style.left=`${left}%`;
    node.style.top=`${top}%`;
    node.dataset.rankId=rank.id;
    node.innerHTML=`
      ${showStartBadge && rank.id===firstRank.id ? '<div class="node-start-badge">Start Here</div>' : ''}
      ${isCurrent ? '<div class="node-current-badge">You Are Here</div>' : ''}
      <div class="node-header">
        <div class="node-icon-wrap">${iconImg(rank)}</div>
        <div class="node-title-group">
          <div class="node-title">${esc(rank.name)}</div>
          <div class="node-status s-${rank.status}"><span class="status-dot"></span>${statusLabel(rank.status)}</div>
        </div>
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
  if(!rect.width||!rect.height) return;
  function center(id){const el=document.getElementById(`node-${id}`);if(!el)return null;const r=el.getBoundingClientRect();return{x:r.left-rect.left+r.width/2,y:r.top-rect.top+r.height/2};}
  function pStatus(conn){
    const f=prog.ranks.find(r=>r.id===conn.from),t=prog.ranks.find(r=>r.id===conn.to);
    if(f?.status==='completed'&&t?.status==='completed') return 'completed';
    if(f?.status==='completed'&&t?.status==='available')  return 'available';
    if(f?.status==='neutral'||t?.status==='neutral')      return 'neutral';
    return 'locked';
  }
  const colors={completed:'#caa157',available:'#8456c4',locked:'#3a3344',neutral:'#3a3344'};
  svg.innerHTML=S.connections.map(conn=>{
    const a=center(conn.from),b=center(conn.to);
    if(!a||!b) return '';
    const cpx=a.x+(b.x-a.x)*0.5,st=pStatus(conn);
    return `<path d="M${a.x},${a.y} C${cpx},${a.y} ${cpx},${b.y} ${b.x},${b.y}" fill="none" stroke="${colors[st]}" stroke-width="2.5" class="path-${st}" stroke-linecap="round"/>`;
  }).join('');
}

// ─── DETAIL PANEL ───
function renderReqRow(req, player, index) {
  const done=reqDone(player,req);
  const sel=S.selectedReqName===req.name;
  let badge = '';
  if(req.isInfluence) badge = ` <span class="ip-badge">🔮 ${getInfluence(player)} / ${req.threshold}</span>`;
  if(req.isArcaneMastery) badge = ` Mancies` + ` <span class="ip-badge am-badge">🧙‍♂️ ${getAmDoneCount(player)} / ${req.threshold}</span>`;
  if(req.isSupremeArtsByType) badge = ` Arts` + ` <span class="ip-badge sa-badge">✨ ${getSaDoneCountByWay(player,req.supremeWayName)} / ${req.threshold}</span>`;
  return `<button type="button" class="req-row req-button ${done?'done':'pending'}${sel?' selected':''}" data-req-index="${index}">
    <div class="req-circle">${done?'✓':'○'}</div>
    <div class="req-name">${esc(req.name)}${badge}</div>
  </button>`;
}

function renderRewardItem(reward, index) {
  const imgSrc = reward.image ? `${REWARD_ICON_PATH}${cleanIcon(reward.image)}` : '';
  const imgHtml = imgSrc
    ? `<img src="${esc(imgSrc)}" alt="" loading="lazy" onerror="this.onerror=null;this.style.display='none';this.parentElement.innerHTML='${REWARD_ICONS[index%REWARD_ICONS.length]}';">`
    : REWARD_ICONS[index%REWARD_ICONS.length];
  return `<div class="reward-item">
    <div class="reward-item-img">${imgHtml}</div>
    <div class="reward-item-info">
      <div class="reward-item-name">${esc(reward.name)}</div>
      ${reward.description?`<div class="reward-item-desc">${parseFormatting(reward.description)}</div>`:''}
    </div>
  </div>`;
}

function showDetailPanel(show) {
  document.getElementById('detailEmpty').style.display   = show ? 'none' : '';
  document.getElementById('detailContent').style.display = show ? ''     : 'none';
}

function selectNode(id) {
  const prog=getProgress(S.selectedPlayer);
  const rank=prog.ranks.find(r=>r.id===id)||prog.nextRank||prog.ranks[0];
  if(!rank) return;
  if(S.selectedRankId!==rank.id) S.selectedReqName=null;
  S.selectedRankId=rank.id;

  showDetailPanel(true);
  document.getElementById('detailIcon').innerHTML    = iconImg(rank,'detail-rank-icon-img');
  document.getElementById('detailTitle').textContent = rank.name.toUpperCase();
  document.getElementById('detailSub').textContent   = statusLabel(rank.status);
  document.getElementById('detailLore').innerHTML    = parseFormatting(rank.description||rank.lore||'');

  document.getElementById('detailReqs').innerHTML = rank.requirements.map((r,i)=>renderReqRow(r,S.selectedPlayer,i)).join('')||'<div class="req-row pending">No requirements.</div>';
  document.getElementById('detailRewards').innerHTML = rank.rewards.map(renderRewardItem).join('')||'<div style="color:var(--text3);font-size:12px;font-style:italic">No rewards listed.</div>';

  document.getElementById('reqDetailCard').style.display='none';
  document.querySelectorAll('.node').forEach(n=>n.classList.toggle('selected',n.dataset.rankId===rank.id));

  document.querySelectorAll('.req-button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const idx=Number(btn.dataset.reqIndex);
      const req=rank.requirements[idx];
      if(!req) return;
      if(req.isInfluence){openInfluenceModal();return;}
      if(req.isArcaneMastery){openAmModal();return;}
      if(req.isSupremeArtsByType){openSaModal(req.supremeWayName);return;}
      S.selectedReqName=req.name;
      S.selectedReqData=req;
      S.activeReqTab='instruction';
      document.querySelectorAll('.req-button').forEach(b=>b.classList.toggle('selected',Number(b.dataset.reqIndex)===idx));
      renderReqDetail(req);
    });
  });

  renderReqDetail(rank.requirements.find(r=>r.name===S.selectedReqName)||null);
}

// ─── REQ DETAILS & TABS ───
function renderReqDetail(req) {
  const card=document.getElementById('reqDetailCard');
  if(!req){card.style.display='none';return;}
  card.style.display='';

  document.getElementById('requirementDetailName').textContent=req.name;
  document.getElementById('requirementDetailType').textContent=req.type?`Type: ${req.type}`:'';
  document.getElementById('requirementDetailDescription').innerHTML=parseFormatting(req.description||(req?'No description.':''));

  const hasTabs = req.instruction||req.rules||req.lore;
  const tabsEl = document.getElementById('reqTabs');
  const contentEl = document.getElementById('reqTabContent');

  if(hasTabs) {
    tabsEl.style.display='';
    renderReqTab(req, S.activeReqTab);

    tabsEl.querySelectorAll('.req-tab').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.tab===S.activeReqTab);
      btn.onclick=()=>{
        S.activeReqTab=btn.dataset.tab;
        tabsEl.querySelectorAll('.req-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===S.activeReqTab));
        renderReqTab(req, S.activeReqTab);
      };
    });
  } else {
    tabsEl.style.display='none';
    contentEl.innerHTML='';
  }
}

function renderReqTab(req, tab) {
  const contentEl=document.getElementById('reqTabContent');
  const val = tab==='instruction'?req.instruction:tab==='rules'?req.rules:req.lore;
  contentEl.innerHTML = val ? parseFormatting(val) : '<span style="color:var(--text3);font-style:italic">No content available.</span>';
}

// ─── INFLUENCE MODAL (EXPANDED DASHBOARD) ───
function getIpTypes(task) {
  const t1=getField(task,'type1');
  const t2=getField(task,'type2');
  const t3=getField(task,'type3');
  return [t1,t2,t3].map(t => String(t || '').trim()).filter(Boolean);
}

function getIpTaskStats(player) {
  const tasks = S.influenceTasks;
  const totalMax = tasks.reduce((s,t)=>s+parseInt(getField(t,'max point','max points','maxpoints')||getField(t,'points','Points')||'0',10),0);
  const earned = player ? getInfluence(player) : 0; 
  const done = player ? tasks.filter(t => {
    const earnedPts = getTaskEarnedPoints(player, t);
    const maxPts = parseInt(getField(t,'max point','max points','maxpoints')||getField(t,'points','Points')||'0',10);
    return earnedPts >= maxPts;
  }).length : 0;
  return {earned, totalMax, remaining:Math.max(0,totalMax-earned), pct:totalMax?Math.round(earned/totalMax*100):0, done, total:tasks.length};
}

function buildTrackData() {
  const trackMap = {};
  S.influenceTasks.forEach(t=>{
    getIpTypes(t).forEach(type=>{
      if(!trackMap[type]) trackMap[type]={name:type,earned:0,max:0};
      const pts = parseInt(getField(t,'points','Points')||'0',10);
      const maxPts = parseInt(getField(t,'max point','max points')||pts,10);
      trackMap[type].max += maxPts;
    });
  });

  if(S.selectedPlayer) {
    S.influenceTasks.forEach(t=>{
      const earnedPts = getTaskEarnedPoints(S.selectedPlayer, t);
      getIpTypes(t).forEach(type=>{
        if(trackMap[type]) {
          trackMap[type].earned += earnedPts;
        }
      });
    });
  }
  return Object.values(trackMap);
}

// ─── SUPREME ARTS MODAL (EXPANDED DASHBOARD) ───

function getSupremeTypes(supreme) {
  const t1=getField(supreme,'type1');
  const t2=getField(supreme,'type2');
  const t3=getField(supreme,'type3');
  return [t1,t2,t3].map(t => String(t || '').trim()).filter(Boolean);
}

function getAmTypes(quest) {
  const t1=getField(quest,'type1');
  const t2=getField(quest,'type2');
  const t3=getField(quest,'type3');
  return [t1,t2,t3].map(t => String(t || '').trim()).filter(Boolean);
}

function buildTrackSupremeData() {
  const trackMap = {};
  S.supremeArts.forEach(q => {
    getSupremeTypes(q).forEach(type => {
      if(!trackMap[type]) trackMap[type] = {name:type,earned:0,max:0};
      trackMap[type].max += 1;
      if (S.selectedPlayer && saQuestDone(S.selectedPlayer, q)) {
        trackMap[type].earned += 1;
      }
    });
  });
  return Object.values(trackMap);
}

function buildTrackAmData() {
  const trackMap = {};
  S.arcaneMastery.forEach(q => {
    getAmTypes(q).forEach(type => {
      if(!trackMap[type]) trackMap[type] = {name:type,earned:0,max:0};
      trackMap[type].max += 1;
      if (S.selectedPlayer && amQuestDone(S.selectedPlayer, q)) {
        trackMap[type].earned += 1;
      }
    });
  });
  return Object.values(trackMap);
}

function openInfluenceModal() {
  const player = S.selectedPlayer;
  const stats = getIpTaskStats(player);

  // Overview
  document.getElementById('ipStatEarned').textContent    = stats.earned;
  document.getElementById('ipStatMax').textContent       = stats.totalMax;
  document.getElementById('ipStatRemaining').textContent = stats.remaining;
  document.getElementById('ipStatPct').textContent       = `${stats.pct}%`;
  document.getElementById('ipModalInfluence').textContent = `${stats.earned} / ${stats.totalMax} pts`;

  // Achievement tracks
  const tracks = buildTrackData();
  const tracksEl = document.getElementById('ipTracks');
  const tracksSection = document.getElementById('ipTracksSection');
  if(tracks.length) {
    tracksSection.style.display='';
    tracksEl.innerHTML = tracks.map(tr=>`
      <div class="ip-track">
        <div class="ip-track-name">${esc(tr.name)}</div>
        <div class="ip-track-bar-wrap"><div class="ip-track-bar" style="width:${tr.max?Math.round(tr.earned/tr.max*100):0}%"></div></div>
        <div class="ip-track-meta">${tr.earned} / ${tr.max} pts</div>
      </div>`).join('');
  } else {
    tracksSection.style.display='none';
  }

  // Populate category filter
  const catSel = document.getElementById('ipFilterCategory');
  const cats = [...new Set(S.influenceTasks.map(t=>getField(t,'category')).filter(Boolean))];
  catSel.innerHTML = `<option value="">All Categories</option>` + cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');

  // Populate Type filter dynamically from type1, type2, type3 columns
  const typeSel = document.getElementById('ipFilterRepeat');
  const typeSet = new Set();
  S.influenceTasks.forEach(t => {
    getIpTypes(t).forEach(type => {
      if (type.trim()) typeSet.add(type.trim());
    });
  });
  const dynamicTypes = [...typeSet].sort();
  typeSel.innerHTML = `<option value="">All Types</option>` + dynamicTypes.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');

  renderSectionInfo('ipSectionDesc','ipSectionAnnouncement','ipSectionAnnouncementText','ipSectionInfo','influence_modal');
  renderIpTaskList();

  // Hide detail task sidebar permanently and let the list take full width
  document.getElementById('ipTaskDetail').style.display = 'none';
  document.getElementById('ipTaskList').style.display = '';

  document.getElementById('ipModal').classList.add('open');
}

function renderIpTaskList() {
  const player = S.selectedPlayer;
  const catFilter    = document.getElementById('ipFilterCategory').value;
  const statusFilter = document.getElementById('ipFilterStatus').value;
  const typeFilter   = document.getElementById('ipFilterRepeat').value;
  const search       = document.getElementById('ipFilterSearch').value.trim().toLowerCase();

  const filtered = S.influenceTasks.filter(t=>{
    const name   = getField(t,'name');
    const cat    = getField(t,'category');
    
    const earnedPts = player ? getTaskEarnedPoints(player, t) : 0;
    const maxPts = parseInt(getField(t,'max point','max points','maxpoints')||getField(t,'points','Points')||'0',10);
    const done = player ? (earnedPts >= maxPts) : false;

    if(catFilter && cat !== catFilter) return false;
    if(statusFilter==='completed' && !done) return false;
    if(statusFilter==='incomplete' && done) return false;
    
    // Dynamic type filter check
    if (typeFilter) {
      const taskTypes = getIpTypes(t).map(x => x.toLowerCase());
      if (!taskTypes.includes(typeFilter.toLowerCase())) return false;
    }
    
    if(search && !name.toLowerCase().includes(search) && !getField(t,'description','Description').toLowerCase().includes(search)) return false;
    return true;
  });

  if(!filtered.length) {
    document.getElementById('ipTaskList').innerHTML=`<div style="color:var(--text3);padding:24px;text-align:center;font-style:italic;">No tasks found.</div>`;
    return;
  }

  const groups={};
  filtered.forEach(t=>{
    const cat=getField(t,'category')||'General';
    if(!groups[cat]) groups[cat]=[];
    groups[cat].push(t);
  });

  let html='';
  for(const [catName,tasks] of Object.entries(groups)){
    html+=`<div class="ip-category-group">
      <div class="ip-category-header">${esc(catName)}</div>
      <div class="ip-category-list">
        ${tasks.map(t=>{
          const name  = getField(t,'name');
          const desc  = getField(t,'description','Description');
          const notes = getField(t,'notes','Notes');
          const maxPts = parseInt(getField(t,'max point','max points','maxpoints')||getField(t,'points','Points')||'0',10);
          const rep   = getField(t,'repeatability');
          const types = getIpTypes(t);
          
          const earnedPts = player ? getTaskEarnedPoints(player, t) : 0;
          const done = player ? (earnedPts >= maxPts) : false;
          const started = player ? (earnedPts > 0 && earnedPts < maxPts) : false;
          
          const statusClass = done ? ' ip-done' : (started ? ' ip-started' : '');
          const checkSymbol = done ? '✓' : (started ? '◐' : '○');
          const ptsDisplay = player ? `${earnedPts} / ${maxPts}` : (maxPts ? `+${maxPts}` : '');

          return `<div class="ip-row${statusClass}" data-task-name="${esc(name)}">
            <div class="ip-check">${checkSymbol}</div>
            <div class="ip-info">
              <div class="ip-name">${esc(name)}</div>
              ${desc?`<div class="ip-desc">${parseFormatting(desc)}</div>`:''}
              ${notes?`<div class="ip-notes"><strong>Notes:</strong> ${parseFormatting(notes)}</div>`:''}
              ${types.length?`<div class="ip-tags">${types.map(t=>`<span class="ip-tag">${esc(t)}</span>`).join('')}</div>`:''}
            </div>
            ${rep?`<div class="ip-repeat">${esc(rep)}</div>`:''}
            <div class="ip-pts">${ptsDisplay}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }
  document.getElementById('ipTaskList').innerHTML=html;
}

function clearIpFilters() {
  document.getElementById('ipFilterCategory').value='';
  document.getElementById('ipFilterStatus').value='';
  document.getElementById('ipFilterRepeat').value='';
  document.getElementById('ipFilterSearch').value='';
  renderIpTaskList();
}

function clearAmFilters() {
  document.getElementById('amFilterStatus').value='';
  document.getElementById('amFilterType').value='';
  document.getElementById('amFilterSearch').value='';
  renderAmQuestList();
}

function clearSaFilters() {
  document.getElementById('saFilterStatus').value='';
  document.getElementById('saFilterType').value='';
  document.getElementById('saFilterSearch').value='';
  renderSaQuestList();
}

function closeInfluenceModal() {
  document.getElementById('ipModal').classList.remove('open');
  S.activeIpTask=null;
  setBnavActive('map');
}

// ─── ARCANE MASTERY MODAL ───
function openAmModal() {
  const player = S.selectedPlayer;
  const total = S.arcaneMastery.length;
  const done = getAmDoneCount(player);

  document.getElementById('amStatDone').textContent      = done;
  document.getElementById('amStatTotal').textContent     = total;
  document.getElementById('amStatRemaining').textContent = Math.max(0, total - done);
  document.getElementById('amStatPct').textContent       = total ? `${Math.round(done/total*100)}%` : '0%';
  document.getElementById('amModalProgress').textContent = `${done} / ${total} Mastered`;

  renderSectionInfo('amSectionDesc','amSectionAnnouncement','amSectionAnnouncementText','amSectionInfo','arcane_mastery_modal');

  const typeSel = document.getElementById('amFilterType');
  const typeSet = new Set();
  S.arcaneMastery.forEach(q => getAmTypes(q).forEach(type => { if (type.trim()) typeSet.add(type.trim()); }));
  const dynamicTypes = [...typeSet].sort();
  typeSel.innerHTML = `<option value="">All Types</option>` + dynamicTypes.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');

  const tracks = buildTrackAmData();
  const tracksEl = document.getElementById('amTracks');
  const tracksSection = document.getElementById('amTracksSection');
  if(tracks.length) {
    tracksSection.style.display='';
    tracksEl.innerHTML = tracks.map(tr=>`
      <div class="ip-track">
        <div class="ip-track-name">${esc(tr.name)}</div>
        <div class="ip-track-bar-wrap"><div class="ip-track-bar" style="width:${tr.max?Math.round(tr.earned/tr.max*100):0}%"></div></div>
        <div class="ip-track-meta">${tr.earned} / ${tr.max} arts</div>
      </div>`).join('');
  } else {
    tracksSection.style.display='none';
  }

  // Reset detail view
  S.activeAmQuest = null;
  document.getElementById('amQuestDetail').style.display = 'none';
  document.getElementById('amQuestList').style.display   = '';

  renderAmQuestList();
  document.getElementById('amModal').classList.add('open');
}

function renderAmQuestList() {
  const player      = S.selectedPlayer;
  const statusFilter = document.getElementById('amFilterStatus').value;
  const search       = document.getElementById('amFilterSearch').value.trim().toLowerCase();

  const typeFilter = document.getElementById('amFilterType').value;
  const filtered = S.arcaneMastery.filter(q => {
    const name = getField(q, 'name');
    const done = amQuestDone(player, q);
    const types = getAmTypes(q).map(t => t.toLowerCase());
    if (statusFilter === 'mastered'   && !done) return false;
    if (statusFilter === 'unmastered' && done)  return false;
    if (typeFilter && !types.includes(typeFilter.toLowerCase())) return false;
    if (search && !name.toLowerCase().includes(search) &&
        !getField(q,'description').toLowerCase().includes(search)) return false;
    return true;
  });

  if (!filtered.length) {
    document.getElementById('amQuestList').innerHTML = `<div style="color:var(--text3);padding:24px;text-align:center;font-style:italic;">No quests found.</div>`;
    return;
  }

  const groups = {};
  filtered.forEach(q => {
    const types = getAmTypes(q);
    const group = types[0] || 'General';
    if (!groups[group]) groups[group] = [];
    groups[group].push(q);
  });

  let html = '';
  Object.entries(groups).forEach(([groupName, quests]) => {
    html += `<div class="ip-category-group">
      <div class="ip-category-header">${esc(groupName)}</div>
      <div class="ip-category-list">
        ${quests.map(q => {
          const name = getField(q, 'name');
          const description = getField(q, 'description');
          const done = amQuestDone(player, q);
          const statusClass = done ? ' am-done' : '';
          const checkSymbol = done ? '✓' : '○';
          const types = getAmTypes(q);
          return `<div class="am-quest-row${statusClass}" data-quest-name="${esc(name)}">
            <div class="am-quest-check">${checkSymbol}</div>
            <div class="am-quest-info">
              <div class="am-quest-name">${esc(name)}</div>
              ${description ? `<div class="am-quest-description">${esc(description)}</div>` : ''}
              ${types.length?`<div class="ip-tags">${types.map(t=>`<span class="ip-tag">${esc(t)}</span>`).join('')}</div>`:''}
            </div>
            <div class="am-quest-arrow">›</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  });

  document.getElementById('amQuestList').innerHTML = html;

  document.getElementById('amQuestList').querySelectorAll('.am-quest-row').forEach(el => {
    el.addEventListener('click', () => {
      const questName = el.dataset.questName;
      const quest = S.arcaneMastery.find(q => getField(q,'name') === questName);
      if (quest) openAmQuestDetail(quest);
    });
  });
}

function openAmQuestDetail(quest) {
  S.activeAmQuest = quest;
  S.activeAmTab   = 'description';
  const player = S.selectedPlayer;
  const done   = amQuestDone(player, quest);
  const name   = getField(quest, 'name');
  const types  = getAmTypes(quest);

  document.getElementById('amQuestList').style.display   = 'none';
  document.getElementById('amQuestDetail').style.display = '';
  document.getElementById('amDetailName').textContent    = name;
  document.getElementById('amDetailMeta').innerHTML      = types.length
    ? `<div class="ip-tags">${types.map(t=>`<span class="ip-tag">${esc(t)}</span>`).join('')}</div>`
    : `<div class="ip-tags"><span class="ip-tag">Type: Unknown</span></div>`;
  document.getElementById('amDetailStatus').textContent  = done ? '✓ Mastered' : '○ Not Yet Mastered';
  document.getElementById('amDetailStatus').className    = 'am-detail-status ' + (done ? 'am-detail-done' : 'am-detail-pending');

  // Activate first tab with content
  const tabs = ['description','instructions','lore','rule','submission','note'];
  const firstWithContent = tabs.find(t => !!getField(quest, t)) || 'description';
  S.activeAmTab = firstWithContent;

  document.querySelectorAll('.am-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === S.activeAmTab);
    btn.onclick = () => {
      S.activeAmTab = btn.dataset.tab;
      document.querySelectorAll('.am-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === S.activeAmTab));
      renderAmTab(quest, S.activeAmTab);
    };
  });

  renderAmTab(quest, S.activeAmTab);
}

function renderAmTab(quest, tab) {
  const val = getField(quest, tab);
  document.getElementById('amTabContent').innerHTML = val
    ? parseFormatting(val)
    : '<span style="color:var(--text3);font-style:italic">No content available.</span>';

  const copyBtn = document.getElementById('amCopySubmissionBtn');
  if (tab === 'submission' && val) {
    copyBtn.style.display = '';
    copyBtn.disabled = false;
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = () => copySubmissionText(val, copyBtn);
  } else {
    copyBtn.style.display = 'none';
  }
}

function copySubmissionText(text, button) {
  if (!text) return;
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  copyTextToClipboard(normalized).then(() => {
    const original = button.textContent;
    button.textContent = 'Copied!';
    button.disabled = true;
    setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, 1400);
  }).catch(() => {
    const original = button.textContent;
    button.textContent = 'Copy failed';
    button.disabled = true;
    setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, 1400);
  });
}

function copyTextToClipboard(value) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(value);
  }
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      successful ? resolve() : reject();
    } catch (err) {
      document.body.removeChild(textarea);
      reject(err);
    }
  });
}

function closeAmModal() {
  document.getElementById('amModal').classList.remove('open');
  S.activeAmQuest = null;
  setBnavActive('map');
}

function getHeTypes(event) {
  const t1 = getField(event, 'type1');
  const t2 = getField(event, 'type2');
  const t3 = getField(event, 'type3');
  return [t1, t2, t3].map(t => String(t || '').trim()).filter(Boolean);
}

function isHeDuelQuest(quest) {
  return getHeTypes(quest).some(type => normKey(type) === 'duels');
}

function getHeQuestTrackerFields(quest) {
  if (!quest) return null;
  const qName = String(getField(quest, 'name') || '').trim();
  const mapping = {
    'Playful Embers': { participation: 'Playful Embers Participation', win: 'Playful Embers Win' },
    'Playful Dundr': { participation: 'Playful Dundr Participation', win: 'Playful Dundr Win' },
    'Playful Drop': { participation: 'Playful Drop Participation', win: 'Playful Drop Win' },
    'Mournful': { participation: 'Mournful Participation', win: 'Mournful Win' },
    'Drengr Games': { participation: 'Drengr Games Participation', win: 'Drengr Games Win' }
  };
  return mapping[qName] || null;
}

function getHeTrackerValue(player, quest, kind) {
  if (!player || !quest) return 0;
  const trackerFields = getHeQuestTrackerFields(quest);
  if (trackerFields?.[kind]) {
    const raw = getField(player, trackerFields[kind]);
    const parsed = parseInt(String(raw).trim(), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const qName = String(getField(quest, 'name') || '').trim();
  const fallbackField = `${qName} ${kind}`;
  const raw = getField(player, fallbackField);
  const parsed = parseInt(String(raw).trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isHeDrengrGamesCompleted(player) {
  if (!player) return false;
  const row = getPlayerInfluenceStatRow(player);
  if (!row) return false;
  const raw = getField(row, 'Drengr Magus');
  if (raw === '') return false;
  const parsed = parseInt(String(raw).trim(), 10);
  if (!Number.isNaN(parsed)) return parsed > 0;
  return isTruthy(raw);
}

function getHeDoneCount(player) {
  if (!player) return 0;
  return S.hostedEvents.filter(q => heQuestDone(player, q)).length;
}

function getHeStatSummary(player) {
  const wins = parseInt(String(getField(player, 'Duels Win')).trim(), 10) || 0;
  const participations = parseInt(String(getField(player, 'Duels Participation')).trim(), 10) || 0;
  return { wins, participations, totalDuelEvents: S.hostedEvents.filter(isHeDuelQuest).length };
}

function heQuestDone(player, quest) {
  if (!player || !quest) return false;
  const qName = String(getField(quest, 'name') || '').trim();
  console.log("normKey(qName)",normKey(qName));
  if (normKey(qName) === 'drengr games') return isHeDrengrGamesCompleted(player);
  const win = getHeTrackerValue(player, quest, 'win');
  const participation = getHeTrackerValue(player, quest, 'participation');
  if (win > 0 || participation > 0) return true;
  return isTruthy(getField(player, qName));
}

function buildTrackHeData() {
  const trackMap = {};
  S.hostedEvents.forEach(q => {
    getHeTypes(q).forEach(type => {
      if (!trackMap[type]) trackMap[type] = {name:type,earned:0,max:0};
      trackMap[type].max += 1;
      if (S.selectedPlayer && heQuestDone(S.selectedPlayer, q)) {
        trackMap[type].earned += 1;
      }
    });
  });
  return Object.values(trackMap);
}

function openHeModal() {
  const player = S.selectedPlayer;
  const stats = getHeStatSummary(player);

  document.getElementById('heStatWins').textContent = stats.wins;
  document.getElementById('heStatParticipation').textContent = stats.participations;
  document.getElementById('heModalProgress').textContent = `${stats.wins} wins / ${stats.participations} participations`;

  renderSectionInfo('heSectionDesc','heSectionAnnouncement','heSectionAnnouncementText','heSectionInfo','hosted_events_modal');

  const typeSel = document.getElementById('heFilterType');
  const typeSet = new Set();
  S.hostedEvents.forEach(q => getHeTypes(q).forEach(type => { if (type.trim()) typeSet.add(type.trim()); }));
  const dynamicTypes = [...typeSet].sort();
  typeSel.innerHTML = `<option value="">All Types</option>` + dynamicTypes.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');

  const tracks = buildTrackHeData();
  const tracksEl = document.getElementById('heTracks');
  const tracksSection = document.getElementById('heTracksSection');
  if(tracks.length) {
    tracksSection.style.display='';
    tracksEl.innerHTML = tracks.map(tr=>`
      <div class="ip-track">
        <div class="ip-track-name">${esc(tr.name)}</div>
        <div class="ip-track-bar-wrap"><div class="ip-track-bar" style="width:${tr.max?Math.round(tr.earned/tr.max*100):0}%"></div></div>
        <div class="ip-track-meta">${tr.earned} / ${tr.max} events</div>
      </div>`).join('');
  } else {
    tracksSection.style.display='none';
  }

  S.activeHeQuest = null;
  document.getElementById('heQuestDetail').style.display = 'none';
  document.getElementById('heQuestList').style.display   = '';

  renderHeQuestList();
  document.getElementById('heModal').classList.add('open');
}

function renderHeQuestList() {
  const player      = S.selectedPlayer;
  const statusFilter = document.getElementById('heFilterStatus').value;
  const search       = document.getElementById('heFilterSearch').value.trim().toLowerCase();
  const typeFilter   = document.getElementById('heFilterType').value;
  const filtered = S.hostedEvents.filter(q => {
    const name = getField(q, 'name');
    const done = heQuestDone(player, q);
    const types = getHeTypes(q).map(t => t.toLowerCase());
    if (statusFilter === 'mastered'   && !done) return false;
    if (statusFilter === 'unmastered' && done)  return false;
    if (typeFilter && !types.includes(typeFilter.toLowerCase())) return false;
    if (search && !name.toLowerCase().includes(search) &&
        !getField(q,'description').toLowerCase().includes(search)) return false;
    return true;
  });

  if (!filtered.length) {
    document.getElementById('heQuestList').innerHTML = `<div style="color:var(--text3);padding:24px;text-align:center;font-style:italic;">No events found.</div>`;
    return;
  }

  const groups = {};
  filtered.forEach(q => {
    const types = getHeTypes(q);
    const group = types[0] || 'General';
    if (!groups[group]) groups[group] = [];
    groups[group].push(q);
  });

  let html = '';
  Object.entries(groups).forEach(([groupName, quests]) => {
    html += `<div class="ip-category-group">
      <div class="ip-category-header">${esc(groupName)}</div>
      <div class="ip-category-list">
        ${quests.map(q => {
          const name = getField(q, 'name');
          const description = getField(q, 'description');
          const done = heQuestDone(player, q);
          const statusClass = done ? ' am-done' : '';
          const checkSymbol = done ? '✓' : '○';
          const types = getHeTypes(q);
          const duelStats = isHeDuelQuest(q)
            ? `<div class="ip-tags"><span class="ip-tag">Wins: ${getHeTrackerValue(player, q, 'win')}</span><span class="ip-tag">Participation: ${getHeTrackerValue(player, q, 'participation')}</span></div>`
            : '';
          const drengrStatus = normKey(name) === 'drengr-games'
            ? `<div class="ip-tags"><span class="ip-tag">Completed: ${isHeDrengrGamesCompleted(player) ? '✓' : '○'}</span></div>`
            : '';
          return `<div class="am-quest-row${statusClass}" data-quest-name="${esc(name)}">
            <div class="am-quest-check">${checkSymbol}</div>
            <div class="am-quest-info">
              <div class="am-quest-name">${esc(name)}</div>
              ${description ? `<div class="am-quest-description">${esc(description)}</div>` : ''}
              ${types.length?`<div class="ip-tags">${types.map(t=>`<span class="ip-tag">${esc(t)}</span>`).join('')}</div>`:''}
              ${duelStats}
              ${drengrStatus}
            </div>
            <div class="am-quest-arrow">›</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  });

  document.getElementById('heQuestList').innerHTML = html;

  document.getElementById('heQuestList').querySelectorAll('.am-quest-row').forEach(el => {
    el.addEventListener('click', () => {
      const questName = el.dataset.questName;
      const quest = S.hostedEvents.find(q => getField(q,'name') === questName);
      if (quest) openHeQuestDetail(quest);
    });
  });
}

function openHeQuestDetail(quest) {
  S.activeHeQuest = quest;
  S.activeHeTab   = 'description';
  const player = S.selectedPlayer;
  const done   = heQuestDone(player, quest);
  const name   = getField(quest, 'name');
  const types  = getHeTypes(quest);

  document.getElementById('heQuestList').style.display   = 'none';
  document.getElementById('heQuestDetail').style.display = '';
  document.getElementById('heDetailName').textContent    = name;
  document.getElementById('heDetailMeta').innerHTML      = types.length
    ? `<div class="ip-tags">${types.map(t=>`<span class="ip-tag">${esc(t)}</span>`).join('')}</div>`
    : `<div class="ip-tags"><span class="ip-tag">Type: Unknown</span></div>`;
  document.getElementById('heDetailStatus').textContent  = done ? '✓ Completed' : '○ Incomplete';
  document.getElementById('heDetailStatus').className    = 'am-detail-status ' + (done ? 'am-detail-done' : 'am-detail-pending');

  const tabs = ['description','instructions','lore','rule','submission','note'];
  const firstWithContent = tabs.find(t => !!getField(quest, t)) || 'description';
  S.activeHeTab = firstWithContent;

  document.querySelectorAll('#heQuestDetail .am-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === S.activeHeTab);
    btn.onclick = () => {
      S.activeHeTab = btn.dataset.tab;
      document.querySelectorAll('#heQuestDetail .am-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === S.activeHeTab));
      renderHeTab(quest, S.activeHeTab);
    };
  });

  renderHeTab(quest, S.activeHeTab);
}

function renderHeTab(quest, tab) {
  const val = getField(quest, tab);
  document.getElementById('heTabContent').innerHTML = val
    ? parseFormatting(val)
    : '<span style="color:var(--text3);font-style:italic">No content available.</span>';

  const copyBtn = document.getElementById('heCopySubmissionBtn');
  if (tab === 'submission' && val) {
    copyBtn.style.display = '';
    copyBtn.disabled = false;
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = () => copySubmissionText(val, copyBtn);
  } else {
    copyBtn.style.display = 'none';
  }
}

function clearHeFilters() {
  document.getElementById('heFilterStatus').value='';
  document.getElementById('heFilterType').value='';
  document.getElementById('heFilterSearch').value='';
  renderHeQuestList();
}

function closeHeModal() {
  document.getElementById('heModal').classList.remove('open');
  S.activeHeQuest = null;
  setBnavActive('map');
}

// ─── SEARCH MODAL — MAGE CODEX ───
function openSearchModal(initialQuery) {
  renderSectionInfo('codexSectionDesc','codexSectionAnnouncement','codexSectionAnnouncementText','codexSectionInfo','codex_modal');
  document.getElementById('searchModal').classList.add('open');
  if(initialQuery!==undefined){
    const input=document.getElementById('searchInput');
    input.value=initialQuery;
    runSearch(initialQuery);
    document.getElementById('searchClear').style.display=initialQuery?'':'none';
  }
  setTimeout(()=>document.getElementById('searchInput').focus(),100);
}
function closeSearchModal() {
  document.getElementById('searchModal').classList.remove('open');
  const topbarInput=document.getElementById('topbarSearchInput');
  if(topbarInput) topbarInput.value='';
  setBnavActive('map');
}

function buildSearchIndex() {
  const items=[];

  S.ranks.forEach(r=>{
    items.push({type:'rank',icon:'⬡',label:r.name,sub:r.description||r.lore||'',badge:'Rank',data:r});
  });

  S.reqRegistry.forEach(req=>{
    items.push({type:'req',icon:'📋',label:req.name,sub:req.description||'',badge:req.type||'Requirement',data:req});
  });

  S.influenceTasks.forEach(t=>{
    const name=getField(t,'name');
    if(!name) return;
    items.push({type:'task',icon:'🔮',label:name,sub:getField(t,'description','Description')||'',badge:`+${getField(t,'points','Points')||'?'} pts`,data:t});
  });

  S.ranks.forEach(r=>{
    r.rewards.forEach(rw=>{
      items.push({type:'reward',icon:'✦',label:rw.name,sub:rw.description||`Reward from ${r.name}`,badge:'Reward',data:{...rw,rankId:r.id,rankName:r.name}});
    });
  });

  return items;
}

function runSearch(query) {
  const q=query.trim().toLowerCase();
  const resultsEl=document.getElementById('searchResults');

  if(!q){
    resultsEl.innerHTML=`<div class="search-empty"><div class="search-empty-icon">✦</div><div class="search-empty-text">Begin typing to search the Codex</div></div>`;
    return;
  }

  const index=buildSearchIndex();
  const matches=index.filter(item=>
    item.label.toLowerCase().includes(q)||
    item.sub.toLowerCase().includes(q)||
    item.badge.toLowerCase().includes(q)
  );

  if(!matches.length){
    resultsEl.innerHTML=`<div class="search-no-results">No results for "<strong>${esc(query)}</strong>"</div>`;
    return;
  }

  const groups={rank:[],req:[],task:[],reward:[]};
  const groupLabels={rank:'Ranks',req:'Requirements',task:'Influence Tasks',reward:'Rewards'};
  matches.forEach(m=>groups[m.type]?.push(m));

  let html='';
  for(const [type,items] of Object.entries(groups)){
    if(!items.length) continue;
    html+=`<div class="search-group">
      <div class="search-group-title">${groupLabels[type]}</div>
      ${items.map(item=>`
        <div class="search-result-item" data-result-type="${type}" data-result-label="${esc(item.label)}">
          <div class="search-result-icon">${item.icon}</div>
          <div class="search-result-info">
            <div class="search-result-name">${esc(item.label)}</div>
            ${item.sub?`<div class="search-result-sub">${esc(item.sub.slice(0,80))}${item.sub.length>80?'…':''}</div>`:''}
          </div>
          <div class="search-result-badge">${esc(item.badge)}</div>
        </div>`).join('')}
    </div>`;
  }
  resultsEl.innerHTML=html;

  resultsEl.querySelectorAll('.search-result-item').forEach(el=>{
    el.addEventListener('click',()=>{
      const type=el.dataset.resultType;
      const label=el.dataset.resultLabel;
      handleSearchSelect(type,label);
    });
  });
}

function handleSearchSelect(type, label) {
  closeSearchModal();
  if(type==='rank'){
    const rank=S.ranks.find(r=>r.name===label);
    if(rank){
      S.selectedRankId=rank.id;
      selectNode(rank.id);
      if(window.innerWidth<900) openDrawer();
    }
  } else if(type==='req'){
    const rank=S.ranks.find(r=>r.requirements.some(q=>q.name===label));
    if(rank){
      S.selectedRankId=rank.id;
      S.selectedReqName=label;
      selectNode(rank.id);
      if(window.innerWidth<900) openDrawer();
    }
  } else if(type==='task'){
    const task=S.influenceTasks.find(t=>getField(t,'name')===label);
    if(task){
      openInfluenceModal();
      // Wait for DOM nodes to render then scroll and flash highlight
      setTimeout(()=>{
        const row = Array.from(document.querySelectorAll('#ipTaskList .ip-row')).find(el => el.dataset.taskName === label);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.classList.add('ip-row-highlight');
          setTimeout(() => row.classList.remove('ip-row-highlight'), 2500);
        }
      }, 150);
    }
  } else if(type==='reward'){
    const rank=S.ranks.find(r=>r.rewards.some(rw=>rw.name===label));
    if(rank){
      S.selectedRankId=rank.id;
      selectNode(rank.id);
      if(window.innerWidth<900) openDrawer();
    }
  }
}

// ─── SUPREME ARTS MODAL ───
function openSaModal(wayName = '') {
  const player = S.selectedPlayer;
  const total = S.supremeArts.length;
  const done = getSaDoneCount(player);

  document.getElementById('saStatDone').textContent      = done;
  document.getElementById('saStatTotal').textContent     = total;
  document.getElementById('saStatRemaining').textContent = Math.max(0, total - done);
  document.getElementById('saStatPct').textContent       = total ? `${Math.round(done/total*100)}%` : '0%';
  document.getElementById('saModalProgress').textContent = `${done} / ${total} Mastered`;

  renderSectionInfo('saSectionDesc','saSectionAnnouncement','saSectionAnnouncementText','saSectionInfo','supreme_arts_modal');

  const typeSel = document.getElementById('saFilterType');
  const typeSet = new Set();
  S.supremeArts.forEach(q => getSupremeTypes(q).forEach(type => { if (type.trim()) typeSet.add(type.trim()); }));
  const dynamicTypes = [...typeSet].sort();
  typeSel.innerHTML = `<option value="">All Types</option>` + dynamicTypes.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
  if(wayName) {
    typeSel.value = wayName;
  }

  // Supreme Way tracks
  const tracks = buildTrackSupremeData();
  const tracksEl = document.getElementById('saTracks');
  const tracksSection = document.getElementById('saTracksSection');
  if(tracks.length) {
    tracksSection.style.display='';
    tracksEl.innerHTML = tracks.map(tr=>`
      <div class="ip-track">
        <div class="ip-track-name">${esc(tr.name)}</div>
        <div class="ip-track-bar-wrap"><div class="ip-track-bar" style="width:${tr.max?Math.round(tr.earned/tr.max*100):0}%"></div></div>
        <div class="ip-track-meta">${tr.earned} / ${tr.max} arts</div>
      </div>`).join('');
  } else {
    tracksSection.style.display='none';
  }

  // Reset detail view
  S.activeSaQuest = null;
  document.getElementById('saQuestDetail').style.display = 'none';
  document.getElementById('saQuestList').style.display   = '';

  renderSaQuestList();
  document.getElementById('saModal').classList.add('open');
}

function renderSaQuestList() {
  const player      = S.selectedPlayer;
  const statusFilter = document.getElementById('saFilterStatus').value;
  const search       = document.getElementById('saFilterSearch').value.trim().toLowerCase();

  const typeFilter = document.getElementById('saFilterType').value;
  const filtered = S.supremeArts.filter(q => {
    const name = getField(q, 'name');
    const done = saQuestDone(player, q);
    const types = getSupremeTypes(q).map(t => t.toLowerCase());
    if (statusFilter === 'mastered'   && !done) return false;
    if (statusFilter === 'unmastered' && done)  return false;
    if (typeFilter && !types.includes(typeFilter.toLowerCase())) return false;
    if (search && !name.toLowerCase().includes(search) &&
        !getField(q,'description').toLowerCase().includes(search)) return false;
    return true;
  });

  if (!filtered.length) {
    document.getElementById('saQuestList').innerHTML = `<div style="color:var(--text3);padding:24px;text-align:center;font-style:italic;">No quests found.</div>`;
    return;
  }

  const groups = {};
  filtered.forEach(q => {
    const types = getSupremeTypes(q);
    const group = types[0] || 'General';
    if (!groups[group]) groups[group] = [];
    groups[group].push(q);
  });

  let html = '';
  Object.entries(groups).forEach(([groupName, quests]) => {
    html += `<div class="ip-category-group">
      <div class="ip-category-header">${esc(groupName)}</div>
      <div class="ip-category-list">
        ${quests.map(q => {
          const name = getField(q, 'name');
          const description = getField(q, 'description');
          const done = saQuestDone(player, q);
          const statusClass = done ? ' sa-done' : '';
          const checkSymbol = done ? '✓' : '○';
          const types = getSupremeTypes(q);
          return `<div class="sa-quest-row${statusClass}" data-quest-name="${esc(name)}">
            <div class="sa-quest-check">${checkSymbol}</div>
            <div class="sa-quest-info">
              <div class="sa-quest-name">${esc(name)}</div>
              ${description ? `<div class="sa-quest-description">${esc(description)}</div>` : ''}
              ${types.length?`<div class="ip-tags">${types.map(t=>`<span class="ip-tag">${esc(t)}</span>`).join('')}</div>`:''}
            </div>
            <div class="sa-quest-arrow">›</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  });

  document.getElementById('saQuestList').innerHTML = html;

  document.getElementById('saQuestList').querySelectorAll('.sa-quest-row').forEach(el => {
    el.addEventListener('click', () => {
      const questName = el.dataset.questName;
      const quest = S.supremeArts.find(q => getField(q,'name') === questName);
      if (quest) openSaQuestDetail(quest);
    });
  });
}

function openSaQuestDetail(quest) {
  S.activeSaQuest = quest;
  S.activeSaTab   = 'description';
  const player = S.selectedPlayer;
  const done   = saQuestDone(player, quest);
  const name   = getField(quest, 'name');
  const types  = getSupremeTypes(quest);

  document.getElementById('saQuestList').style.display   = 'none';
  document.getElementById('saQuestDetail').style.display = '';
  document.getElementById('saDetailName').textContent    = name;
  document.getElementById('saDetailMeta').innerHTML      = types.length
    ? `<div class="ip-tags"><span class="ip-tag">${esc(types.join(', '))}</span></div>`
    : `<div class="ip-tags"><span class="ip-tag">Type: Unknown</span></div>`;
  document.getElementById('saDetailStatus').textContent  = done ? '✓ Mastered' : '○ Not Yet Mastered';
  document.getElementById('saDetailStatus').className    = 'sa-detail-status ' + (done ? 'sa-detail-done' : 'sa-detail-pending');

  // Activate first tab with content
  const tabs = ['description','instructions','lore','rule','submission','note'];
  const firstWithContent = tabs.find(t => !!getField(quest, t)) || 'description';
  S.activeSaTab = firstWithContent;

  document.querySelectorAll('.sa-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === S.activeSaTab);
    btn.onclick = () => {
      S.activeSaTab = btn.dataset.tab;
      document.querySelectorAll('.sa-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === S.activeSaTab));
      renderSaTab(quest, S.activeSaTab);
    };
  });

  renderSaTab(quest, S.activeSaTab);
}

function renderSaTab(quest, tab) {
  const val = getField(quest, tab);
  document.getElementById('saTabContent').innerHTML = val
    ? parseFormatting(val)
    : '<span style="color:var(--text3);font-style:italic">No content available.</span>';

  const copyBtn = document.getElementById('saCopySubmissionBtn');
  if (tab === 'submission' && val) {
    copyBtn.style.display = '';
    copyBtn.disabled = false;
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = () => copySubmissionText(val, copyBtn);
  } else {
    copyBtn.style.display = 'none';
  }
}

function closeSaModal() {
  document.getElementById('saModal').classList.remove('open');
  S.activeSaQuest = null;
  setBnavActive('map');
}

// ─── MOBILE DRAWER ───
function openDrawer(){
  document.getElementById('detailPanel').classList.add('drawer-open');
  document.getElementById('drawerBackdrop').classList.add('visible');
  setBnavActive('detail');
}
function closeDrawer(){
  document.getElementById('detailPanel').classList.remove('drawer-open');
  document.getElementById('drawerBackdrop').classList.remove('visible');
  setBnavActive('map');
}

function initBottomNav() {
  document.querySelectorAll('.bnav-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.bnav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      if(btn.dataset.view==='map') closeDrawer();
      else if(btn.dataset.view==='detail') openDrawer();
      else if(btn.dataset.view==='search') openSearchModal();
      else if(btn.dataset.view==='influence') openInfluenceModal();
      else if(btn.dataset.view==='arcane') openAmModal();
      else if(btn.dataset.view==='supreme') openSaModal();
    });
  });
}

// ─── RENDER APP ───
function renderApp() {
  const prog=getProgress(S.selectedPlayer);
  renderSelector();
  renderStatusBar(prog);
  renderNodes(prog);
  renderSectionInfo('homeBannerDesc','homeBannerAnnouncement','homeBannerAnnouncementText','homeBanner','homepage');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    drawPaths(prog);
    if(S.selectedRankId) selectNode(S.selectedRankId);
    else if(!S.selectedPlayer) showDetailPanel(false);
  }));
}

async function refresh() {
  const name=S.selectedPlayer?getPlayerName(S.selectedPlayer):null, rid=S.selectedRankId;
  applyData(await loadAll());
  S.selectedPlayer=name?S.players.find(p=>getPlayerName(p)===name)||null:null;
  S.selectedRankId=S.ranks.some(r=>r.id===rid)?rid:null;
  renderApp();
}

// ─── INIT ───
async function init() {
  applyData(await loadAll());
  S.selectedPlayer = null;

  document.getElementById('playerSelect').addEventListener('change',e=>{
    const val=e.target.value;
    S.selectedPlayer = val===''?null:S.players[Number(val)];
    S.selectedRankId=null; S.selectedReqName=null;
    document.getElementById('selectNameHelper').classList.remove('open');
    renderApp();
  });

  const playerSelectEl=document.getElementById('playerSelect');
  const selectHelperEl=document.getElementById('selectNameHelper');
  playerSelectEl.addEventListener('mousedown',()=>selectHelperEl.classList.add('open'));
  playerSelectEl.addEventListener('focus',()=>selectHelperEl.classList.add('open'));
  playerSelectEl.addEventListener('blur',()=>selectHelperEl.classList.remove('open'));
  document.addEventListener('click',e=>{
    if(!e.target.closest('.sb-select-wrap')) selectHelperEl.classList.remove('open');
  });

  document.getElementById('drawerBackdrop').addEventListener('click',closeDrawer);
  document.getElementById('detailPanelClose').addEventListener('click',closeDrawer);

  document.getElementById('mapLegendToggle').addEventListener('click',()=>{
    document.getElementById('mapLegend').classList.toggle('open');
  });
  document.getElementById('ringInfoBtn').addEventListener('click',e=>{
    e.currentTarget.classList.toggle('tap-open');
  });
  document.addEventListener('click',e=>{
    if(!e.target.closest('.sb-ring-info')) document.getElementById('ringInfoBtn').classList.remove('tap-open');
  });

  // Influence modal
  document.getElementById('ipModalClose').addEventListener('click',closeInfluenceModal);
  document.getElementById('ipModal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeInfluenceModal();});
  document.getElementById('ipDetailBack').addEventListener('click',()=>{
    S.activeIpTask=null;
    document.getElementById('ipTaskDetail').style.display='none';
    document.getElementById('ipTaskList').style.display='';
  });

  // Filter live updates
  ['ipFilterCategory','ipFilterStatus','ipFilterRepeat'].forEach(id=>{
    document.getElementById(id).addEventListener('change',renderIpTaskList);
  });
  document.getElementById('ipFilterSearch').addEventListener('input',renderIpTaskList);
  document.getElementById('ipClearFilters').addEventListener('click',clearIpFilters);

  // Topbar buttons
  const topbarSearchInput=document.getElementById('topbarSearchInput');
  topbarSearchInput.addEventListener('focus',()=>{
    if(!document.getElementById('searchModal').classList.contains('open')) openSearchModal(topbarSearchInput.value);
  });
  topbarSearchInput.addEventListener('input',e=>{
    if(!document.getElementById('searchModal').classList.contains('open')) openSearchModal(e.target.value);
  });
  document.getElementById('influenceNavBtn').addEventListener('click',openInfluenceModal);
  document.getElementById('arcaneNavBtn').addEventListener('click',openAmModal);
  document.getElementById('hostedNavBtn').addEventListener('click',openHeModal);
  document.getElementById('supremeNavBtn').addEventListener('click',openSaModal);

  // Hosted Events modal
  document.getElementById('heModalClose').addEventListener('click',closeHeModal);
  document.getElementById('heModal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeHeModal();});
  document.getElementById('heDetailBack').addEventListener('click',()=>{
    S.activeHeQuest=null;
    document.getElementById('heQuestDetail').style.display='none';
    document.getElementById('heQuestList').style.display='';
  });
  document.getElementById('heFilterStatus').addEventListener('change',renderHeQuestList);
  document.getElementById('heFilterType').addEventListener('change',renderHeQuestList);
  document.getElementById('heFilterSearch').addEventListener('input',renderHeQuestList);
  document.getElementById('heClearFilters').addEventListener('click',clearHeFilters);

  // Arcane Mastery modal
  document.getElementById('amModalClose').addEventListener('click',closeAmModal);
  document.getElementById('amModal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeAmModal();});
  document.getElementById('amDetailBack').addEventListener('click',()=>{
    S.activeAmQuest=null;
    document.getElementById('amQuestDetail').style.display='none';
    document.getElementById('amQuestList').style.display='';
  });
  document.getElementById('amFilterStatus').addEventListener('change',renderAmQuestList);
  document.getElementById('amFilterType').addEventListener('change',renderAmQuestList);
  document.getElementById('amFilterSearch').addEventListener('input',renderAmQuestList);
  document.getElementById('amClearFilters').addEventListener('click',clearAmFilters);

  // Search modal
  document.getElementById('searchModalClose').addEventListener('click',closeSearchModal);
  document.getElementById('searchModal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeSearchModal();});
  document.getElementById('searchInput').addEventListener('input',e=>runSearch(e.target.value));
  document.getElementById('searchClear').addEventListener('click',()=>{
    document.getElementById('searchInput').value='';
    document.getElementById('searchClear').style.display='none';
    runSearch('');
  });
  document.getElementById('searchInput').addEventListener('input',e=>{
    document.getElementById('searchClear').style.display=e.target.value?'':'none';
  });

  // Supreme Arts modal
  document.getElementById('saModalClose').addEventListener('click',closeSaModal);
  document.getElementById('saModal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeSaModal();});
  document.getElementById('saDetailBack').addEventListener('click',()=>{
    S.activeSaQuest=null;
    document.getElementById('saQuestDetail').style.display='none';
    document.getElementById('saQuestList').style.display='';
  });
  document.getElementById('saFilterStatus').addEventListener('change',renderSaQuestList);
  document.getElementById('saFilterType').addEventListener('change',renderSaQuestList);
  document.getElementById('saFilterSearch').addEventListener('input',renderSaQuestList);
  document.getElementById('saClearFilters').addEventListener('click',clearSaFilters);

  // Keyboard shortcut: Cmd/Ctrl+K for search
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();openSearchModal();}
    if(e.key==='Escape'){closeSearchModal();closeInfluenceModal();closeAmModal();closeSaModal();}
  });

  initBottomNav();
  renderApp();
  setInterval(refresh,60000);
}

let rafResize;
let lastMobileState = isMobileView();
window.addEventListener('resize',()=>{
  cancelAnimationFrame(rafResize);
  rafResize=requestAnimationFrame(()=>{
    const nowMobile = isMobileView();
    if(nowMobile !== lastMobileState){
      lastMobileState = nowMobile;
      renderNodes(getProgress(S.selectedPlayer));
    }
    drawPaths();
  });
});
document.addEventListener('DOMContentLoaded',init);
