// Leonida Nights: GTA 6 trophy tracker and guide.
// Loads app/data/trophies.json, renders the checklist, roadmap and missable
// watch, and keeps earned trophies in localStorage with export and import.
// Deep links: ?view=roadmap|missable, ?open=<id>, ?spoilers=on,
// ?earned=2,3,8 (a shared-progress link that marks those trophies earned).

const STORE_KEY = 'leonida-nights-progress-v1';
const SPOILER_KEY = 'leonida-nights-spoilers-v1';

const listEl = document.getElementById('trophy-list');
const statusEl = document.getElementById('list-status');
const emptyEl = document.getElementById('empty-state');
const searchEl = document.getElementById('search');
const spoilerEl = document.getElementById('spoiler-toggle');
const bannerEl = document.getElementById('link-banner');

const STAGES = [
  { n: 1, title: 'Chapter 1 — first steps', blurb: 'Open with Gone Fishing, finish Chapter 1, and do the one thing that may not wait: the balcony meditation with Lucia.' },
  { n: 2, title: 'Story — Chapters 2 and 3', blurb: 'Vice City opens. Billy\u2019s strand starts in Chapter 2; Chapter 3 hands you the Snap Gun and opens Randy\u2019s and Tyrone\u2019s strands.' },
  { n: 3, title: 'Story — Chapters 4 and 5, finale', blurb: 'The big jobs. Take the optional mission that opens the bank vaults, then play through the final mission for the gold.' },
  { n: 4, title: 'Named story missions and side strands', blurb: 'Six named-mission trophies pop as the story plays. Five side strands (Andy, Kenton, Billy, Randy, Tyrone) close with their final missions.' },
  { n: 5, title: 'Collectibles and exploration', blurb: 'Cards, WAiNK scans, vehicles, the whole map, garages and the Scooter Bros register. Scan everything you pass from the start.' },
  { n: 6, title: 'Skills, stunts, races and open-world activities', blurb: 'Shooting ranges, stunts, races, challenges and the open-world oddities. Most of this feeds the 100% checklist.' },
  { n: 7, title: 'Crime, money and the platinum', blurb: 'Robberies, vaults, laundering and spending, then the 100% checklist for A Long Road, and the platinum follows.' },
];

const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
  platinum: 'Platinum',
};

function loadStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((x) => Number.isInteger(x)) : []);
  } catch {
    return new Set();
  }
}

function saveStored(earned) {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function loadSpoilers() {
  return localStorage.getItem(SPOILER_KEY) === '1';
}

function saveSpoilers(on) {
  localStorage.setItem(SPOILER_KEY, on ? '1' : '0');
}

function readParams() {
  const p = new URLSearchParams(location.search);
  return {
    view: p.get('view'),
    open: p.get('open') ? Number(p.get('open')) : null,
    spoilers: p.get('spoilers') === 'on',
    search: p.get('search') ?? '',
    filter: p.get('filter') ?? '',
    earned: (p.get('earned') ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0),
  };
}

function gradeTag(t) {
  const label = t.grade === 'platinum' ? 'Platinum' : t.grade[0].toUpperCase() + t.grade.slice(1);
  return `<span class="tag grade-${t.grade}">${label}</span>`;
}

function countTag(t) {
  if (t.count == null) return '';
  const shown = t.count >= 1000 ? '$' + t.count.toLocaleString('en-US') : 'x' + t.count;
  return `<span class="tag count-tag">${shown}</span>`;
}

function spoilerHidden(t, earned, spoilersOn) {
  return spoilersOn && t.kind === 'story' && !earned.has(t.id);
}

function trophyMatches(t, filter, query, earned) {
  if (filter === 'story' && t.kind !== 'story') return false;
  if (filter === 'missable' && !t.missable) return false;
  if (filter === 'collectibles' && t.kind !== 'collectibles') return false;
  if (filter === 'activities' && t.kind !== 'activities') return false;
  if (filter === 'online') return false;
  if (filter === 'earned' && !earned.has(t.id)) return false;
  if (filter === 'remaining' && earned.has(t.id)) return false;
  if (query) {
    const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function buildRow(t, earned, spoilersOn, openId) {
  const li = document.createElement('li');
  li.className = 'trophy' + (earned.has(t.id) ? ' earned' : '');
  li.id = 'trophy-' + t.id;
  li.dataset.trophyId = String(t.id);

  const row = document.createElement('div');
  row.className = 'trophy-row';

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.className = 'trophy-check';
  box.checked = earned.has(t.id);
  box.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.id);
    else earned.delete(t.id);
    saveStored(earned);
    renderAll();
  });

  const main = document.createElement('div');
  main.className = 'trophy-main';

  const hidden = spoilerHidden(t, earned, spoilersOn);
  const name = document.createElement('div');
  name.className = 'trophy-name';
  name.textContent = hidden ? 'Hidden story trophy' : t.name;
  const desc = document.createElement('p');
  desc.className = 'trophy-desc' + (hidden ? ' spoiler-hidden' : '');
  desc.textContent = hidden
    ? 'Spoiler hidden until earned. Tick it off once you earn it to reveal the name.'
    : t.description;

  const tags = document.createElement('div');
  tags.className = 'trophy-tags';
  // The kind tag is skipped when the grade tag or the missable tag already
  // says the same thing (platinum trophy, the one missable trophy).
  const kindTag = (t.kind === 'platinum' || t.kind === 'missable')
    ? ''
    : `<span class="tag kind-tag">${KIND_LABELS[t.kind] ?? t.kind}</span>`;
  tags.innerHTML =
    gradeTag(t) +
    kindTag +
    (t.hidden ? '<span class="tag hidden-tag">Hidden</span>' : '') +
    (t.missable ? '<span class="tag missable-tag">Possibly missable</span>' : '') +
    countTag(t);

  main.append(name, desc, tags);
  row.append(box, main);

  if (!hidden) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'guide-btn';
    btn.textContent = 'Guide';
    btn.setAttribute('aria-expanded', String(openId === t.id));
    btn.setAttribute('aria-controls', 'guide-' + t.id);
    row.append(btn);

    const panel = document.createElement('div');
    panel.className = 'guide-panel';
    panel.id = 'guide-' + t.id;
    panel.hidden = openId !== t.id;
    const label = document.createElement('div');
    label.className = 'guide-label';
    label.textContent = 'Guide';
    const text = document.createElement('p');
    text.textContent = t.guide;
    const srcs = document.createElement('ul');
    srcs.className = 'guide-sources';
    for (const s of t.sources) {
      const item = document.createElement('li');
      if (s.url) {
        const a = document.createElement('a');
        a.href = s.url;
        a.textContent = s.name;
        a.rel = 'noopener';
        item.append(a);
      } else {
        item.textContent = s.name;
      }
      srcs.append(item);
    }
    panel.append(label, text, srcs);
    li.append(row, panel);

    btn.addEventListener('click', () => {
      const opening = panel.hidden;
      panel.hidden = !opening;
      btn.setAttribute('aria-expanded', String(opening));
    });
  } else {
    li.append(row);
  }

  return li;
}

