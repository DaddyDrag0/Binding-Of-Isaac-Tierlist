const STORAGE_KEY = 'isaac_tierlist_items_v2';
const EXPECTED_COUNT = 719;
let items = [];

async function init() {
  const baseItems = await fetch('items.json').then(r => r.json());
  items = normalizeItems(mergeLocalEdits(baseItems));
  updateCount();
  initFilters();
  bindToolbarEvents();
  renderTable();
}

function normalizeItems(list) {
  return list.map(item => ({
    ...item,
    tier: item.tier && item.tier.trim() ? item.tier : 'Unranked',
    whyThisTier: item.whyThisTier || '',
    downsides: item.downsides || '',
    majorSynergies: Array.isArray(item.majorSynergies) ? item.majorSynergies : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    confidence: item.confidence || 'low',
  }));
}

function mergeLocalEdits(baseItems) {
  try {
    const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!Array.isArray(local)) return baseItems;
    const byId = new Map(local.map(i => [Number(i.itemId), i]));
    return baseItems.map(i => byId.get(Number(i.itemId)) || i);
  } catch {
    return baseItems;
  }
}

function updateCount() {
  itemCount.textContent = String(items.length);
  countWarning.textContent = items.length === EXPECTED_COUNT ? '' : `Warning: expected ${EXPECTED_COUNT}, found ${items.length}.`;
}

function initFilters() {
  setOptions(tierFilter, ['All', ...unique(items.map(i => i.tier || 'Unranked'))]);
  setOptions(qualityFilter, ['All', ...unique(items.map(i => String(i.gameQuality)))]);
  setOptions(typeFilter, ['All', ...unique(items.map(i => i.type || 'Unknown'))]);
}

function setOptions(el, values) {
  el.innerHTML = values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
}

function unique(arr) { return [...new Set(arr)].sort(); }

function bindToolbarEvents() {
  [search, tierFilter, qualityFilter, typeFilter].forEach(el => el.addEventListener('input', renderTable));
  saveBtn.addEventListener('click', () => localStorage.setItem(STORAGE_KEY, JSON.stringify(items)));
  resetBtn.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); location.reload(); });
  exportJsonBtn.addEventListener('click', () => downloadFile('items-edited.json', JSON.stringify(items, null, 2), 'application/json'));
  exportCsvBtn.addEventListener('click', exportCsv);
  importJsonInput.addEventListener('change', importJson);
}

function renderTable() {
  const q = search.value.trim().toLowerCase();
  const tf = tierFilter.value, qf = qualityFilter.value, yf = typeFilter.value;
  const filtered = items.filter(item => {
    if (tf !== 'All' && (item.tier || 'Unranked') !== tf) return false;
    if (qf !== 'All' && String(item.gameQuality) !== qf) return false;
    if (yf !== 'All' && (item.type || 'Unknown') !== yf) return false;

    const haystack = [
      item.itemName,
      String(item.itemId),
      item.shortEffect,
      (item.tags || []).join(' '),
      item.whyThisTier,
      item.downsides,
      (item.majorSynergies || []).join(' '),
      item.confidence,
      item.tier,
    ].join(' ').toLowerCase();

    return haystack.includes(q);
  });

  itemsTable.querySelector('tbody').innerHTML = filtered.map(rowHtml).join('');
  bindRowEditors();
}

function rowHtml(i) {
  return `<tr data-id="${i.itemId}">
    <td>${i.itemId}</td>
    <td>${escapeHtml(i.itemName)}</td>
    <td>${escapeHtml(String(i.gameQuality))}</td>
    <td>${escapeHtml(i.type || 'Unknown')}</td>
    <td>${escapeHtml(i.shortEffect || '')}</td>
    <td><input class="inline" data-field="tier" value="${escapeHtml(i.tier || 'Unranked')}" /></td>
    <td><textarea data-field="whyThisTier">${escapeHtml(i.whyThisTier || '')}</textarea></td>
    <td><textarea data-field="downsides">${escapeHtml(i.downsides || '')}</textarea></td>
    <td><textarea data-field="majorSynergies">${escapeHtml((i.majorSynergies || []).join(', '))}</textarea></td>
    <td><textarea data-field="tags">${escapeHtml((i.tags || []).join(', '))}</textarea></td>
    <td><input class="inline" data-field="confidence" value="${escapeHtml(i.confidence || 'low')}" /></td>
  </tr>`;
}

function bindRowEditors() {
  document.querySelectorAll('#itemsTable [data-field]').forEach(el => {
    el.addEventListener('change', e => {
      const tr = e.target.closest('tr');
      const id = Number(tr.dataset.id);
      const item = items.find(x => Number(x.itemId) === id);
      if (!item) return;
      const field = e.target.dataset.field;
      let value = e.target.value;
      if (field === 'tier' && !value.trim()) value = 'Unranked';
      if (field === 'tags' || field === 'majorSynergies') value = value.split(',').map(s => s.trim()).filter(Boolean);
      item[field] = value;
    });
  });
}

function exportCsv() {
  const cols = ['itemName','itemId','gameQuality','type','shortEffect','tier','whyThisTier','downsides','majorSynergies','tags','confidence'];
  const lines = [cols.join(',')];
  for (const i of items) {
    lines.push(cols.map(c => csvCell(Array.isArray(i[c]) ? i[c].join('|') : i[c])).join(','));
  }
  downloadFile('items-edited.csv', lines.join('\n'), 'text/csv');
}

async function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const imported = JSON.parse(await file.text());
  if (!Array.isArray(imported)) return alert('Invalid JSON: expected an array of items.');
  const byId = new Map(imported.map(i => [Number(i.itemId), i]));
  items = normalizeItems(items.map(i => byId.get(Number(i.itemId)) || i));
  updateCount();
  initFilters();
  renderTable();
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function downloadFile(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

init();
