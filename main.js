// ─── GOOGLE SHEETS CONFIG ───
const SHEET_ID = '1FFEg75S6-HKlN58pMROvtTkBry1FYGrVruPsUbaf4qA';
const SHEET_NAMES = {
  ranks: 'ranks',
  requirements: 'reqs',
  tracker: 'tracker',
  layout: 'nodelayout'
  // No separate connections sheet — connections are read from nodelayout conn1/conn2/conn3
};
const RANK_ICON_PATH = 'images/ranks/';
const DEFAULT_RANK_ICON = `${RANK_ICON_PATH}default.png`;

// ─── FALLBACK DATA (mirrors your actual sheet structure) ───
const FALLBACK_SHEET_DATA = {
  ranks: [
    {
      name: 'Initiate',
      description: 'Every great mage begins with a single candle lit in devotion.',
      lore: 'The first flame is small, but it remembers the shape of every future star.',
      rewards: 'L7 Pointy Hat; Sparkler; Arcane Studies; Wisp Garden',
      req1: 'Offering to Goddess Freyja'
    },
    {
      name: 'Apprentice',
      description: 'The foundations of magic take root. You are learning to listen to the weave.',
      lore: 'Patience is the first spell every apprentice must master.',
      rewards: 'Apprentice Robes; Herb Pouch; Rune Tablet',
      req1: 'Novice Herbalism',
      req2: 'Novice Potion-making',
      req3: 'Novice Runework'
    },
    {
      name: 'Enchanter',
      description: 'The threads of arcane weave between your fingers like old friends.',
      lore: 'The circle recognizes those who can bind power without being bound by it.',
      rewards: 'L1 Feather Cape; Hat → L17; L6 Eitr Robes; 2 Bloodstones',
      'influence points': '30',
      req1: 'Advanced Herbalism',
      req2: 'Advanced Potion-making',
      req3: 'Advanced Runework',
      req4: 'The Harrowing',
      req5: 'Here Lies the Abyss',
      req6: 'Horcrux Hunt'
    },
    {
      name: 'Archmage',
      description: 'The apex of mortal mastery. Only those who have conquered everything may claim this title.',
      lore: 'A crown is not worn by the Archmage; it orbits them like a loyal moon.',
      rewards: 'L22 Staff; Embla Hood; Linen Cape; Lava Bombs',
      'influence points': '70',
      req1: 'Expert Herbalism',
      req2: 'Expert Potion-making',
      req3: 'Expert Runework'
    }
  ],
  reqs: [],
  tracker: [
    {
      'Player Name': 'Archmage Lyra',
      Ranking: 'Enchanter',
      'Influence Points': '30',
      'Offering to Goddess Freyja': 'TRUE',
      'Novice Herbalism': 'TRUE',
      'Novice Potion-making': 'TRUE',
      'Novice Runework': 'TRUE',
      'The Harrowing': 'TRUE',
      'Advanced Herbalism': 'TRUE',
      'Advanced Potion-making': 'TRUE',
      'Advanced Runework': 'TRUE',
      'Here Lies the Abyss': 'FALSE',
      'Horcrux Hunt': 'FALSE',
      'Expert Herbalism': 'FALSE',
      'Expert Potion-making': 'FALSE',
      'Expert Runework': 'FALSE'
    }
  ],
  nodelayout: [
    { name: 'Initiate',   x: '50', y: '20', icon: 'initiate.png',   conn1: 'Apprentice' },
    { name: 'Apprentice', x: '10', y: '15', icon: 'apprentice.png', conn1: 'Enchanter' },
    { name: 'Enchanter',  x: '40', y: '25', icon: 'enchanter.png',  conn1: 'Archmage' },
    { name: 'Archmage',   x: '15', y: '55', icon: 'archmage.png' }
  ]
};

const rewardIcons = ['✦', '🎩', '🪄', '🧥', '🔮', '💎', '💣', '🧪', '🏅', '👑'];

let appState = {
  ranks: [],
  reqRegistry: new Map(),
  players: [],
  layout: new Map(),
  connections: [],
  selectedPlayer: null,
  selectedRankId: null,
  selectedRequirementName: null
};

