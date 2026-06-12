// ─── CONFIG ───
const SHEET_ID = '1FFEg75S6-HKlN58pMROvtTkBry1FYGrVruPsUbaf4qA';
const SHEET_NAMES = { 
  ranks: 'ranks', 
  reqs: 'reqs', 
  influenceTasks: 'influence points', 
  tracker: 'tracker', 
  layout: 'nodelayout',
  influenceStat: 'influence stat'
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

let S = {
  ranks:[], reqRegistry:new Map(), influenceTasks:[],
  players:[], layout:new Map(), connections:[],
  selectedPlayer:null, selectedRankId:null, selectedReqName:null,
  selectedReqData:null, activeReqTab:'instruction',
  activeIpTask:null,
  influenceStat: []
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

function getRankName(row) {
  const byField = getField(row,'name','rank name','rank');
  if (byField) return byField;
  return Object.values(row||{})[0] || '';
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
  const [ranks,reqs,influenceTasks,tracker,nodelayout,influenceStat] = await Promise.all([
    loadSheet(SHEET_NAMES.ranks,         FALLBACK.ranks),
    loadSheet(SHEET_NAMES.reqs,          FALLBACK.reqs, true),
    loadSheet(SHEET_NAMES.influenceTasks,FALLBACK.influenceTasks, true),
    loadSheet(SHEET_NAMES.tracker,       FALLBACK.tracker),
    loadSheet(SHEET_NAMES.layout,        FALLBACK.nodelayout),
    loadSheet(SHEET_NAMES.influenceStat, [], true)
  ]);
  return {ranks,reqs,influenceTasks,tracker,nodelayout,influenceStat};
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
    reqs.push({name:rName,description:reg?.description||'',type:reg?.type||'',instruction:reg?.instruction||'',rules:reg?.rules||'',lore:reg?.lore||'',isInfluence:false,_order:parseInt(m[1],10)});
  });
  const ipVal=parseInt(getField(row,'influence points','influence'),10);
  if(ipVal>0) reqs.push({name:`${ipVal} Influence Points`,description:`Earn at least ${ipVal} influence points.`,type:'Influence',isInfluence:true,threshold:ipVal,_order:999});
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
    layout.set(id,{x:parseCoord(getField(row,'x')),y:parseCoord(getField(row,'y')),icon:getField(row,'icon')||`${id}.png`});
    Object.keys(row).forEach(key=>{
      if(!/^conn\d+$/i.test(normKey(key))) return;
      const target=row[key].trim();
      if(target) connections.push({from:id,to:slugify(target)});
    });
  });
  return {layout,connections};
}

