"""Destructive integration suite for a dedicated local Phase 1 fixture only.
Import 001 into a new optiman_v2_test_* database, run product-v2-fixture.php,
and serve the cPanel overlay using that database. Set OPTIMAN_TEST_PUBLIC_BASE,
OPTIMAN_TEST_EMAIL, OPTIMAN_TEST_PASSWORD and OPTIMAN_V2_DISPOSABLE.
"""
import concurrent.futures
import http.cookiejar
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlparse, urlencode
from urllib.request import Request, build_opener, HTTPCookieProcessor
from uuid import uuid4

BASE = os.environ['OPTIMAN_TEST_PUBLIC_BASE'].rstrip('/')
assert urlparse(BASE).hostname in {'127.0.0.1', 'localhost'}
assert os.environ.get('OPTIMAN_V2_DISPOSABLE') == 'RESET TEST DATABASE'
PREFIX = BASE + '/index.php?'
PASSWORD = os.environ['OPTIMAN_TEST_PASSWORD']
EMAIL = os.environ['OPTIMAN_TEST_EMAIL']


class Client:
    def __init__(self):
        self.http = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.csrf = self.call('session')['csrf']

    def call(self, path, method='GET', body=None, expect=200, file=None, csrf=True):
        route, _, query = path.partition('?')
        url = PREFIX + urlencode({'path': '/api/v1/' + route}) + '&' + query
        headers = {'X-CSRF-Token': self.csrf} if csrf and hasattr(self, 'csrf') else {}
        data = None
        if file:
            boundary = 'optiman' + uuid4().hex
            headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary
            data = (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="sample.webp"\r\n'
                    'Content-Type: application/octet-stream\r\n\r\n').encode() + file + f'\r\n--{boundary}--\r\n'.encode()
        elif body is not None:
            headers['Content-Type'] = 'application/json'
            data = json.dumps(body).encode()
        try:
            res = self.http.open(Request(url, data=data, headers=headers, method=method))
        except HTTPError as err:
            res = err
        with res:
            obj = json.load(res)
            if expect is not None:
                assert res.status == expect, (method, path, res.status, obj)
            return (res.status, obj) if expect is None else obj.get('data')

    def login(self, email=EMAIL):
        self.csrf = self.call('login', 'POST', {'email': email, 'password': PASSWORD})['csrf']
        return self


guest = Client()
guest.call('admin/catalog-update', 'POST', {}, 401)
owner = Client().login()
maintenance = 'admin/catalog-update'
assert not owner.call(maintenance)['ready']
owner.call(maintenance,'POST',{},403,csrf=False)
assert owner.call(maintenance,'POST',{})['ready']
assert owner.call(maintenance,'POST',{})['ready']
legacy = owner.call('products?search=LEGACY')['items'][0]
assert legacy['sku'] == 'LEGACY' and len(legacy['variants']) == 1
assert legacy['available'] == 6 and len(legacy['images']) == 1
assert legacy['variants'][0]['price'] == '1100.00'
legacy_balance=owner.call(f"admin/inventory?variant_id={legacy['default_variant_id']}")['items'][0]
owner.call(f"admin/variants/{legacy['default_variant_id']}/adjustments",'POST',
           {'request_id':str(uuid4()),'quantity':-7,'location_id':legacy_balance['location_id'],'reason':'Reserved stock guard'},409)
assert owner.call(f"admin/variants/{legacy['default_variant_id']}/movements")['items'][0]['quantity'] == 8
assert owner.call('session')['user']['email'] == EMAIL
print('Phase 1 preservation, repeat migration, CSRF and Owner session passed.', flush=True)

cats = owner.call('admin/categories')
assert {'eyeglasses','sunglasses','blue-light-glasses'} <= {row['slug'] for row in cats}
category = {'name':'Travel','slug':'travel','is_active':True}
cat = owner.call('admin/categories','POST',category,201)['id']
category.update(name='Travel frames',is_active=False)
owner.call(f'admin/categories/{cat}','PUT',category)
assert cat not in [c['id'] for c in guest.call('categories')]
category['is_active'] = True
owner.call(f'admin/categories/{cat}','PUT',category)
first = {'sku':'ATLAS-BROWN','color_name':'Brown','color_hex':'#543621','price':'1325.50','tryon_asset':'frames/brown.png','status':'active'}
parent = {'sku':'ATLAS','name':'Test Atlas','status':'draft','default_variant':first,'category_ids':[cat]}
p = owner.call('admin/products','POST',parent,201)
product, brown = p['id'],p['default_variant_id']
admin = f'admin/products/{product}'
public = f'products/{product}'
guest.call(public,expect=404)
del parent['default_variant']
parent.update(status='active',name='Edited Atlas')
owner.call(admin,'PUT',parent)
second = dict(first,sku='ATLAS-BLACK',color_name='Black',price='1975.25',color_hex='#121212',tryon_asset='frames/black.png')
black = owner.call(admin+'/variants','POST',second,201)['id']
owner.call(admin+'/variants','POST',second,409)
owner.call(admin+'/variants','POST',dict(second,sku='BAD',color_hex='bad'),422)
owner.call(admin+f'/variants/{brown}','PUT',dict(first,status='inactive'),422)
owner.call(admin+f'/variants/{brown}','PUT',dict(first,is_default=False),422)
owner.call(admin+f'/variants/{black}','PUT',dict(second,is_default=True))
p = guest.call(public)
assert guest.call('products?search=ATLAS-BLACK')['total']==1
assert p['name']=='Edited Atlas' and p['price']=='1975.25' and p['default_variant_id']==black
assert {v['price'] for v in p['variants']}=={'1325.50','1975.25'} and p['tryon_asset']=='frames/black.png'
owner.call(admin+f'/variants/{brown}','PUT',dict(first,status='inactive'))
assert len(guest.call(public)['variants'])==1 and len(owner.call(admin)['variants'])==2
owner.call(admin+f'/variants/{brown}','PUT',first)
print('Products, categories, unique SKUs, status, default and price projection passed.', flush=True)