function renderRoadmap(trophies, earned) {
  const host = document.getElementById('roadmap-stages');
  host.replaceChildren();
  for (const stage of STAGES) {
    const members = trophies.filter((t) => t.stage === stage.n);
    const done = members.filter((t) => earned.has(t.id)).length;
    const li = document.createElement('li');
    li.className = 'stage';
    const head = document.createElement('div');
    head.className = 'stage-head';
    head.innerHTML =
      `<span class="stage-num">S${stage.n}</span>` +
      `<h3></h3>` +
      `<span class="stage-count">${done} / ${members.length} earned</span>`;
    head.querySelector('h3').textContent = stage.title;
    const blurb = document.createElement('p');
    blurb.textContent = stage.blurb;
    const chips = document.createElement('ul');
    chips.className = 'stage-trophies';
    for (const t of members) {
      const chip = document.createElement('li');
      chip.textContent = t.name + (t.missable ? ' !' : '');
      if (earned.has(t.id)) chip.classList.add('done');
      if (t.missable) chip.classList.add('missable');
      chips.append(chip);
    }
    li.append(head, blurb, chips);
    host.append(li);
  }
}

function renderMissable(trophies, earned, spoilersOn) {
  const host = document.getElementById('missable-list');
  host.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) {
    const card = document.createElement('article');
    card.className = 'missable-card';
    const head = document.createElement('h3');
    head.textContent = 'Possibly missable: ' + t.name;
    const desc = document.createElement('p');
    desc.textContent = t.description + ' — ' + t.guide;
    const srcs = document.createElement('ul');
    srcs.className = 'guide-sources';
    for (const s of t.sources) {
      const item = document.createElement('li');
      if (s.url) {
        const a = document.createElement('a');
        a.href = s.url;
        a.textContent = s.name;
        a.rel = 'noopener';
        item.append(a);
      } else {
        item.textContent = s.name;
      }
      srcs.append(item);
    }
    const state = document.createElement('p');
    state.innerHTML = earned.has(t.id)
      ? '<strong>Earned.</strong> The risk is gone.'
      : '<strong>Not earned yet.</strong> Do the Chapter 1 balcony meditation the first morning it is offered.';
    card.append(head, desc, state, srcs);
    host.append(card);
  }
  const note = document.createElement('p');
  note.className = 'roadmap-foot';
  note.textContent = 'Push Square lists no known missables at all; only PowerPyx flags this one, and only as a maybe. Nobody has confirmed it either way yet, so the safe move costs one minute in Chapter 1.';
  host.append(note);
}