// ─── UTILITIES ───
function slugify(value) {
  return String(value || '').trim().toLowerCase()
    .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function cleanIconFilename(value) {
  return String(value || '').split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '') || 'default.png';
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getField(row, ...names) {
  const entries = Object.entries(row || {});
  for (const name of names) {
    const wanted = normalizeKey(name);
    const found = entries.find(([key]) => normalizeKey(key) === wanted);
    if (found) return found[1];
  }
  return '';
}

function isTruthy(value) {
  return ['true', 'yes', 'y', '1', 'complete', 'completed', 'done']
    .includes(String(value).trim().toLowerCase());
}

function splitList(value) {
  return String(value || '').split(/[;|\n]+/).map(s => s.trim()).filter(Boolean);
}

// ─── CSV / SHEET LOADING ───
function csvUrl(sheetName) {
  const params = new URLSearchParams({ tqx: 'out:csv', sheet: sheetName });
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${params.toString()}`;
}

function parseCsv(csv) {
  const rows = [];
  let current = '', row = [], inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i], next = csv[i + 1];
    if (char === '"' && inQuotes && next === '"') { current += '"'; i++; }
    else if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { row.push(current); current = ''; }
    else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(current);
      if (row.some(c => c.trim())) rows.push(row);
      row = []; current = '';
    } else { current += char; }
  }
  row.push(current);
  if (row.some(c => c.trim())) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(cells =>
    headers.reduce((rec, h, i) => { rec[h] = (cells[i] || '').trim(); return rec; }, {})
  );
}

async function loadSheet(sheetName, fallbackRows = [], optional = false) {
  try {
    const response = await fetch(csvUrl(sheetName), { cache: 'no-store' });
    if (!response.ok) throw new Error(`${sheetName} responded ${response.status}`);
    const text = await response.text();
    const rows = parseCsv(text);
    return rows.length || optional ? rows : fallbackRows;
  } catch (error) {
    console.warn(`Using fallback for ${sheetName}:`, error);
    return fallbackRows;
  }
}

async function loadSheetData() {
  const [ranks, reqs, tracker, nodelayout] = await Promise.all([
    loadSheet(SHEET_NAMES.ranks,        FALLBACK_SHEET_DATA.ranks),
    loadSheet(SHEET_NAMES.requirements, FALLBACK_SHEET_DATA.reqs, true),
    loadSheet(SHEET_NAMES.tracker,      FALLBACK_SHEET_DATA.tracker),
    loadSheet(SHEET_NAMES.layout,       FALLBACK_SHEET_DATA.nodelayout)
  ]);
  return { ranks, reqs, tracker, nodelayout };
}

// ─── REQUIREMENT REGISTRY (from reqs sheet) ───
function buildRequirementRegistry(reqRows) {
  return new Map(
    reqRows.map(row => {
      const name = getField(row, 'name');
      if (!name) return null;
      return [normalizeKey(name), {
        name,
        // Support "type" column; fall back to "Points" as a hint
        type: getField(row, 'type') || (getField(row, 'points') ? 'Task' : 'Requirement'),
        description: getField(row, 'description', 'Description'),
        points: getField(row, 'points', 'Points'),
        notes: getField(row, 'notes', 'Notes')
      }];
    }).filter(Boolean)
  );
}

// ─── RANK PARSING ───
// FIX: Also reads "Influence points" column as a synthetic requirement
function parseRank(row, index, registry) {
  const name = getField(row, 'name', 'rank name', 'rank');
  const requirements = [];

  // Collect req1…reqN columns
  Object.keys(row).forEach(key => {
    const match = normalizeKey(key).match(/^req\s*(\d+)$/);
    if (!match) return;
    const reqName = row[key].trim();
    if (!reqName) return;
    const num = match[1];
    const reg = registry.get(normalizeKey(reqName));
    requirements.push({
      name: reqName,
      description: getField(row, `req${num} description`, `req ${num} description`) || reg?.description || '',
      type: reg?.type || '',
      points: reg?.points || '',
      _order: parseInt(num, 10)
    });
  });

  // FIX: "Influence points" column becomes a synthetic requirement
  const influenceVal = getField(row, 'influence points', 'influence');
  const influenceNum = parseInt(influenceVal, 10);
  if (influenceNum > 0) {
    const reqName = `${influenceNum} Influence Points`;
    const reg = registry.get(normalizeKey(reqName));
    requirements.push({
      name: reqName,
      description: reg?.description || `Earn at least ${influenceNum} influence points.`,
      type: reg?.type || 'Influence',
      points: '',
      _order: 999
    });
  }

  requirements.sort((a, b) => a._order - b._order);

  return {
    id: slugify(name || `rank-${index + 1}`),
    order: index,
    name,
    description: getField(row, 'description', 'rank description', 'details') || '',
    lore:        getField(row, 'lore', 'flavor', 'additional lore') || '',
    rewards:     splitList(getField(row, 'rewards', 'reward')),
    requirements
  };
}

// ─── LAYOUT & CONNECTIONS PARSING ───
// FIX: Extract conn1/conn2/conn3 from nodelayout rows to build connections
function parseCoordinate(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(95, Math.max(5, n)) : 50;
}

function parseLayoutAndConnections(rows) {
  const layout = new Map();
  const connections = [];

  rows.forEach(row => {
    const name = getField(row, 'name', 'rank');
    if (!name) return;
    const id = slugify(name);
    layout.set(id, {
      x:    parseCoordinate(getField(row, 'x')),
      y:    parseCoordinate(getField(row, 'y')),
      icon: getField(row, 'icon') || `${id}.png`
    });

    // Read conn1, conn2, conn3 … connN
    Object.keys(row).forEach(key => {
      if (!/^conn\d+$/i.test(normalizeKey(key))) return;
      const target = row[key].trim();
      if (target) connections.push({ from: id, to: slugify(target) });
    });
  });

  return { layout, connections };
}

// ─── PLAYER HELPERS ───
function getPlayerName(player) {
  return getField(player, 'Player Name', 'player', 'name') || 'Unknown Player';
}
function getInfluence(player) {
  return getField(player, 'Influence Points', 'influence') || '0';
}
function requirementDone(player, reqName) {
  // For influence-point requirements, compare numerically
  const ipMatch = reqName.match(/^(\d+)\s+influence\s+points?$/i);
  if (ipMatch) {
    return parseInt(getInfluence(player), 10) >= parseInt(ipMatch[1], 10);
  }
  return isTruthy(getField(player, reqName));
}
function rankIsCompleted(rank, player) {
  return rank.requirements.length > 0 && rank.requirements.every(r => requirementDone(player, r.name));
}
function getRankStatus(rank, player, completedIds) {
  if (rankIsCompleted(rank, player)) return 'completed';
  const incoming = appState.connections.filter(c => c.to === rank.id);
  const prereqsOk = incoming.length === 0 || incoming.every(c => completedIds.has(c.from));
  return prereqsOk ? 'available' : 'locked';
}
function getPlayerProgress(player) {
  const allReqNames = [...new Set(appState.ranks.flatMap(r => r.requirements.map(q => q.name)))];
  const completedReqs  = allReqNames.filter(n => requirementDone(player, n)).length;
  const completedIds   = new Set(appState.ranks.filter(r => rankIsCompleted(r, player)).map(r => r.id));
  const ranked = appState.ranks.map(r => ({ ...r, status: getRankStatus(r, player, completedIds) }));
  const completedRanks = ranked.filter(r => r.status === 'completed');
  const currentRank    = completedRanks[completedRanks.length - 1]?.name
                         || getField(player, 'Ranking', 'rank', 'current rank')
                         || 'Unranked';
  const nextRank        = ranked.find(r => r.status === 'available') || ranked.find(r => r.status !== 'completed');
  const highestRemaining = [...ranked].reverse().find(r => r.status !== 'completed');
  return {
    ranks: ranked,
    completedRequirements: completedReqs,
    totalRequirements: allReqNames.length,
    percent: allReqNames.length ? Math.round(completedReqs / allReqNames.length * 100) : 0,
    currentRank, nextRank, highestRemaining, completedIds
  };
}

// ─── ICON HELPERS ───
function getIconSrc(rank) {
  const layout = appState.layout.get(rank.id);
  const icon = cleanIconFilename(layout?.icon || `${rank.id}.png`);
  return `${RANK_ICON_PATH}${icon}`;
}
function iconImage(rank, className = 'rank-icon-img') {
  return `<img class="${escapeHtml(className)}" src="${escapeHtml(getIconSrc(rank))}" alt="" loading="lazy"
    onerror="this.onerror=null;this.src='${DEFAULT_RANK_ICON}'">`;
}

// ─── RENDER: PLAYER SELECTOR ───
function renderPlayerSelector() {
  const sel = document.getElementById('playerSelect');
  sel.innerHTML = appState.players.map((p, i) =>
    `<option value="${i}">${escapeHtml(getPlayerName(p))}</option>`
  ).join('');
  sel.value = String(appState.players.indexOf(appState.selectedPlayer));
}

// ─── RENDER: SIDEBAR ───
function renderSidebar(progress) {
  const player = appState.selectedPlayer;
  const currentRankObj = progress.ranks.find(r => r.name === progress.currentRank)
                      || progress.ranks.find(r => r.status === 'completed')
                      || progress.ranks[0];
  const remaining = progress.nextRank?.requirements.filter(r => !requirementDone(player, r.name)).length || 0;

  document.getElementById('sidebarPlayerName').textContent = getPlayerName(player);
  document.getElementById('sidebarCurrentRank').textContent = progress.currentRank;
  document.getElementById('sidebarInfluence').textContent = getInfluence(player);
  document.getElementById('currentRankIcon').innerHTML = currentRankObj ? iconImage(currentRankObj, 'sidebar-rank-icon-img') : '✦';
  document.getElementById('progressPercent').textContent = `${progress.percent}%`;
  document.getElementById('progressCounts').textContent = `${progress.completedRequirements} / ${progress.totalRequirements} done`;
  document.getElementById('ringFill').style.strokeDashoffset = String(264 - (264 * progress.percent / 100));
  document.getElementById('nextRankName').textContent = progress.nextRank?.name || 'All ranks complete';
  document.getElementById('nextRankDesc').textContent = progress.nextRank ? `${remaining} requirements remaining` : 'The circle is complete';
  document.getElementById('finalGoalName').textContent = progress.highestRemaining?.name || 'Legacy Secured';
  document.getElementById('finalGoalDesc').textContent = progress.highestRemaining ? 'Highest rank remaining' : 'No ranks remaining';
}

// ─── RENDER: NODE MAP ───
function statusLabel(status) {
  if (status === 'completed') return 'Completed';
  if (status === 'available') return 'Available';
  return 'Locked';
}
function requirementRow(req, player) {
  const done = requirementDone(player, req.name);
  return `<div class="check-item ${done ? 'done' : ''}">
    <span class="check-icon ${done ? 'c' : 'x'}">${done ? '✓' : '○'}</span>
    ${escapeHtml(req.name)}
  </div>`;
}

function renderNodes(progress) {
  const canvas = document.getElementById('mapCanvas');
  canvas.querySelectorAll('.node').forEach(n => n.remove());
  progress.ranks.forEach(rank => {
    const layout = appState.layout.get(rank.id) || { x: 50, y: 50 };
    const node = document.createElement('button');
    node.type = 'button';
    node.className = `node node-${rank.status}${rank.status === 'available' ? ' pulse' : ''}`;
    node.id = `node-${rank.id}`;
    node.style.left = `${layout.x}%`;
    node.style.top  = `${layout.y}%`;
    node.dataset.rankId = rank.id;
    node.innerHTML = `
      <div class="node-header">
        <div class="node-icon-wrap">${iconImage(rank)}</div>
        <div class="node-title-group">
          <div class="node-title">${escapeHtml(rank.name)}</div>
          <div class="node-status s-${rank.status}"><span class="status-dot"></span>${statusLabel(rank.status)}</div>
        </div>
      </div>
      <div class="node-body">
        <div class="node-checklist">${rank.requirements.map(r => requirementRow(r, appState.selectedPlayer)).join('')}</div>
      </div>`;
    node.addEventListener('click', () => {
      selectNode(rank.id);
      // On mobile, open the detail drawer
      if (window.innerWidth < 900) openDetailDrawer();
    });
    canvas.appendChild(node);
  });
}

// ─── RENDER: PATHS ───
function drawPaths(progress = getPlayerProgress(appState.selectedPlayer)) {
  const canvas = document.getElementById('mapCanvas');
  const svg    = document.getElementById('pathSvg');
  const rect   = canvas.getBoundingClientRect();

  function center(id) {
    const el = document.getElementById(`node-${id}`);
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: r.left - rect.left + r.width / 2, y: r.top - rect.top + r.height / 2 };
  }

  function pathStatus(conn) {
    const from = progress.ranks.find(r => r.id === conn.from);
    const to   = progress.ranks.find(r => r.id === conn.to);
    if (from?.status === 'completed' && to?.status === 'completed') return 'completed';
    if (from?.status === 'completed' && to?.status === 'available') return 'available';
    return 'locked';
  }

  const colors = { completed: '#60d090', available: '#9b6dff', locked: '#4a3a60' };
  svg.innerHTML = appState.connections.map(conn => {
    const a = center(conn.from), b = center(conn.to);
    const cpx = a.x + (b.x - a.x) * 0.5;
    const st  = pathStatus(conn);
    return `<path d="M${a.x},${a.y} C${cpx},${a.y} ${cpx},${b.y} ${b.x},${b.y}"
      fill="none" stroke="${colors[st]}" stroke-width="2.5" class="path-${st}" stroke-linecap="round"/>`;
  }).join('');
}

// ─── RENDER: RIGHT PANEL ───
function renderDetailRequirement(req, player, index) {
  const done     = requirementDone(player, req.name);
  const selected = appState.selectedRequirementName === req.name;
  return `<button type="button" class="req-row req-button ${done ? 'done' : 'pending'}${selected ? ' selected' : ''}" data-req-index="${index}">
    <div class="req-circle">${done ? '✓' : '○'}</div>
    <div class="req-name">${escapeHtml(req.name)}</div>
  </button>`;
}

function renderRequirementDetails(req) {
  const nameEl = document.getElementById('requirementDetailName');
  const typeEl = document.getElementById('requirementDetailType');
  const descEl = document.getElementById('requirementDetailDescription');
  if (!req) {
    nameEl.textContent = 'Select a requirement to view details.';
    typeEl.textContent = '';
    descEl.textContent = '';
    return;
  }
  const reg = appState.reqRegistry.get(normalizeKey(req.name));
  nameEl.textContent = req.name;
  typeEl.textContent = reg?.type || req.type ? `Type: ${reg?.type || req.type}` : '';
  // Build rich description — include points if available
  const desc = reg?.description || req.description || 'No description provided.';
  const pts  = reg?.points || req.points;
  descEl.textContent = pts ? `${desc} (${pts} pts)` : desc;
}

function selectRequirement(rank, index) {
  const req = rank.requirements[index];
  if (!req) return;
  appState.selectedRequirementName = req.name;
  document.querySelectorAll('.req-button').forEach(btn =>
    btn.classList.toggle('selected', Number(btn.dataset.reqIndex) === index)
  );
  renderRequirementDetails(req);
}

function renderReward(reward, index) {
  return `<div class="reward-tile">
    <div class="reward-tile-icon">${rewardIcons[index % rewardIcons.length]}</div>
    <div class="reward-tile-name">${escapeHtml(reward)}</div>
  </div>`;
}

function selectNode(id) {
  const progress = getPlayerProgress(appState.selectedPlayer);
  const rank = progress.ranks.find(r => r.id === id) || progress.nextRank || progress.ranks[0];
  if (!rank) return;

  if (appState.selectedRankId !== rank.id) appState.selectedRequirementName = null;
  appState.selectedRankId = rank.id;

  document.getElementById('detailIcon').innerHTML   = iconImage(rank, 'detail-rank-icon-img');
  document.getElementById('detailTitle').textContent = rank.name.toUpperCase();
  document.getElementById('detailSub').textContent   = statusLabel(rank.status);
  // Show description first; fall back to lore
  document.getElementById('detailLore').textContent  = rank.description || rank.lore || 'No description provided.';

  document.getElementById('detailReqs').innerHTML =
    rank.requirements.map((r, i) => renderDetailRequirement(r, appState.selectedPlayer, i)).join('')
    || '<div class="req-row pending">No requirements listed.</div>';

  document.getElementById('detailRewards').innerHTML =
    rank.rewards.map(renderReward).join('')
    || '<div class="reward-tile"><div class="reward-tile-icon">✦</div><div class="reward-tile-name">No rewards</div></div>';

  document.querySelectorAll('.node').forEach(n =>
    n.classList.toggle('selected', n.dataset.rankId === rank.id)
  );
  document.querySelectorAll('.req-button').forEach(btn =>
    btn.addEventListener('click', () => selectRequirement(rank, Number(btn.dataset.reqIndex)))
  );

  const selReq = rank.requirements.find(r => r.name === appState.selectedRequirementName);
  renderRequirementDetails(selReq || null);
}

// ─── MOBILE DRAWER ───
function openDetailDrawer() {
  document.getElementById('rightPanel').classList.add('drawer-open');
  document.getElementById('drawerBackdrop').classList.add('visible');
}
function closeDetailDrawer() {
  document.getElementById('rightPanel').classList.remove('drawer-open');
  document.getElementById('drawerBackdrop').classList.remove('visible');
}

// ─── MOBILE BOTTOM NAV ───
function initBottomNav() {
  document.querySelectorAll('.bnav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Toggle panels on mobile
      const leftPanel  = document.getElementById('leftPanel');
      const mapCanvas  = document.getElementById('mapCanvas');
      if (view === 'map') {
        leftPanel.style.display = 'none';
        mapCanvas.style.display = '';
        closeDetailDrawer();
      } else if (view === 'player') {
        leftPanel.style.display = '';
        mapCanvas.style.display = 'none';
        closeDetailDrawer();
      } else if (view === 'detail') {
        openDetailDrawer();
      }
    });
  });
}

// ─── MAIN RENDER ───
function renderApp() {
  if (!appState.selectedPlayer) return;
  const progress = getPlayerProgress(appState.selectedPlayer);
  renderPlayerSelector();
  renderSidebar(progress);
  renderNodes(progress);
  requestAnimationFrame(() => {
    drawPaths(progress);
    selectNode(appState.selectedRankId || progress.nextRank?.id || progress.ranks[0]?.id);
  });
}

async function refreshFromSheets() {
  const currentName   = getPlayerName(appState.selectedPlayer);
  const currentRankId = appState.selectedRankId;
  const data = await loadSheetData();
  applySheetData(data);
  appState.selectedPlayer  = appState.players.find(p => getPlayerName(p) === currentName) || appState.players[0];
  appState.selectedRankId  = appState.ranks.some(r => r.id === currentRankId) ? currentRankId : null;
  renderApp();
}

function applySheetData(data) {
  appState.reqRegistry = buildRequirementRegistry(data.reqs);
  appState.ranks       = data.ranks.map((row, i) => parseRank(row, i, appState.reqRegistry)).filter(r => r.name);
  appState.players     = data.tracker;
  const { layout, connections } = parseLayoutAndConnections(data.nodelayout);
  appState.layout      = layout;
  // Fall back to linear chain if no connections found in sheet
  appState.connections = connections.length ? connections : data.ranks.slice(1).map((row, i) => ({
    from: slugify(getField(data.ranks[i], 'name')),
    to:   slugify(getField(row, 'name'))
  }));
}

async function init() {
  const data = await loadSheetData();
  applySheetData(data);
  appState.selectedPlayer = appState.players[0];

  document.getElementById('playerSelect').addEventListener('change', e => {
    appState.selectedPlayer = appState.players[Number(e.target.value)];
    appState.selectedRankId = null;
    appState.selectedRequirementName = null;
    renderApp();
  });

  document.getElementById('drawerBackdrop')?.addEventListener('click', closeDetailDrawer);
  document.getElementById('drawerClose')?.addEventListener('click', closeDetailDrawer);

  initBottomNav();
  renderApp();
  setInterval(refreshFromSheets, 60000);
}

let resizeFrame;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => drawPaths());
});
window.addEventListener('load', init);
