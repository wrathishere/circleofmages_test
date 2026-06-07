// ─── NODE DATA ───
const nodeData = {
  initiate: {
    icon: '🕯️', title: 'INITIATE', sub: 'Rank I — Completed',
    lore: 'Every great mage begins with a single candle lit in devotion. You offered yourself to Goddess Freyja and she answered.',
    reqs: [{ done: true, text: 'Offering to Goddess Freyja' }],
    rewards: [
      { icon: '🎩', name: 'L7 Pointy Hat' }, { icon: '✨', name: 'Sparkler' },
      { icon: '📚', name: 'Arcane Studies' }, { icon: '🌿', name: 'Wisp Garden' },
    ]
  },
  enchanter: {
    icon: '✨', title: 'ENCHANTER', sub: 'Rank III — Completed',
    lore: 'The threads of arcane weave between your fingers like old friends. You have mastered the abyss and returned.',
    reqs: [
      { done: true, text: 'Advanced Arcane Arts' },
      { done: true, text: '30 Influence Points' },
      { done: true, text: 'Here Lies the Abyss' },
      { done: true, text: 'Horcrux Hunt' },
    ],
    rewards: [
      { icon: '🪶', name: 'L1 Feather Cape' }, { icon: '🎩', name: 'Hat → L17' },
      { icon: '👘', name: 'L6 Eitr Robes' }, { icon: '💎', name: '2 Bloodstones' },
      { icon: '💣', name: 'Elite Bombs' }, { icon: '🧪', name: 'Resist Potions' },
    ]
  },
  archmage: {
    icon: '👑', title: 'ARCHMAGE', sub: 'Rank IV — Locked',
    lore: 'The apex of mortal mastery. Only those who have conquered pride, fire, water, and the void itself may claim this title.',
    reqs: [
      { done: false, text: 'Expert Arcane Arts', locked: true },
      { done: false, text: '70 Influence Points', locked: true },
      { done: false, text: 'Win at Mage Duels', locked: true },
      { done: false, text: '4 Arcane Masteries', locked: true },
      { done: false, text: 'What Pride Had Wrought', locked: true },
    ],
    rewards: [
      { icon: '🪄', name: 'L22 Staff' }, { icon: '🧥', name: 'Embla Hood' },
      { icon: '🏳️', name: 'Linen Cape' }, { icon: '💥', name: 'Lava Bombs' },
      { icon: '🍄', name: 'Shroomshake' }, { icon: '🌿', name: 'Marinated' },
    ]
  },
  ember: {
    icon: '🔥', title: 'EMBER CITADEL', sub: 'Side Quest — Completed',
    lore: 'The Ember Lord fell, his crown of ash and cinder scattered to the wind. Fire could not stand against your will.',
    reqs: [{ done: true, text: 'Defeat the Ember Lord' }],
    rewards: [
      { icon: '🔥', name: 'Ember Core' }, { icon: '🗡️', name: 'Ashen Blade' },
      { icon: '🛡️', name: 'Fire Ward' }, { icon: '⭐', name: '200 Influence' },
    ]
  },
  vault: {
    icon: '💧', title: 'DROWNED VAULT', sub: 'Side Quest — Completed',
    lore: 'The tides obeyed. The ancient keep yielded its secrets to you, and the drowned souls found peace.',
    reqs: [{ done: true, text: 'Conquer the Drowned Keep' }],
    rewards: [
      { icon: '💧', name: 'Tide Pearl' }, { icon: '🔮', name: 'Vault Key' },
      { icon: '🧊', name: 'Frost Rune' }, { icon: '⭐', name: '200 Influence' },
    ]
  },
  ashen: {
    icon: '🏔️', title: 'ASHEN SPIRE', sub: 'Rank Details',
    lore: 'The spire rises from ash and shadow. Only those who have proven themselves in fire and water may ascend.',
    reqs: [
      { done: true, text: 'Complete Ember Citadel' },
      { done: true, text: 'Complete Drowned Vault' },
      { done: false, text: 'Defeat the Ashen Guardian' },
    ],
    rewards: [
      { icon: '🧥', name: 'Ashen Robes' }, { icon: '🐉', name: 'Spire Mount' },
      { icon: '🔮', name: 'Arcane Core' }, { icon: '⚔️', name: '500 Influence' },
      { icon: '🏅', name: 'Legendary Title' }, { icon: '🌀', name: 'Guild Emblem' },
    ]
  },
  void: {
    icon: '🔒', title: 'VOID THRONE', sub: 'Final Challenge — Locked',
    lore: 'Where reality unravels and the void breathes. Only the Archmage who has walked every path may sit upon this throne.',
    reqs: [
      { done: false, text: 'Complete Ashen Spire', locked: true },
      { done: false, text: 'Complete all rank quests', locked: true },
    ],
    rewards: [
      { icon: '👑', name: 'Void Crown' }, { icon: '🌌', name: 'Void Mount' },
      { icon: '✦', name: 'Guild Legacy' }, { icon: '🏆', name: 'Grand Title' },
    ]
  }
};