branch=owner.call('admin/locations','POST',{'name':'North','code':'NORTH','type':'branch'},201)['id']
other=owner.call('admin/locations','POST',{'name':'South','code':'SOUTH','type':'branch'},201)['id']
branch_id=next(l['branch_id'] for l in owner.call('admin/locations') if l['id']==branch)
manager_email='north-v2@example.test'
owner.call('admin/users','POST',{'name':'Manager','email':manager_email,'password':PASSWORD,'role':'branch_manager','branch_id':branch_id,'is_active':True},201)
manager=Client().login(manager_email)
adjust=f'admin/variants/{black}/adjustments'
req={'request_id':str(uuid4()),'quantity':5,'location_id':branch,'reason':'Counted on receipt'}
receipt=owner.call(adjust,'POST',req)
assert owner.call(adjust,'POST',req)==receipt
owner.call(adjust,'POST',dict(req,quantity=6),409)
owner.call(adjust,'POST',dict(req,quantity=-6,request_id=str(uuid4())),409)
owner.call(adjust,'POST',dict(req,location_id=other,quantity=2,request_id=str(uuid4())))
owner.call(f'admin/variants/{brown}/adjustments','POST',dict(req,quantity=3,request_id=str(uuid4())))
clients=[Client().login(),Client().login()]
def last_stock(client):
    return client.call(adjust,'POST',dict(req,request_id=str(uuid4()),quantity=-5),expect=None)[0]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    assert sorted(pool.map(last_stock,clients))==[200,409]
assert guest.call(public)['available']==5
assert {r['location_id'] for r in manager.call(f'admin/variants/{black}/movements')['items']}=={branch}
assert {r['location_id'] for r in manager.call('admin/inventory')['items']}=={branch}
manager.call(f'admin/inventory?location_id={other}',expect=403)
manager.call(adjust,'POST',req,403)
manager.call(maintenance,'POST',{},403)
manager.call(admin,'PUT',parent,403)
print('Variant balances, concurrent withdrawal, retry, movement audit and branch scope passed.', flush=True)

gallery=admin+f'/variants/{brown}/images'
other_gallery=admin+f'/variants/{black}/images'
photo=next((Path(__file__).resolve().parents[2]/'preview/assets').glob('*320.webp')).read_bytes()
manager.call(gallery,'POST',expect=403,file=photo)
owner.call(gallery,'POST',expect=422,file=b'invalid image bytes')
a,b=[owner.call(gallery,'POST',expect=201,file=photo)['id'] for _ in range(2)]
owner.call(other_gallery+f'/{a}','DELETE',expect=422)
owner.call(gallery+'/order','PUT',{'image_ids':[b,a]})
owner.call(gallery+f'/{b}/primary','PUT',{})
p=guest.call(public)
images=next(v['images'] for v in p['variants'] if v['id']==brown)
assert p['images']==[] and [i['id'] for i in images]==[b,a] and images[0]['is_primary']
from urllib.parse import urljoin
url=urljoin(BASE+'/',images[0]['urls']['thumb'])
assert guest.http.open(url).read(4)==b'RIFF'
replacement=gallery+f'/{b}/replace'
owner.call(replacement,'POST',expect=422,file=b'not a photograph')
assert guest.http.open(url).read(4)==b'RIFF'
new=owner.call(replacement,'POST',file=photo)
assert new['id']==b and new['basename']!=images[0]['basename']
replaced=owner.call(gallery)[0]
assert replaced['id']==b and replaced['is_primary'] and replaced['sort_order']==0
try:
    guest.http.open(url)
    raise AssertionError('Superseded image still accessible')
except HTTPError as err:
    assert err.code==404
url=urljoin(BASE+'/',replaced['urls']['thumb'])
owner.call(gallery+f'/{b}','DELETE')
assert owner.call(gallery)[0]['is_primary']
try:
    guest.http.open(url)
    raise AssertionError('Deleted image still accessible')
except HTTPError as err:
    assert err.code==404

reset='admin/demo-reset'
manager.call(reset,'POST',{'confirmation':'RESET DEMO CATALOG'},403)
owner.call(reset,'POST',{'confirmation':'yes'},422)
owner.call(reset,'POST',{'confirmation':'RESET DEMO CATALOG'},403,csrf=False)
assert owner.call(admin)['id']==product
assert owner.call(reset,'POST',{'confirmation':'RESET DEMO CATALOG'})['files_requiring_cleanup']==0
assert guest.call('products')['total']==0 and owner.call('admin/inventory')['total']==0
assert not owner.call(f'admin/variants/{black}/movements')['items']
assert owner.call('session')['user']['email']==EMAIL and owner.call('admin/categories')
assert owner.call(maintenance,'POST',{})['ready']
owner.call('logout','POST',{})
owner.call('admin/users',expect=401)
print('Variant upload, gallery isolation, primary/order/delete, authorized reset and logout passed.')
