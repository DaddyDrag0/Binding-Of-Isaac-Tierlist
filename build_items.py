from bs4 import BeautifulSoup
from urllib.request import Request, urlopen
import json, re, time

BASE='https://isaacguru.com/wiki/isaac_repentance/c{}'
HEADERS={'User-Agent':'Mozilla/5.0'}

# Canonical disambiguation for duplicate collectible names
NAME_OVERRIDES={
    120:'Odd Mushroom (Thin)',
    121:'Odd Mushroom (Large)',
    550:'Broken Shovel (Handle)',
    551:'Broken Shovel (Blade)',
}


def get_html(url, retries=5):
    for attempt in range(retries):
        try:
            return urlopen(Request(url,headers=HEADERS),timeout=40).read().decode('utf-8','ignore')
        except Exception:
            if attempt==retries-1:
                raise
            time.sleep(1.5*(attempt+1))

def fetch(i):
    soup=BeautifulSoup(get_html(BASE.format(i)),'lxml')
    h1=soup.select_one('h1')
    name=(h1.get_text(' ',strip=True) if h1 else f'Item {i}').replace('item','').strip()
    meta=soup.select_one('meta[property="og:description"]')
    desc=(meta.get('content','').strip() if meta else '')
    desc=re.sub(r'\s+',' ',desc)
    low=desc.lower()
    item_type='Active' if 'active item' in low else ('Familiar' if 'familiar' in low else 'Passive')
    qtxt=soup.get_text(' ',strip=True)
    mq=re.search(r'Quality\s*[:\-]?\s*([0-4])',qtxt,re.I)
    quality=int(mq.group(1)) if mq else -1
    tags=[]
    combined=(desc+' '+qtxt[:3000]).lower()
    for kw in ['damage','tears','health','speed','range','luck','shop','angel','devil','bomb','key','coin','familiar','flight','defense','utility']:
        if kw in combined: tags.append(kw)
    name=NAME_OVERRIDES.get(i,name)
    return {'itemName':name,'itemId':i,'gameQuality':quality,'type':item_type,'shortEffect':desc,'tier':'Unranked','whyThisTier':'','downsides':'','majorSynergies':[],'tags':tags,'confidence':'medium' if desc else 'low'}

items=[]
for i in range(1,720):
    items.append(fetch(i))
    if i%20==0:
        print('Fetched',i)
        time.sleep(0.5)

with open('items.json','w',encoding='utf-8') as f:
    json.dump(items,f,indent=2,ensure_ascii=False)
print('Wrote',len(items))