let data = null;
let earned = loadStored();
let filter = 'all';
let openId = null;

function renderAll() {
  const query = searchEl.value.trim().toLowerCase();
  const spoilersOn = spoilerEl.checked;
  const visible = data.trophies.filter((t) => trophyMatches(t, filter, query, earned));
  listEl.replaceChildren();
  for (const t of visible) listEl.append(buildRow(t, earned, spoilersOn, openId));
  emptyEl.hidden = visible.length > 0;
  statusEl.textContent = `Showing ${visible.length} of ${data.trophies.length} trophies` +
    (filter === 'all' ? '' : ` — filter: ${filter}`) +
    (query ? ` — search: “${searchEl.value.trim()}”` : '');

  const pct = Math.round((earned.size / data.trophies.length) * 100);
  document.getElementById('earned-count').textContent = `${earned.size} / ${data.trophies.length} earned`;
  document.getElementById('earned-pct').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-bar').setAttribute('aria-valuenow', String(earned.size));
  document.getElementById('count-earned').textContent = String(earned.size);
  document.getElementById('count-remaining').textContent = String(data.trophies.length - earned.size);
  renderRoadmap(data.trophies, earned);
  renderMissable(data.trophies, earned, spoilersOn);
}

function setView(name) {
  for (const tab of document.querySelectorAll('.tab')) {
    const active = tab.dataset.view === name;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  }
  for (const view of document.querySelectorAll('.view')) {
    view.hidden = view.id !== 'view-' + name;
  }
  // Search and kind filters only apply to the checklist; hide them on the
  // roadmap and missable views so those views show more of their own content.
  document.querySelector('.search').hidden = name !== 'checklist';
  document.getElementById('filters').hidden = name !== 'checklist';
}

function setFilter(name) {
  filter = name;
  for (const chip of document.querySelectorAll('.chip')) {
    chip.classList.toggle('active', chip.dataset.filter === name);
  }
  renderAll();
}

async function init() {
  data = await (await fetch('data/trophies.json')).json();
  const params = readParams();

  if (params.earned.length > 0) {
    const known = new Set(data.trophies.map((t) => t.id));
    const fresh = params.earned.filter((id) => known.has(id));
    if (fresh.length > 0) {
      earned = new Set(fresh);
      saveStored(earned);
      bannerEl.hidden = false;
      bannerEl.textContent = `Shared progress link: ${fresh.length} trophies marked earned. Use Export to keep a copy, or Reset to clear it.`;
    }
  }

  spoilerEl.checked = params.spoilers || loadSpoilers();
  if (params.search) searchEl.value = params.search;
  if (params.filter && ['story', 'missable', 'collectibles', 'activities', 'online', 'earned', 'remaining'].includes(params.filter)) {
    setFilter(params.filter);
  }
  spoilerEl.addEventListener('change', () => {
    saveSpoilers(spoilerEl.checked);
    renderAll();
  });

  openId = params.open;
  if (openId != null) {
    // A deep-linked guide must be visible even if a filter was active.
    filter = 'all';
    for (const chip of document.querySelectorAll('.chip')) {
      chip.classList.toggle('active', chip.dataset.filter === 'all');
    }
  }
  if (params.view && ['checklist', 'roadmap', 'missable'].includes(params.view)) setView(params.view);

  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => setView(tab.dataset.view));
  }
  for (const chip of document.querySelectorAll('.chip')) {
    chip.addEventListener('click', () => setFilter(chip.dataset.filter));
  }
  searchEl.addEventListener('input', renderAll);

  document.getElementById('export-btn').addEventListener('click', () => {
    const payload = {
      game: 'Grand Theft Auto VI',
      guide: 'Leonida Nights',
      exported: new Date().toISOString(),
      earned: [...earned].sort((a, b) => a - b),
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    a.download = 'gta6-trophy-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const ids = Array.isArray(parsed) ? parsed : parsed.earned;
      const known = new Set(data.trophies.map((t) => t.id));
      earned = new Set(ids.filter((id) => known.has(id)));
      saveStored(earned);
      bannerEl.hidden = false;
      bannerEl.textContent = `Imported ${earned.size} earned trophies from ${file.name}.`;
      renderAll();
    } catch {
      bannerEl.hidden = false;
      bannerEl.textContent = 'That file could not be imported. It must be a progress file exported by this guide.';
    }
    event.target.value = '';
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (window.confirm('Clear all earned trophies?')) {
      earned = new Set();
      saveStored(earned);
      renderAll();
    }
  });

  renderAll();
  if (openId != null) {
    const target = document.getElementById('trophy-' + openId);
    if (target) target.scrollIntoView({ block: 'start' });
  }
}

init();
