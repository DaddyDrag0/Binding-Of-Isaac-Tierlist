from bs4 import BeautifulSoup
import urllib.request, json, re

URL='https://platinumgod.co.uk/all-items'
html=urllib.request.urlopen(URL).read().decode('utf-8','ignore')
soup=BeautifulSoup(html,'lxml')
items=[]
for li in soup.select('li.textbox[data-cid]'):
    raw_cid=li.get('data-cid','')
    if '.' in raw_cid or not raw_cid.isdigit():
        continue
    item_id=int(raw_cid)
    if not 1 <= item_id <= 730:
        continue

    name=li.select_one('p.item-title')
    if not name:
        continue

    quality=-1
    q=li.select_one('p.quality')
    if q:
        qm=re.search(r'([0-4])',q.get_text())
        if qm:
            quality=int(qm.group(1))

    pickup=li.select_one('p.pickup')
    short=pickup.get_text(' ',strip=True).strip('"') if pickup else ''
    paragraphs=[p.get_text(' ',strip=True) for p in li.select('p')]
    desc=' '.join(paragraphs).lower()
    tags=[kw for kw in ['damage','tears','health','speed','range','luck','shop','angel','devil','bomb','key','coin','familiar','flight','utility','defense'] if kw in desc]

    item_type='Passive'
    if 'active item' in desc:
        item_type='Active'
    elif 'familiar' in desc:
        item_type='Familiar'

    items.append({
        'itemName':name.get_text(' ',strip=True),
        'itemId':item_id,
        'gameQuality':quality,
        'type':item_type,
        'shortEffect':short,
        'tier':'Unranked',
        'whyThisTier':'',
        'downsides':'',
        'majorSynergies':[],
        'tags':tags,
        'confidence':'medium' if quality!=-1 and short else 'low'
    })

out=sorted({x['itemId']:x for x in items}.values(), key=lambda x:x['itemId'])
with open('items.json','w',encoding='utf-8') as f:
    json.dump(out,f,indent=2,ensure_ascii=False)
print(f'Wrote {len(out)} items to items.json')
