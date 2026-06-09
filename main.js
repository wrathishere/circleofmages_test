// ─── CONFIG ───
const SHEET_ID = '1FFEg75S6-HKlN58pMROvtTkBry1FYGrVruPsUbaf4qA';
const SHEET_NAMES = { ranks:'ranks', reqs:'reqs', influenceTasks:'influence points', tracker:'tracker', layout:'nodelayout' };
const RANK_ICON_PATH = 'images/ranks/';
const DEFAULT_RANK_ICON = `${RANK_ICON_PATH}default.png`;

const FALLBACK = {
  ranks: [
    { name:'Initiate',   description:'Every great mage begins with a single candle.', rewards:'L7 Pointy Hat; Sparkler', req1:'Offering to Goddess Freyja' },
    { name:'Apprentice', description:'The foundations of magic take root.',             rewards:'Apprentice Robes; Herb Pouch', req1:'Novice Herbalism', req2:'Novice Potion-making', req3:'Novice Runework' },
    { name:'Enchanter',  description:'The threads of arcane weave between your fingers.', rewards:'Feather Cape; Eitr Robes', 'influence points':'30', req1:'Advanced Herbalism', req2:'Advanced Potion-making', req3:'Advanced Runework', req4:'The Harrowing', req5:'Here Lies the Abyss', req6:'Horcrux Hunt' },
    { name:'Archmage',   description:'The apex of mortal mastery.',                    rewards:'L22 Staff; Embla Hood', 'influence points':'70', req1:'Expert Herbalism', req2:'Expert Potion-making', req3:'Expert Runework' }
  ],
  reqs: [],
  influenceTasks: [
    { name:'Airbender',         Description:'Glide from a mountain to the ocean.', Points:'2' },
    { name:'Happy Landing',     Description:'Fly and land at Spawn.',              Points:'2' },
    { name:'The Floor is Lava', Description:'Jump between Basalt platforms.',      Points:'4' },
    { name:'Excess Energies',   Description:'Donate 1 stack of Refined Eitr.',    Points:'4' },
    { name:'Wandcrafter',       Description:'Donate two fully upgraded weapons.',  Points:'6' }
  ],
  tracker: [
    { 'Player Name':'Archmage Lyra','Ranking':'Enchanter','Influence Points':'34',
      'Offering to Goddess Freyja':'TRUE','Novice Herbalism':'TRUE','Novice Potion-making':'TRUE','Novice Runework':'TRUE',
      'The Harrowing':'TRUE','Advanced Herbalism':'TRUE','Advanced Potion-making':'TRUE','Advanced Runework':'TRUE',
      'Here Lies the Abyss':'FALSE','Horcrux Hunt':'FALSE','Expert Herbalism':'FALSE','Expert Potion-making':'FALSE','Expert Runework':'FALSE',
      'Airbender':'TRUE','Happy Landing':'TRUE','The Floor is Lava':'FALSE','Excess Energies':'FALSE','Wandcrafter':'FALSE' }
  ],
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
  selectedPlayer:null, selectedRankId:null, selectedReqName:null
};

// ─── UTILS ───
const slugify  = v => String(v||'').trim().toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const esc      = v => String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const normKey  = v => String(v||'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[^\x20-\x7E]/g,'');
const isTruthy = v => ['true','yes','y','1','complete','completed','done'].includes(String(v).trim().toLowerCase());
const splitList= v => String(v||'').split(/[;|\n]+/).map(s=>s.trim()).filter(Boolean);
const cleanIcon= v => String(v||'').split('/').pop().replace(/[^a-zA-Z0-9._-]/g,'')||'default.png';

// Standard formatting function with bullet, bold, italic, and newline parsing support
function parseFormatting(text) {
  if (!text) return '';
  const lines = esc(text).split(/\r?\n/);
  let html = '';
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listMatch = line.match(/^\s*([-*+•])\s+(.*)$/);

    if (listMatch) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${listMatch[2]}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += line;
      
      if (i < lines.length - 1) {
        const nextLine = lines[i + 1];
        const nextIsList = nextLine ? nextLine.match(/^\s*([-*+•])\s+/) : false;
        if (!nextIsList) {
          html += '<br>';
        }
      }
    }
  }
  
  if (inList) {
    html += '</ul>';
  }

  return html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

