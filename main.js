// ─── GOOGLE SHEETS CONFIG ───
const SHEET_ID = '1FFEg75S6-HKlN58pMROvtTkBry1FYGrVruPsUbaf4qA';
const SHEET_NAMES = {
  ranks: 'ranks',
  requirements: 'reqs',
  tracker: 'tracker',
  layout: 'nodelayout',
  connections: 'connections'
};
const RANK_ICON_PATH = 'images/ranks/';
const DEFAULT_RANK_ICON = `${RANK_ICON_PATH}default.png`;

const FALLBACK_SHEET_DATA = {
  ranks: [
    {
      name: 'Initiate',
      description: 'Every great mage begins with a single candle lit in devotion. You offered yourself to Goddess Freyja and she answered.',
      lore: 'The first flame is small, but it remembers the shape of every future star.',
      rewards: 'L7 Pointy Hat; Sparkler; Arcane Studies; Wisp Garden',
      req1: 'Offering to Goddess Freyja',
      'req1 description': 'Make the first guild offering and pledge yourself to the circle.'
    },
    {
      name: 'Enchanter',
      description: 'The threads of arcane weave between your fingers like old friends. You have mastered the abyss and returned.',
      lore: 'The circle recognizes those who can bind power without being bound by it.',
      rewards: 'L1 Feather Cape; Hat → L17; L6 Eitr Robes; 2 Bloodstones; Elite Bombs; Resist Potions',
      req1: 'Advanced Arcane Arts',
      'req1 description': 'Complete the advanced arcane curriculum.',
      req2: '30 Influence Points',
      'req2 description': 'Earn at least 30 influence points.',
      req3: 'Here Lies the Abyss',
      'req3 description': 'Survive the abyssal trial.',
      req4: 'Horcrux Hunt',
      'req4 description': 'Recover the hidden horcruxes.'
    },
    {
      name: 'Archmage',
      description: 'The apex of mortal mastery. Only those who have conquered pride, fire, water, and the void itself may claim this title.',
      lore: 'A crown is not worn by the Archmage; it orbits them like a loyal moon.',
      rewards: 'L22 Staff; Embla Hood; Linen Cape; Lava Bombs; Shroomshake; Marinated',
      req1: 'Expert Arcane Arts',
      'req1 description': 'Complete expert arcane training.',
      req2: '70 Influence Points',
      'req2 description': 'Earn at least 70 influence points.',
      req3: 'Win at Mage Duels',
      'req3 description': 'Prove your battle-craft in sanctioned duels.',
      req4: '4 Arcane Masteries',
      'req4 description': 'Complete four arcane mastery paths.'
    },
    {
      name: 'Ember Citadel',
      description: 'The Ember Lord fell, his crown of ash and cinder scattered to the wind. Fire could not stand against your will.',
      lore: 'The citadel still glows at night, but now its flames bow in greeting.',
      rewards: 'Ember Core; Ashen Blade; Fire Ward; 200 Influence',
      req1: 'Defeat the Ember Lord',
      'req1 description': 'Defeat the Ember Lord within the citadel.'
    },
    {
      name: 'Drowned Vault',
      description: 'The tides obeyed. The ancient keep yielded its secrets to you, and the drowned souls found peace.',
      lore: 'Beneath the black water, the vault door opens only for those who do not fear silence.',
      rewards: 'Tide Pearl; Vault Key; Frost Rune; 200 Influence',
      req1: 'Conquer the Drowned Keep',
      'req1 description': 'Clear the Drowned Keep and claim the vault.'
    },
    {
      name: 'Ashen Spire',
      description: 'The spire rises from ash and shadow. Only those who have proven themselves in fire and water may ascend.',
      lore: 'Together we weave the threads of fate, until the void itself bows to our will.',
      rewards: 'Ashen Robes; Spire Mount; Arcane Core; 500 Influence; Legendary Title; Guild Emblem',
      req1: 'Complete Ember Citadel',
      'req1 description': 'Finish the Ember Citadel path.',
      req2: 'Complete Drowned Vault',
      'req2 description': 'Finish the Drowned Vault path.',
      req3: 'Defeat the Ashen Guardian',
      'req3 description': 'Defeat the guardian at the spire summit.'
    },
    {
      name: 'Void Throne',
      description: 'Where reality unravels and the void breathes. Only the Archmage who has walked every path may sit upon this throne.',
      lore: 'The void does not end the story. It waits to learn your name.',
      rewards: 'Void Crown; Void Mount; Guild Legacy; Grand Title',
      req1: 'Complete Ashen Spire',
      'req1 description': 'Complete Ashen Spire.',
      req2: 'Complete all rank quests',
      'req2 description': 'Complete every required rank quest.'
    }
  ],
  reqs: [],
  tracker: [
    {
      'Player Name': 'Archmage Lyra',
      Ranking: 'Enchanter',
      'Influence Points': '30',
      'Offering to Goddess Freyja': 'TRUE',
      'Advanced Arcane Arts': 'TRUE',
      '30 Influence Points': 'TRUE',
      'Here Lies the Abyss': 'TRUE',
      'Horcrux Hunt': 'TRUE',
      'Defeat the Ember Lord': 'TRUE',
      'Conquer the Drowned Keep': 'TRUE',
      'Complete Ember Citadel': 'TRUE',
      'Complete Drowned Vault': 'TRUE',
      'Defeat the Ashen Guardian': 'FALSE',
      'Expert Arcane Arts': 'FALSE',
      '70 Influence Points': 'FALSE',
      'Win at Mage Duels': 'FALSE',
      '4 Arcane Masteries': 'FALSE',
      'Complete Ashen Spire': 'FALSE',
      'Complete all rank quests': 'FALSE'
    }
  ],
  nodelayout: [
    { name: 'Initiate', x: '10', y: '15', icon: 'initiate.png' },
    { name: 'Enchanter', x: '38', y: '27', icon: 'enchanter.png' },
    { name: 'Archmage', x: '80', y: '12', icon: 'archmage.png' },
    { name: 'Ember Citadel', x: '15', y: '50', icon: 'ember-citadel.png' },
    { name: 'Drowned Vault', x: '78', y: '48', icon: 'drowned-vault.png' },
    { name: 'Ashen Spire', x: '50', y: '72', icon: 'ashen-spire.png' },
    { name: 'Void Throne', x: '50', y: '92', icon: 'void-throne.png' }
  ],
  connections: [
    { from: 'Initiate', to: 'Enchanter' },
    { from: 'Enchanter', to: 'Ember Citadel' },
    { from: 'Enchanter', to: 'Drowned Vault' },
    { from: 'Enchanter', to: 'Archmage' },
    { from: 'Ember Citadel', to: 'Ashen Spire' },
    { from: 'Drowned Vault', to: 'Ashen Spire' },
    { from: 'Ashen Spire', to: 'Void Throne' }
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

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanIconFilename(value) {
  return String(value || '')
    .split('/')
    .pop()
    .replace(/[^a-zA-Z0-9._-]/g, '') || 'default.png';
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
  return ['true', 'yes', 'y', '1', 'complete', 'completed', 'done'].includes(String(value).trim().toLowerCase());
}

function splitList(value) {
  return String(value || '')
    .split(/[;|\n,]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function csvUrl(sheetName) {
  const params = new URLSearchParams({ tqx: 'out:csv', sheet: sheetName });
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${params.toString()}`;
}

function parseCsv(csv) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(current);
      if (row.some(cell => cell.trim() !== '')) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  row.push(current);
  if (row.some(cell => cell.trim() !== '')) rows.push(row);
  if (!rows.length) return [];

  const headers = rows[0].map(header => header.trim());
  return rows.slice(1).map(cells => headers.reduce((record, header, index) => {
    record[header] = (cells[index] || '').trim();
    return record;
  }, {}));
}

async function loadSheet(sheetName, fallbackRows = [], optional = false) {
  try {
    const response = await fetch(csvUrl(sheetName), { cache: 'no-store' });
    if (!response.ok) throw new Error(`${sheetName} responded ${response.status}`);
    const text = await response.text();
    const rows = parseCsv(text);
    return rows.length || optional ? rows : fallbackRows;
  } catch (error) {
    console.warn(`Using fallback data for ${sheetName}:`, error);
    return fallbackRows;
  }
}

async function loadSheetData() {
  const [ranks, reqs, tracker, nodelayout, connections] = await Promise.all([
    loadSheet(SHEET_NAMES.ranks, FALLBACK_SHEET_DATA.ranks),
    loadSheet(SHEET_NAMES.requirements, FALLBACK_SHEET_DATA.reqs, true),
    loadSheet(SHEET_NAMES.tracker, FALLBACK_SHEET_DATA.tracker),
    loadSheet(SHEET_NAMES.layout, FALLBACK_SHEET_DATA.nodelayout),
    loadSheet(SHEET_NAMES.connections, FALLBACK_SHEET_DATA.connections, true)
  ]);

  return {
    ranks,
    reqs,
    tracker,
    nodelayout,
    connections: connections.length ? connections : inferConnections(ranks)
  };
}

function buildRequirementRegistry(reqRows) {
  return new Map(reqRows.map(row => [
    normalizeKey(getField(row, 'name')),
    {
      name: getField(row, 'name'),
      type: getField(row, 'type'),
      description: getField(row, 'description')
    }
  ]).filter(([name]) => name));
}

function parseRank(row, index, registry) {
  const name = getField(row, 'name', 'rank name', 'rank');
  const requirements = [];

  Object.keys(row).forEach(key => {
    const match = normalizeKey(key).match(/^req\s*(\d+)$/);
    if (!match) return;
    const reqName = row[key].trim();
    if (!reqName) return;
    const reqNumber = match[1];
    const registryMatch = registry.get(normalizeKey(reqName));
    requirements.push({
      name: reqName,
      description: getField(row, `req${reqNumber} description`, `req ${reqNumber} description`) || registryMatch?.description || '',
      type: registryMatch?.type || ''
    });
  });

  requirements.sort((a, b) => {
    const aIndex = Object.values(row).indexOf(a.name);
    const bIndex = Object.values(row).indexOf(b.name);
    return aIndex - bIndex;
  });

  return {
    id: slugify(name || `rank-${index + 1}`),
    order: index,
    name,
    description: getField(row, 'description', 'rank description', 'details') || getField(row, 'lore'),
    lore: getField(row, 'lore', 'additional lore', 'flavor') || getField(row, 'description'),
    rewards: splitList(getField(row, 'rewards', 'reward')),
    requirements
  };
}

function parseCoordinate(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(95, Math.max(5, parsed));
}

function parseLayout(rows) {
  return new Map(rows.map(row => {
    const name = getField(row, 'name', 'rank');
    return [slugify(name), {
      x: parseCoordinate(getField(row, 'x')),
      y: parseCoordinate(getField(row, 'y')),
      icon: getField(row, 'icon') || `${slugify(name)}.png`
    }];
  }).filter(([id]) => id));
}

function parseConnections(rows) {
  return rows.map(row => ({
    from: slugify(getField(row, 'from', 'source', 'parent', 'prerequisite')),
    to: slugify(getField(row, 'to', 'target', 'child', 'rank'))
  })).filter(connection => connection.from && connection.to);
}

function inferConnections(ranks) {
  return ranks.slice(1).map((rank, index) => ({
    from: getField(ranks[index], 'name', 'rank'),
    to: getField(rank, 'name', 'rank')
  }));
}

function getPlayerName(player) {
  return getField(player, 'Player Name', 'player', 'name') || 'Unknown Player';
}

function getInfluence(player) {
  return getField(player, 'Influence Points', 'influence', 'influence points') || '0';
}

function requirementDone(player, requirementName) {
  return isTruthy(getField(player, requirementName));
}

function rankIsCompleted(rank, player) {
  return rank.requirements.length > 0 && rank.requirements.every(req => requirementDone(player, req.name));
}

function getRankStatus(rank, player, completedRankIds) {
  if (rankIsCompleted(rank, player)) return 'completed';
  const incoming = appState.connections.filter(connection => connection.to === rank.id);
  const prereqsComplete = incoming.length === 0 || incoming.every(connection => completedRankIds.has(connection.from));
  return prereqsComplete ? 'available' : 'locked';
}

function getPlayerProgress(player) {
  const requirementNames = [...new Set(appState.ranks.flatMap(rank => rank.requirements.map(req => req.name)))];
  const completedRequirements = requirementNames.filter(req => requirementDone(player, req)).length;
  const totalRequirements = requirementNames.length;
  const completedRankIds = new Set(appState.ranks.filter(rank => rankIsCompleted(rank, player)).map(rank => rank.id));
  const ranked = appState.ranks.map(rank => ({
    ...rank,
    status: getRankStatus(rank, player, completedRankIds)
  }));
  const completedRanks = ranked.filter(rank => rank.status === 'completed');
  const currentRank = completedRanks[completedRanks.length - 1]?.name || getField(player, 'Ranking', 'rank', 'current rank') || 'Unranked';
  const nextRank = ranked.find(rank => rank.status === 'available') || ranked.find(rank => rank.status !== 'completed');
  const highestRemaining = [...ranked].reverse().find(rank => rank.status !== 'completed');

  return {
    ranks: ranked,
    completedRequirements,
    totalRequirements,
    percent: totalRequirements ? Math.round((completedRequirements / totalRequirements) * 100) : 0,
    currentRank,
    nextRank,
    highestRemaining,
    completedRankIds
  };
}

function getIconSrc(rank) {
  const layout = appState.layout.get(rank.id);
  const icon = cleanIconFilename(layout?.icon || `${rank.id}.png`);
  return `${RANK_ICON_PATH}${icon}`;
}

function iconImage(rank, className = 'rank-icon-img') {
  return `<img class="${escapeHtml(className)}" src="${escapeHtml(getIconSrc(rank))}" alt="" onerror="this.onerror=null;this.src='${DEFAULT_RANK_ICON}'">`;
}

function renderPlayerSelector() {
  const selector = document.getElementById('playerSelect');
  selector.innerHTML = appState.players.map((player, index) => `
    <option value="${index}">${escapeHtml(getPlayerName(player))}</option>
  `).join('');
  selector.value = String(appState.players.indexOf(appState.selectedPlayer));
}

function renderSidebar(progress) {
  const player = appState.selectedPlayer;
  const currentRank = progress.ranks.find(rank => rank.name === progress.currentRank) || progress.ranks.find(rank => rank.status === 'completed') || progress.ranks[0];
  const remainingForNext = progress.nextRank?.requirements.filter(req => !requirementDone(player, req.name)).length || 0;

  document.getElementById('sidebarPlayerName').textContent = getPlayerName(player);
  document.getElementById('sidebarCurrentRank').textContent = progress.currentRank;
  document.getElementById('sidebarInfluence').textContent = getInfluence(player);
  document.getElementById('currentRankIcon').innerHTML = currentRank ? iconImage(currentRank, 'sidebar-rank-icon-img') : '✦';
  document.getElementById('progressPercent').textContent = `${progress.percent}%`;
  document.getElementById('progressCounts').textContent = `${progress.completedRequirements} / ${progress.totalRequirements} done`;
  document.getElementById('ringFill').style.strokeDashoffset = 264 - (264 * progress.percent / 100);
  document.getElementById('nextRankName').textContent = progress.nextRank?.name || 'All ranks complete';
  document.getElementById('nextRankDesc').textContent = progress.nextRank ? `${remainingForNext} requirements remaining` : 'The circle is complete';
  document.getElementById('finalGoalName').textContent = progress.highestRemaining?.name || 'Legacy Secured';
  document.getElementById('finalGoalDesc').textContent = progress.highestRemaining ? 'Highest rank remaining' : 'No ranks remaining';
}

function requirementRow(requirement, player) {
  const done = requirementDone(player, requirement.name);
  return `<div class="check-item ${done ? 'done' : ''}"><span class="check-icon ${done ? 'c' : 'x'}">${done ? '✓' : '○'}</span> ${escapeHtml(requirement.name)}</div>`;
}

function statusLabel(status) {
  if (status === 'completed') return 'Completed';
  if (status === 'available') return 'Available';
  return 'Locked';
}

function renderNodes(progress) {
  const canvas = document.getElementById('mapCanvas');
  canvas.querySelectorAll('.node').forEach(node => node.remove());

  progress.ranks.forEach(rank => {
    const layout = appState.layout.get(rank.id) || { x: 50, y: 50 };
    const node = document.createElement('button');
    node.type = 'button';
    node.className = `node node-${rank.status}${rank.status === 'available' ? ' pulse' : ''}`;
    node.id = `node-${rank.id}`;
    node.style.left = `${layout.x}%`;
    node.style.top = `${layout.y}%`;
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
        <div class="node-checklist">${rank.requirements.map(req => requirementRow(req, appState.selectedPlayer)).join('')}</div>
      </div>
    `;
    node.addEventListener('click', () => selectNode(rank.id));
    canvas.appendChild(node);
  });
}

function renderDetailRequirement(requirement, player, index) {
  const done = requirementDone(player, requirement.name);
  const selected = appState.selectedRequirementName === requirement.name;
  return `
    <button type="button" class="req-row req-button ${done ? 'done' : 'pending'}${selected ? ' selected' : ''}" data-req-index="${index}">
      <div class="req-circle">${done ? '✓' : '○'}</div>
      <div class="req-name">${escapeHtml(requirement.name)}</div>
    </button>
  `;
}

function getRequirementDetails(requirement) {
  const registryMatch = appState.reqRegistry.get(normalizeKey(requirement?.name));
  return {
    name: registryMatch?.name || requirement?.name || '',
    type: registryMatch?.type || requirement?.type || 'Requirement',
    description: registryMatch?.description || requirement?.description || 'No description provided.'
  };
}

function renderRequirementDetails(requirement) {
  const nameEl = document.getElementById('requirementDetailName');
  const typeEl = document.getElementById('requirementDetailType');
  const descEl = document.getElementById('requirementDetailDescription');

  if (!requirement) {
    nameEl.textContent = 'Select a requirement to view details.';
    typeEl.textContent = '';
    descEl.textContent = '';
    return;
  }

  const details = getRequirementDetails(requirement);
  nameEl.textContent = details.name;
  typeEl.textContent = `Type: ${details.type}`;
  descEl.textContent = details.description;
}

function selectRequirement(rank, requirementIndex) {
  const requirement = rank.requirements[requirementIndex];
  if (!requirement) return;
  appState.selectedRequirementName = requirement.name;
  document.querySelectorAll('.req-button').forEach(button => {
    button.classList.toggle('selected', Number(button.dataset.reqIndex) === requirementIndex);
  });
  renderRequirementDetails(requirement);
}

function renderReward(reward, index) {
  return `
    <div class="reward-tile">
      <div class="reward-tile-icon">${rewardIcons[index % rewardIcons.length]}</div>
      <div class="reward-tile-name">${escapeHtml(reward)}</div>
    </div>
  `;
}

function selectNode(id) {
  const progress = getPlayerProgress(appState.selectedPlayer);
  const rank = progress.ranks.find(item => item.id === id) || progress.nextRank || progress.ranks[0];
  if (!rank) return;

  if (appState.selectedRankId !== rank.id) appState.selectedRequirementName = null;
  appState.selectedRankId = rank.id;
  document.getElementById('detailIcon').innerHTML = iconImage(rank, 'detail-rank-icon-img');
  document.getElementById('detailTitle').textContent = rank.name.toUpperCase();
  document.getElementById('detailSub').textContent = statusLabel(rank.status);
  document.getElementById('detailLore').textContent = rank.description || 'No rank description provided.';
  document.getElementById('detailReqs').innerHTML = rank.requirements.map((req, index) => renderDetailRequirement(req, appState.selectedPlayer, index)).join('') || '<div class="req-row pending">No requirements listed.</div>';
  document.getElementById('detailRewards').innerHTML = rank.rewards.map(renderReward).join('') || '<div class="reward-tile"><div class="reward-tile-icon">✦</div><div class="reward-tile-name">No rewards listed</div></div>';

  document.querySelectorAll('.node').forEach(node => node.classList.toggle('selected', node.dataset.rankId === rank.id));
  document.querySelectorAll('.req-button').forEach(button => {
    button.addEventListener('click', () => selectRequirement(rank, Number(button.dataset.reqIndex)));
  });

  const selectedRequirement = rank.requirements.find(req => req.name === appState.selectedRequirementName);
  renderRequirementDetails(selectedRequirement);
}

function drawPaths(progress = getPlayerProgress(appState.selectedPlayer)) {
  const canvas = document.getElementById('mapCanvas');
  const svg = document.getElementById('pathSvg');
  const rect = canvas.getBoundingClientRect();

  function center(id) {
    const el = document.getElementById(`node-${id}`);
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: r.left - rect.left + r.width / 2,
      y: r.top - rect.top + r.height / 2
    };
  }

  function pathStatus(connection) {
    const from = progress.ranks.find(rank => rank.id === connection.from);
    const to = progress.ranks.find(rank => rank.id === connection.to);
    if (from?.status === 'completed' && to?.status === 'completed') return 'completed';
    if (from?.status === 'completed' && to?.status === 'available') return 'available';
    return 'locked';
  }

  function curve(a, b, status) {
    const cp1x = a.x + (b.x - a.x) * 0.5;
    const cp1y = a.y;
    const cp2x = a.x + (b.x - a.x) * 0.5;
    const cp2y = b.y;
    const colors = { completed: '#60d090', available: '#9b6dff', locked: '#4a3a60' };
    return `<path d="M${a.x},${a.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${b.x},${b.y}"
      fill="none" stroke="${colors[status]}" stroke-width="2.5" class="path-${status}" stroke-linecap="round"/>`;
  }

  svg.innerHTML = appState.connections.map(connection => {
    const a = center(connection.from);
    const b = center(connection.to);
    return curve(a, b, pathStatus(connection));
  }).join('');
}

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
  const selectedPlayerName = getPlayerName(appState.selectedPlayer);
  const selectedRankId = appState.selectedRankId;
  const data = await loadSheetData();
  appState.reqRegistry = buildRequirementRegistry(data.reqs);
  appState.ranks = data.ranks.map((row, index) => parseRank(row, index, appState.reqRegistry)).filter(rank => rank.name);
  appState.players = data.tracker;
  appState.layout = parseLayout(data.nodelayout);
  appState.connections = parseConnections(data.connections);
  if (!appState.connections.length) appState.connections = parseConnections(inferConnections(data.ranks));
  appState.selectedPlayer = appState.players.find(player => getPlayerName(player) === selectedPlayerName) || appState.players[0];
  appState.selectedRankId = appState.ranks.some(rank => rank.id === selectedRankId) ? selectedRankId : null;
  renderApp();
}

async function init() {
  const data = await loadSheetData();
  appState.reqRegistry = buildRequirementRegistry(data.reqs);
  appState.ranks = data.ranks.map((row, index) => parseRank(row, index, appState.reqRegistry)).filter(rank => rank.name);
  appState.players = data.tracker;
  appState.layout = parseLayout(data.nodelayout);
  appState.connections = parseConnections(data.connections);
  if (!appState.connections.length) appState.connections = parseConnections(inferConnections(data.ranks));
  appState.selectedPlayer = appState.players[0];

  document.getElementById('playerSelect').addEventListener('change', event => {
    appState.selectedPlayer = appState.players[Number(event.target.value)];
    appState.selectedRankId = null;
    appState.selectedRequirementName = null;
    renderApp();
  });

  renderApp();
  setInterval(refreshFromSheets, 60000);
}

let resizeFrame;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => drawPaths());
});
window.addEventListener('load', init);