function selectNode(id) {
  const data = nodeData[id];
  if (!data) return;
  document.getElementById('detailIcon').textContent = data.icon;
  document.getElementById('detailTitle').textContent = data.title;
  document.getElementById('detailSub').textContent = data.sub;
  document.getElementById('detailLore').textContent = data.lore;

  const reqs = document.getElementById('detailReqs');
  reqs.innerHTML = data.reqs.map(r => `
    <div class="req-row ${r.done ? 'done' : r.locked ? 'locked' : 'pending'}">
      <div class="req-circle">${r.done ? '✓' : '○'}</div>
      ${r.text}
    </div>
  `).join('');

  const rwds = document.getElementById('detailRewards');
  rwds.innerHTML = data.rewards.map(r => `
    <div class="reward-tile">
      <div class="reward-tile-icon">${r.icon}</div>
      <div class="reward-tile-name">${r.name}</div>
    </div>
  `).join('');

  // Highlight selected node
  document.querySelectorAll('.node').forEach(n => n.style.outline = '');
  const el = document.getElementById('node-' + id);
  if (el) el.style.outline = '1.5px solid rgba(155,109,255,0.7)';
}

// ─── DRAW PATHS ───
function drawPaths() {
  const canvas = document.getElementById('mapCanvas');
  const svg = document.getElementById('pathSvg');
  const rect = canvas.getBoundingClientRect();

  function center(id) {
    const el = document.getElementById('node-' + id);
    if (!el) return {x:0,y:0};
    const r = el.getBoundingClientRect();
    return {
      x: r.left - rect.left + r.width / 2,
      y: r.top - rect.top + r.height / 2
    };
  }

  function curve(a, b, color, cls) {
    const cp1x = a.x + (b.x - a.x) * 0.5;
    const cp1y = a.y;
    const cp2x = a.x + (b.x - a.x) * 0.5;
    const cp2y = b.y;
    return `<path d="M${a.x},${a.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${b.x},${b.y}"
      fill="none" stroke="${color}" stroke-width="2.5" class="${cls}" stroke-linecap="round"/>`;
  }

  const paths = [
    { from: 'initiate',  to: 'enchanter', color: '#60d090', cls: 'path-solid' },
    { from: 'enchanter', to: 'ember',     color: '#ff8040', cls: 'path-solid' },
    { from: 'enchanter', to: 'vault',     color: '#40b8ff', cls: 'path-solid' },
    { from: 'ember',     to: 'ashen',     color: '#9b6dff', cls: 'path-glow'  },
    { from: 'vault',     to: 'ashen',     color: '#9b6dff', cls: 'path-glow'  },
    { from: 'enchanter', to: 'archmage',  color: '#4a3a60', cls: 'path-dim'   },
    { from: 'ashen',     to: 'void',      color: '#6040a0', cls: 'path-dim'   },
  ];

  svg.innerHTML = paths.map(p => {
    const a = center(p.from), b = center(p.to);
    return curve(a, b, p.color, p.cls);
  }).join('');
}

window.addEventListener('load', () => {
  drawPaths();
  selectNode('ashen');
});
window.addEventListener('resize', drawPaths);