// getField: case-insensitive, strips non-ASCII from keys before comparing
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

// getRankName: tries 'name' column, falls back to first non-empty value in row
function getRankName(row) {
  const byField = getField(row, 'name', 'rank name', 'rank');
  if (byField) return byField;
  // Fall back to first column value
  const firstVal = Object.values(row || {})[0];
  return firstVal || '';
}

// ─── CSV PARSER ───
function parseCsv(csv) {
  // Strip BOM
  if (csv.charCodeAt(0) === 0xFEFF) csv = csv.slice(1);

  const rows = []; let cur = '', row = [], inQ = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i], n = csv[i + 1];
    if      (c === '"' && inQ && n === '"') { cur += '"'; i++; }
    else if (c === '"')                      { inQ = !inQ; }
    else if (c === ',' && !inQ)              { row.push(cur); cur = ''; }
    else if ((c === '\n' || c === '\r') && !inQ) {
      if (c === '\r' && n === '\n') i++;
      row.push(cur);
      if (row.some(x => x.trim())) rows.push(row);
      row = []; cur = '';
    } else cur += c;
  }
  row.push(cur);
  if (row.some(x => x.trim())) rows.push(row);
  if (!rows.length) return [];

  // Clean headers: strip BOM, trim, remove non-printable chars
  const headers = rows[0].map(h => h.trim().replace(/^\uFEFF/, '').replace(/[^\x20-\x7E\u00C0-\uFFFF]/g, '').trim());
  console.log('[CSV] headers:', headers);

  return rows.slice(1).map(cells =>
    headers.reduce((o, h, i) => { o[h] = (cells[i] || '').trim(); return o; }, {})
  );
}

