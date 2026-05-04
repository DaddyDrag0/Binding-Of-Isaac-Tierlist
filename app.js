const STORAGE_KEY='isaac_tierlist_items_v1';
let items=[],view=[];
const tierOrder=['S','A','B','C','D','F','Unranked'];
fetch('items.json').then(r=>r.json()).then(base=>{items=loadMerged(base);initFilters();render();});
function loadMerged(base){const local=localStorage.getItem(STORAGE_KEY);if(!local)return base;try{const map=new Map(JSON.parse(local).map(i=>[i.itemId,i]));return base.map(i=>map.get(i.itemId)||i);}catch{return base;}}
function initFilters(){fill('tierFilter',['All',...new Set(items.map(i=>i.tier||'Unranked'))]);fill('qualityFilter',['All',...new Set(items.map(i=>String(i.gameQuality)))]);fill('typeFilter',['All',...new Set(items.map(i=>i.type||'Unknown'))]);['search','tierFilter','qualityFilter','typeFilter','sortBy'].forEach(id=>document.getElementById(id).addEventListener('input',render));}
function fill(id,vals){const el=document.getElementById(id);el.innerHTML=vals.map(v=>`<option>${v}</option>`).join('');}
function render(){const q=document.getElementById('search').value.toLowerCase();const tf=tierFilter.value,qf=qualityFilter.value,tyf=typeFilter.value,sort=sortBy.value;
view=items.filter(i=>(tf==='All'||(i.tier||'Unranked')===tf)&&(qf==='All'||String(i.gameQuality)===qf)&&(tyf==='All'||i.type===tyf)&&(`${i.itemName} ${i.shortEffect} ${(i.tags||[]).join(' ')}`.toLowerCase().includes(q)));
view.sort((a,b)=> sort==='id'?a.itemId-b.itemId : sort==='quality'?a.gameQuality-b.gameQuality : sort==='tier'?tierOrder.indexOf(a.tier)-tierOrder.indexOf(b.tier) : a.itemName.localeCompare(b.itemName));
itemsTable.querySelector('tbody').innerHTML=view.map(i=>row(i)).join(''); bindEdits();}
function row(i){return `<tr data-id='${i.itemId}'><td>${i.itemId}</td><td>${i.itemName}</td><td>${i.gameQuality}</td><td>${i.type}</td><td>${esc(i.shortEffect)}</td><td><input data-k='tier' value='${esc(i.tier||'Unranked')}'/></td><td><textarea data-k='whyThisTier'>${esc(i.whyThisTier||'')}</textarea></td><td><textarea data-k='downsides'>${esc(i.downsides||'')}</textarea></td><td><textarea data-k='majorSynergies'>${esc((i.majorSynergies||[]).join(', '))}</textarea></td><td><textarea data-k='tags'>${esc((i.tags||[]).join(', '))}</textarea></td><td><input data-k='confidence' value='${esc(i.confidence||'low')}'/></td></tr>`;}
function esc(s){return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
function bindEdits(){document.querySelectorAll('tbody [data-k]').forEach(el=>el.addEventListener('change',e=>{const tr=e.target.closest('tr');const id=+tr.dataset.id;const item=items.find(x=>x.itemId===id);const k=e.target.dataset.k;let v=e.target.value; if(k==='tags'||k==='majorSynergies') v=v.split(',').map(x=>x.trim()).filter(Boolean); item[k]=v;}));}
saveBtn.onclick=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(items)); resetBtn.onclick=()=>{localStorage.removeItem(STORAGE_KEY);location.reload();};
exportJson.onclick=()=>download('items-edited.json',JSON.stringify(items,null,2),'application/json');
exportCsv.onclick=()=>{const cols=['itemId','itemName','gameQuality','type','shortEffect','tier','whyThisTier','downsides','majorSynergies','tags','confidence'];const lines=[cols.join(',')].concat(items.map(i=>cols.map(c=>csv(i[c])).join(',')));download('items-edited.csv',lines.join('\n'),'text/csv');};
function csv(v){if(Array.isArray(v))v=v.join('|');v=String(v??'');return /[",\n]/.test(v)?`"${v.replaceAll('"','""')}"`:v}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();}
importJson.onchange=async(e)=>{const f=e.target.files[0];if(!f)return;const data=JSON.parse(await f.text());const map=new Map(data.map(i=>[i.itemId,i]));items=items.map(i=>map.get(i.itemId)||i);render();};