function applyData(data) {
  S.reqRegistry    = buildReqRegistry(data.reqs);
  S.influenceTasks = data.influenceTasks;
  S.ranks          = data.ranks.map((r,i)=>parseRank(r,i)).filter(r=>r.name);
  S.players        = data.tracker;
  S.influenceStat  = data.influenceStat || [];
  const {layout,connections} = parseLayoutAndConnections(data.nodelayout);
  S.layout      = layout;
  S.connections = connections.length ? connections : S.ranks.slice(1).map((r,i)=>({from:S.ranks[i].id,to:r.id}));
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

function reqDone(player, req) {
  if(!player) return false;
  if(req.isInfluence) return getInfluence(player)>=req.threshold;
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
function getIconSrc(rank){const l=S.layout.get(rank.id);return `${RANK_ICON_PATH}${cleanIcon(l?.icon||`${rank.id}.png`)}`;}
function iconImg(rank,cls='rank-icon-img'){return `<img class="${esc(cls)}" src="${esc(getIconSrc(rank))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_RANK_ICON}'">`;}

// ─── RENDER STATUS BAR ───
function renderStatusBar(prog) {
  const player = S.selectedPlayer;
  const metaEl = document.getElementById('sbPlayerMeta');
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
}

function renderSelector() {
  const sel = document.getElementById('playerSelect');
  const current = S.selectedPlayer ? S.players.indexOf(S.selectedPlayer) : -1;
  sel.innerHTML = `<option value="" disabled${current===-1?' selected':''}>Select a Player</option>`
    + S.players.map((p,i)=>`<option value="${i}"${i===current?' selected':''}>${esc(getPlayerName(p))}</option>`).join('');
}

// ─── RENDER NODES ───
const statusLabel = s => s==='completed'?'Completed':s==='available'?'Available':s==='neutral'?'View Info':'Locked';

function renderNodes(prog) {
  const canvas = document.getElementById('mapCanvas');
  canvas.querySelectorAll('.node').forEach(n=>n.remove());
  prog.ranks.forEach(rank=>{
    const layout=S.layout.get(rank.id)||{x:50,y:50};
    const node=document.createElement('button');
    node.type='button';
    node.className=`node node-${rank.status}${rank.status==='available'?' pulse':''}`;
    node.id=`node-${rank.id}`;
    node.style.left=`${layout.x}%`;
    node.style.top=`${layout.y}%`;
    node.dataset.rankId=rank.id;
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
  if(!rect.width||!rect.height) return;
  function center(id){const el=document.getElementById(`node-${id}`);if(!el)return null;const r=el.getBoundingClientRect();return{x:r.left-rect.left+r.width/2,y:r.top-rect.top+r.height/2};}
  function pStatus(conn){
    const f=prog.ranks.find(r=>r.id===conn.from),t=prog.ranks.find(r=>r.id===conn.to);
    if(f?.status==='completed'&&t?.status==='completed') return 'completed';
    if(f?.status==='completed'&&t?.status==='available')  return 'available';
    if(f?.status==='neutral'||t?.status==='neutral')      return 'neutral';
    return 'locked';
  }
  const colors={completed:'#f0c060',available:'#9b6dff',locked:'#4a3a60',neutral:'#4a3a60'};
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
  return `<button type="button" class="req-row req-button ${done?'done':'pending'}${sel?' selected':''}" data-req-index="${index}">
    <div class="req-circle">${done?'✓':'○'}</div>
    <div class="req-name">${esc(req.name)}${req.isInfluence?` <span class="ip-badge">🔮 ${getInfluence(player)} / ${req.threshold}</span>`:''}</div>
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

  renderIpTaskList();

  // Open detail task panel on desktop automatically
  if (window.innerWidth >= 900) {
    document.getElementById('ipTaskDetail').style.display = '';
    if (!S.activeIpTask && S.influenceTasks.length > 0) {
      showIpTaskDetail(S.influenceTasks[0]);
    }
  } else {
    document.getElementById('ipTaskDetail').style.display = 'none';
    document.getElementById('ipTaskList').style.display = '';
  }

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
          const maxPts = parseInt(getField(t,'max point','max points','maxpoints')||getField(t,'points','Points')||'0',10);
          const rep   = getField(t,'repeatability');
          const types = getIpTypes(t);
          
          const earnedPts = player ? getTaskEarnedPoints(player, t) : 0;
          const done = player ? (earnedPts >= maxPts) : false;
          const started = player ? (earnedPts > 0 && earnedPts < maxPts) : false;
          
          const active = S.activeIpTask && getField(S.activeIpTask,'name')===name;
          
          const statusClass = done ? ' ip-done' : (started ? ' ip-started' : '');
          const checkSymbol = done ? '✓' : (started ? '◐' : '○');
          const ptsDisplay = player ? `${earnedPts} / ${maxPts}` : (maxPts ? `+${maxPts}` : '');

          return `<div class="ip-row${statusClass}${active?' ip-row-active':''}" data-task-name="${esc(name)}">
            <div class="ip-check">${checkSymbol}</div>
            <div class="ip-info">
              <div class="ip-name">${esc(name)}</div>
              ${desc?`<div class="ip-desc">${parseFormatting(desc)}</div>`:''}
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

  document.querySelectorAll('#ipTaskList .ip-row').forEach(row=>{
    row.addEventListener('click',()=>{
      const tName=row.dataset.taskName;
      const task=S.influenceTasks.find(t=>getField(t,'name')===tName);
      if(task) showIpTaskDetail(task);
    });
  });
}

function showIpTaskDetail(task) {
  S.activeIpTask=task;
  const player=S.selectedPlayer;
  const name    = getField(task,'name');
  const desc    = getField(task,'description','Description');
  const pts     = getField(task,'points','Points');
  const maxPts  = getField(task,'max point','max points')||pts;
  const cat     = getField(task,'category');
  const rep     = getField(task,'repeatability');
  const notes   = getField(task,'notes','Notes');
  const types   = getIpTypes(task);

  const earnedPts = player ? getTaskEarnedPoints(player, task) : 0;
  const done = player ? (earnedPts >= maxPts) : false;
  const started = player ? (earnedPts > 0 && earnedPts < maxPts) : false;

  document.getElementById('ipDetailName').textContent=name;

  const meta=[
    pts?`<span class="ip-detail-badge pts">+${esc(pts)} pts${maxPts&&maxPts!==pts?` / ${esc(maxPts)} max`:''}</span>`:'',
    cat?`<span class="ip-detail-badge cat">${esc(cat)}</span>`:'',
    rep?`<span class="ip-detail-badge rep">${esc(rep)}</span>`:'',
    ...types.map(t=>`<span class="ip-detail-badge">${esc(t)}</span>`)
  ].filter(Boolean).join('');
  document.getElementById('ipDetailMeta').innerHTML=meta;
  document.getElementById('ipDetailDesc').innerHTML=parseFormatting(desc)||'<em style="color:var(--text3)">No description.</em>';

  const notesWrap=document.getElementById('ipDetailNotesWrap');
  if(notes){notesWrap.style.display='';document.getElementById('ipDetailNotes').innerHTML=parseFormatting(notes);}
  else notesWrap.style.display='none';

  const prog=document.getElementById('ipDetailProgress');
  if (player) {
    if (done) {
      prog.innerHTML = `<strong style="color:var(--yellow)">✓ Completed (${earnedPts} / ${maxPts} pts)</strong>`;
    } else if (started) {
      prog.innerHTML = `<strong style="color:var(--purple2)">◐ In Progress (${earnedPts} / ${maxPts} pts)</strong>`;
    } else {
      prog.innerHTML = `<strong style="color:var(--text3)">○ Not Started (${earnedPts} / ${maxPts} pts)</strong>`;
    }
  } else {
    prog.innerHTML = '<span style="color:var(--text3)">Select a player to see progress.</span>';
  }

  if(window.innerWidth>=900){
    document.getElementById('ipTaskDetail').style.display='';
  } else {
    document.getElementById('ipTaskList').style.display='none';
    document.getElementById('ipTaskDetail').style.display='';
  }
}

function closeInfluenceModal() {
  document.getElementById('ipModal').classList.remove('open');
  S.activeIpTask=null;
  setBnavActive('map');
}

// ─── SEARCH MODAL — MAGE CODEX ───
function openSearchModal() {
  document.getElementById('searchModal').classList.add('open');
  setTimeout(()=>document.getElementById('searchInput').focus(),100);
}
function closeSearchModal() {
  document.getElementById('searchModal').classList.remove('open');
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
    if(task){openInfluenceModal();setTimeout(()=>showIpTaskDetail(task),100);}
  } else if(type==='reward'){
    const rank=S.ranks.find(r=>r.rewards.some(rw=>rw.name===label));
    if(rank){
      S.selectedRankId=rank.id;
      selectNode(rank.id);
      if(window.innerWidth<900) openDrawer();
    }
  }
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
    });
  });
}

// ─── RENDER APP ───
function renderApp() {
  const prog=getProgress(S.selectedPlayer);
  renderSelector();
  renderStatusBar(prog);
  renderNodes(prog);
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
    renderApp();
  });

  document.getElementById('drawerBackdrop').addEventListener('click',closeDrawer);
  document.getElementById('detailPanelClose').addEventListener('click',closeDrawer);

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

  // Topbar buttons
  document.getElementById('searchBtn').addEventListener('click',openSearchModal);
  document.getElementById('influenceNavBtn').addEventListener('click',openInfluenceModal);

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

  // Keyboard shortcut: Cmd/Ctrl+K for search
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();openSearchModal();}
    if(e.key==='Escape'){closeSearchModal();closeInfluenceModal();}
  });

  initBottomNav();
  renderApp();
  setInterval(refresh,60000);
}

let rafResize;
window.addEventListener('resize',()=>{cancelAnimationFrame(rafResize);rafResize=requestAnimationFrame(()=>drawPaths());});
document.addEventListener('DOMContentLoaded',init);