// ─── SHEET LOADING ───
const csvUrl = sheet =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${new URLSearchParams({ tqx: 'out:csv', sheet })}`;

async function loadSheet(name, fallback = [], optional = false) {
  try {
    const r = await fetch(csvUrl(name), { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    const rows = parseCsv(text);
    console.log(`[loadSheet] "${name}" → ${rows.length} rows`, rows[0] ? Object.keys(rows[0]) : 'empty');
    return (rows.length || optional) ? rows : fallback;
  } catch (e) {
    console.warn(`[loadSheet] "${name}" failed, using fallback:`, e.message);
    return fallback;
  }
}

async function loadAll() {
  const [ranks, reqs, influenceTasks, tracker, nodelayout] = await Promise.all([
    loadSheet(SHEET_NAMES.ranks,         FALLBACK.ranks),
    loadSheet(SHEET_NAMES.reqs,          FALLBACK.reqs, true),
    loadSheet(SHEET_NAMES.influenceTasks,FALLBACK.influenceTasks, true),
    loadSheet(SHEET_NAMES.tracker,       FALLBACK.tracker),
    loadSheet(SHEET_NAMES.layout,        FALLBACK.nodelayout)
  ]);
  return { ranks, reqs, influenceTasks, tracker, nodelayout };
}

// ─── PARSERS ───
function buildReqRegistry(rows) {
  return new Map(rows.map(row => {
    const name = getField(row, 'name');
    if (!name) return null;
    return [normKey(name), {
      name,
      type: getField(row, 'type') || 'Requirement',
      description: getField(row, 'description', 'Description')
    }];
  }).filter(Boolean));
}

function parseRank(row, index) {
  const name = getRankName(row);
  const reqs = [];

  Object.keys(row).forEach(key => {
    const m = normKey(key).match(/^req\s*(\d+)$/);
    if (!m) return;
    const rName = row[key].trim();
    if (!rName) return;
    const reg = S.reqRegistry.get(normKey(rName));
    reqs.push({
      name: rName,
      description: reg?.description || '',
      type: reg?.type || '',
      isInfluence: false,
      _order: parseInt(m[1], 10)
    });
  });

  const ipVal = parseInt(getField(row, 'influence points', 'influence'), 10);
  if (ipVal > 0) {
    reqs.push({
      name: `${ipVal} Influence Points`,
      description: `Earn at least ${ipVal} influence points.`,
      type: 'Influence', isInfluence: true, threshold: ipVal, _order: 999
    });
  }

  reqs.sort((a, b) => a._order - b._order);

  return {
    id: slugify(name || `rank-${index + 1}`),
    order: index, name,
    description: getField(row, 'description', 'rank description') || '',
    lore:        getField(row, 'lore', 'flavor') || '',
    rewards:     splitList(getField(row, 'rewards', 'reward')),
    requirements: reqs
  };
}

function parseCoord(v) { const n = Number(v); return Number.isFinite(n) ? Math.min(90, Math.max(10, n)) : 50; }

function parseLayoutAndConnections(rows) {
  const layout = new Map(), connections = [];
  rows.forEach(row => {
    const name = getField(row, 'name', 'rank') || Object.values(row)[0];
    if (!name) return;
    const id = slugify(name);
    layout.set(id, {
      x: parseCoord(getField(row, 'x')),
      y: parseCoord(getField(row, 'y')),
      icon: getField(row, 'icon') || `${id}.png`
    });
    Object.keys(row).forEach(key => {
      if (!/^conn\d+$/i.test(normKey(key))) return;
      const target = row[key].trim();
      if (target) connections.push({ from: id, to: slugify(target) });
    });
  });
  return { layout, connections };
}

function applyData(data) {
  S.reqRegistry    = buildReqRegistry(data.reqs);
  S.influenceTasks = data.influenceTasks;

  const parsed = data.ranks.map((r, i) => parseRank(r, i));
  console.log('[applyData] parsed ranks:', parsed.map(r => `"${r.name}"(${r.id})`));
  S.ranks = parsed.filter(r => r.name); // only drop truly nameless rows
  console.log('[applyData] S.ranks after filter:', S.ranks.length);

  S.players = data.tracker;
  const { layout, connections } = parseLayoutAndConnections(data.nodelayout);
  S.layout = layout;
  S.connections = connections.length
    ? connections
    : S.ranks.slice(1).map((r, i) => ({ from: S.ranks[i].id, to: r.id }));
  console.log('[applyData] connections:', S.connections);
}

// ─── PLAYER LOGIC ───
const getPlayerName = p => getField(p, 'Player Name', 'player', 'name') || 'Unknown';
const getInfluence  = p => parseInt(getField(p, 'Influence Points', 'influence') || '0', 10);

function reqDone(player, req) {
  if (req.isInfluence) return getInfluence(player) >= req.threshold;
  return isTruthy(getField(player, req.name));
}

function rankCompleted(rank, player) {
  return rank.requirements.length > 0 && rank.requirements.every(r => reqDone(player, r));
}

function rankStatus(rank, player, completedIds) {
  if (rankCompleted(rank, player)) return 'completed';
  const incoming = S.connections.filter(c => c.to === rank.id);
  const prereqOk = incoming.length === 0 || incoming.every(c => completedIds.has(c.from));
  return prereqOk ? 'available' : 'locked';
}

function getProgress(player) {
  const allReqNames = [...new Set(S.ranks.flatMap(r => r.requirements.map(q => q.name)))];
  const completedIds = new Set(S.ranks.filter(r => rankCompleted(r, player)).map(r => r.id));
  const ranked = S.ranks.map(r => ({ ...r, status: rankStatus(r, player, completedIds) }));
  const doneRanks = ranked.filter(r => r.status === 'completed');
  const doneReqCount = allReqNames.filter(n => {
    const req = S.ranks.flatMap(r => r.requirements).find(r => r.name === n);
    return req ? reqDone(player, req) : false;
  }).length;
  return {
    ranks: ranked,
    completedRequirements: doneReqCount,
    totalRequirements: allReqNames.length,
    percent: allReqNames.length ? Math.round(doneReqCount / allReqNames.length * 100) : 0,
    currentRank: doneRanks[doneRanks.length - 1]?.name || getField(player, 'Ranking', 'rank') || 'Unranked',
    nextRank: ranked.find(r => r.status === 'available') || ranked.find(r => r.status !== 'completed'),
    highestRemaining: [...ranked].reverse().find(r => r.status !== 'completed'),
    completedIds
  };
}

// ─── ICONS ───
function getIconSrc(rank) {
  const l = S.layout.get(rank.id);
  return `${RANK_ICON_PATH}${cleanIcon(l?.icon || `${rank.id}.png`)}`;
}
function iconImg(rank, cls = 'rank-icon-img') {
  return `<img class="${esc(cls)}" src="${esc(getIconSrc(rank))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_RANK_ICON}'">`;
}

// ─── RENDER SIDEBAR ───
function renderSidebar(prog) {
  const p = S.selectedPlayer;
  const curRankObj = prog.ranks.find(r => r.name === prog.currentRank)
                  || prog.ranks.find(r => r.status === 'completed')
                  || prog.ranks[0];
  const rem = prog.nextRank?.requirements.filter(r => !reqDone(p, r)).length || 0;
  document.getElementById('sidebarPlayerName').textContent  = getPlayerName(p);
  document.getElementById('sidebarCurrentRank').textContent = prog.currentRank;
  document.getElementById('sidebarInfluence').textContent   = getInfluence(p);
  document.getElementById('currentRankIcon').innerHTML      = curRankObj ? iconImg(curRankObj, 'sidebar-rank-icon-img') : '✦';
  document.getElementById('progressPercent').textContent    = `${prog.percent}%`;
  document.getElementById('progressCounts').textContent     = `${prog.completedRequirements} / ${prog.totalRequirements} done`;
  document.getElementById('ringFill').style.strokeDashoffset = String(264 - (264 * prog.percent / 100));
  document.getElementById('nextRankName').textContent = prog.nextRank?.name || 'All complete';
  document.getElementById('nextRankDesc').textContent = prog.nextRank ? `${rem} requirements remaining` : 'The circle is complete';
}

function renderSelector() {
  const sel = document.getElementById('playerSelect');
  sel.innerHTML = S.players.map((p, i) => `<option value="${i}">${esc(getPlayerName(p))}</option>`).join('');
  sel.value = String(S.players.indexOf(S.selectedPlayer));
}

// ─── RENDER NODES ───
const statusLabel = s => s === 'completed' ? 'Completed' : s === 'available' ? 'Available' : 'Locked';

function renderNodes(prog) {
  const canvas = document.getElementById('mapCanvas');
  canvas.querySelectorAll('.node').forEach(n => n.remove());

  console.log('[renderNodes] rendering', prog.ranks.length, 'ranks');

  prog.ranks.forEach(rank => {
    const layout = S.layout.get(rank.id) || { x: 50, y: 50 };
    console.log(`[renderNodes] rank "${rank.name}" id="${rank.id}" x=${layout.x} y=${layout.y}`);

    const node = document.createElement('button');
    node.type = 'button';
    node.className = `node node-${rank.status}${rank.status === 'available' ? ' pulse' : ''}`;
    node.id = `node-${rank.id}`;
    node.style.left = `${layout.x}%`;
    node.style.top  = `${layout.y}%`;
    node.dataset.rankId = rank.id;
    node.innerHTML = `
      <div class="node-header">
        <div class="node-icon-wrap">${iconImg(rank)}</div>
        <div class="node-title-group">
          <div class="node-title">${esc(rank.name)}</div>
          <div class="node-status s-${rank.status}"><span class="status-dot"></span>${statusLabel(rank.status)}</div>
        </div>
      </div>
      <div class="node-body">
        <div class="node-checklist">${rank.requirements.map(r => {
          const done = reqDone(S.selectedPlayer, r);
          return `<div class="check-item${done ? ' done' : ''}"><span class="check-icon ${done ? 'c' : 'x'}">${done ? '✓' : '○'}</span>${esc(r.name)}</div>`;
        }).join('')}</div>
      </div>`;
    node.addEventListener('click', () => {
      selectNode(rank.id);
      if (window.innerWidth < 900) openDrawer();
    });
    canvas.appendChild(node);
  });
}

// ─── DRAW PATHS ───
function drawPaths(prog = getProgress(S.selectedPlayer)) {
  const canvas = document.getElementById('mapCanvas');
  const svg    = document.getElementById('pathSvg');
  const rect   = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  function center(id) {
    const el = document.getElementById(`node-${id}`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left - rect.left + r.width / 2, y: r.top - rect.top + r.height / 2 };
  }

  function pStatus(conn) {
    const f = prog.ranks.find(r => r.id === conn.from);
    const t = prog.ranks.find(r => r.id === conn.to);
    if (f?.status === 'completed' && t?.status === 'completed') return 'completed';
    if (f?.status === 'completed' && t?.status === 'available')  return 'available';
    return 'locked';
  }

  const colors = { completed: '#f0c060', available: '#9b6dff', locked: '#4a3a60' };
  svg.innerHTML = S.connections.map(conn => {
    const a = center(conn.from), b = center(conn.to);
    if (!a || !b) return '';
    const cpx = a.x + (b.x - a.x) * 0.5, st = pStatus(conn);
    return `<path d="M${a.x},${a.y} C${cpx},${a.y} ${cpx},${b.y} ${b.x},${b.y}" fill="none" stroke="${colors[st]}" stroke-width="2.5" class="path-${st}" stroke-linecap="round"/>`;
  }).join('');
}

// ─── RIGHT PANEL ───
function renderReqRow(req, player, index) {
  const done = reqDone(player, req);
  const sel  = S.selectedReqName === req.name;
  return `<button type="button" class="req-row req-button ${done ? 'done' : 'pending'}${sel ? ' selected' : ''}" data-req-index="${index}">
    <div class="req-circle">${done ? '✓' : '○'}</div>
    <div class="req-name">${esc(req.name)}${req.isInfluence ? ` <span class="ip-badge">🔮 ${getInfluence(player)} / ${req.threshold}</span>` : ''}</div>
  </button>`;
}

function selectNode(id) {
  const prog = getProgress(S.selectedPlayer);
  const rank = prog.ranks.find(r => r.id === id) || prog.nextRank || prog.ranks[0];
  if (!rank) return;
  if (S.selectedRankId !== rank.id) S.selectedReqName = null;
  S.selectedRankId = rank.id;

  document.getElementById('detailIcon').innerHTML    = iconImg(rank, 'detail-rank-icon-img');
  document.getElementById('detailTitle').textContent = rank.name.toUpperCase();
  document.getElementById('detailSub').textContent   = statusLabel(rank.status);
  document.getElementById('detailLore').innerHTML  = parseFormatting(rank.description || rank.lore || 'No description.');
  document.getElementById('detailReqs').innerHTML    = rank.requirements.map((r, i) => renderReqRow(r, S.selectedPlayer, i)).join('') || '<div class="req-row pending">No requirements.</div>';
  document.getElementById('detailRewards').innerHTML = rank.rewards.map((r, i) =>
    `<div class="reward-tile"><div class="reward-tile-icon">${REWARD_ICONS[i % REWARD_ICONS.length]}</div><div class="reward-tile-name">${esc(r)}</div></div>`
  ).join('') || '<div class="reward-tile"><div class="reward-tile-icon">✦</div><div class="reward-tile-name">None</div></div>';

  document.querySelectorAll('.node').forEach(n => n.classList.toggle('selected', n.dataset.rankId === rank.id));

  document.querySelectorAll('.req-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.reqIndex);
      const req = rank.requirements[idx];
      if (!req) return;
      if (req.isInfluence) { openInfluenceModal(); return; }
      S.selectedReqName = req.name;
      document.querySelectorAll('.req-button').forEach(b => b.classList.toggle('selected', Number(b.dataset.reqIndex) === idx));
      renderReqDetail(req);
    });
  });

  renderReqDetail(rank.requirements.find(r => r.name === S.selectedReqName) || null);
}

function renderReqDetail(req) {
  document.getElementById('requirementDetailName').textContent = req ? req.name : 'Select a requirement to view details.';
  document.getElementById('requirementDetailType').textContent = req?.type ? `Type: ${req.type}` : '';
  document.getElementById('requirementDetailDescription').innerHTML = parseFormatting(req?.description || (req ? 'No description.' : ''));
}

// ─── INFLUENCE MODAL ───
function openInfluenceModal() {
  const player = S.selectedPlayer;
  const influence = getInfluence(player);
  document.getElementById('ipModalInfluence').textContent = `${influence} pts earned`;
  document.getElementById('ipTaskList').innerHTML = S.influenceTasks.map(t => {
    const name  = getField(t, 'name');
    const desc  = getField(t, 'description', 'Description');
    const pts   = getField(t, 'points', 'Points');
    const notes = getField(t, 'notes', 'Notes');
    const done  = isTruthy(getField(player, name));
    return `<div class="ip-row${done ? ' ip-done' : ''}">
      <div class="ip-check">${done ? '✓' : '○'}</div>
      <div class="ip-info">
        <div class="ip-name">${esc(name)}</div>
        ${desc  ? `<div class="ip-desc">${parseFormatting(desc)}</div>` : ''}
        ${notes ? `<div class="ip-notes">${parseFormatting(notes)}</div>` : ''}
      </div>
      <div class="ip-pts">${pts ? `+${pts}` : ''}</div>
    </div>`;
  }).join('') || '<div style="color:var(--text3);padding:12px;font-style:italic;">No tasks found.</div>';
  document.getElementById('ipModal').classList.add('open');
}
function closeInfluenceModal() { document.getElementById('ipModal').classList.remove('open'); }

// ─── MOBILE ───
function openDrawer()  { document.getElementById('rightPanel').classList.add('drawer-open');    document.getElementById('drawerBackdrop').classList.add('visible'); }
function closeDrawer() { document.getElementById('rightPanel').classList.remove('drawer-open'); document.getElementById('drawerBackdrop').classList.remove('visible'); }

function initBottomNav() {
  document.querySelectorAll('.bnav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const lp = document.getElementById('leftPanel');
      const view = btn.dataset.view;
      if      (view === 'map')    { lp.classList.remove('mobile-visible'); closeDrawer(); }
      else if (view === 'player') { lp.classList.add('mobile-visible');    closeDrawer(); }
      else if (view === 'detail') { lp.classList.remove('mobile-visible'); openDrawer();  }
    });
  });
}

// ─── RENDER APP ───
function renderApp() {
  if (!S.selectedPlayer) { console.warn('[renderApp] no selectedPlayer'); return; }
  const prog = getProgress(S.selectedPlayer);
  renderSelector();
  renderSidebar(prog);
  renderNodes(prog);
  // Double rAF: nodes need one paint cycle before getBoundingClientRect works
  requestAnimationFrame(() => requestAnimationFrame(() => {
    drawPaths(prog);
    selectNode(S.selectedRankId || prog.nextRank?.id || prog.ranks[0]?.id);
  }));
}

async function refresh() {
  const name = getPlayerName(S.selectedPlayer), rid = S.selectedRankId;
  applyData(await loadAll());
  S.selectedPlayer = S.players.find(p => getPlayerName(p) === name) || S.players[0];
  S.selectedRankId = S.ranks.some(r => r.id === rid) ? rid : null;
  renderApp();
}

// ─── INIT ───
async function init() {
  console.log('[init] starting...');
  const data = await loadAll();
  console.log('[init] data loaded');
  applyData(data);
  console.log('[init] S.ranks:', S.ranks.length, '| S.players:', S.players.length, '| S.layout:', S.layout.size);
  S.selectedPlayer = S.players[0];

  document.getElementById('playerSelect').addEventListener('change', e => {
    S.selectedPlayer = S.players[Number(e.target.value)];
    S.selectedRankId = null; S.selectedReqName = null;
    renderApp();
  });

  document.getElementById('drawerBackdrop').addEventListener('click', closeDrawer);
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('ipModalClose').addEventListener('click', closeInfluenceModal);
  document.getElementById('ipModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeInfluenceModal(); });

  initBottomNav();
  renderApp();
  setInterval(refresh, 60000);
}

let rafResize;
window.addEventListener('resize', () => { cancelAnimationFrame(rafResize); rafResize = requestAnimationFrame(() => drawPaths()); });
document.addEventListener('DOMContentLoaded', init);
--- END OF FILE main.js ---
