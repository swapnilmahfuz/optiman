#!/usr/bin/env python3
"""Run against an isolated local app and a dedicated, empty synthetic product.

Set OPTIMAN_TEST_BASE (e.g. http://127.0.0.1:4290/index.php/api/v1),
OPTIMAN_TEST_EMAIL, OPTIMAN_TEST_PASSWORD and OPTIMAN_TEST_PRODUCT_ID.
Requires Python 3 standard library. This mutates that product's gallery and must
never be pointed at production. The test deletes its uploaded images afterward.
"""
import http.cookiejar
import json
import os
import struct
import urllib.error
import urllib.request
import uuid
import zlib

BASE = os.environ['OPTIMAN_TEST_BASE'].rstrip('/')
EMAIL = os.environ['OPTIMAN_TEST_EMAIL']
PASSWORD = os.environ['OPTIMAN_TEST_PASSWORD']
PRODUCT = int(os.environ['OPTIMAN_TEST_PRODUCT_ID'])
PUBLIC = os.environ.get('OPTIMAN_TEST_PUBLIC_BASE', BASE.split('/index.php/')[0].split('/api/v1')[0]).rstrip('/')
assert PRODUCT > 0
PATH = f'/admin/products/{PRODUCT}/images'
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

def request(path, method='GET', body=None, csrf=None, content_type=None):
    headers = {}
    if csrf: headers['X-CSRF-Token'] = csrf
    if content_type: headers['Content-Type'] = content_type
    req = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        with client.open(req) as res: return res.status, json.load(res)
    except urllib.error.HTTPError as err: return err.code, json.load(err)

def json_request(path, method, obj, csrf):
    return request(path, method, json.dumps(obj).encode(), csrf, 'application/json')

def upload(content, name, csrf):
    boundary = 'optiman' + uuid.uuid4().hex
    data = (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\n'
            'Content-Type: application/octet-stream\r\n\r\n').encode() + content + f'\r\n--{boundary}--\r\n'.encode()
    return request(PATH, 'POST', data, csrf, 'multipart/form-data; boundary=' + boundary)

def webp_dimensions(data):
    assert data[:4] == b'RIFF' and data[8:12] == b'WEBP'
    kind=data[12:16]
    if kind==b'VP8 ':
        assert data[23:26]==b'\x9d\x01\x2a'
        w,h=struct.unpack('<HH',data[26:30]); return w&0x3fff,h&0x3fff
    if kind==b'VP8L':
        assert data[20]==0x2f
        bits=int.from_bytes(data[21:25],'little'); return (bits&0x3fff)+1,((bits>>14)&0x3fff)+1
    if kind==b'VP8X': return int.from_bytes(data[24:27],'little')+1,int.from_bytes(data[27:30],'little')+1
    raise AssertionError('Unknown WebP format')

def chunk(tag, data):
    return struct.pack('>I',len(data)) + tag + data + struct.pack('>I',zlib.crc32(tag + data) & 0xffffffff)

def synthetic_png():
    width,height=400,200
    raw=b''.join(b'\x00'+(b'\xff\x00\x00'*width) for _ in range(height))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,2,0,0,0))
            + chunk(b'IDAT',zlib.compress(raw)) + chunk(b'IEND',b''))

code, obj = request('/session'); assert code == 200
csrf=obj['data']['csrf']
code,obj=json_request('/login','POST',{'email':EMAIL,'password':PASSWORD},csrf); assert code == 200,(code,obj)
csrf=obj['data']['csrf']
code,obj=request(PATH); assert code==200 and obj['data']==[], 'Provide a dedicated empty product gallery.'
created=[]
try:
    for data,name in [(b'not an image','invalid.jpg'),(b'x'*1800001,'large.png')]:
        code,obj=upload(data,name,csrf); assert code==422,(code,obj)
    for _ in range(2):
        code,obj=upload(synthetic_png(),'test.png',csrf); assert code==201,(code,obj);created.append(int(obj['data']['id']))
    a,b=created
    code,obj=request(PATH); by_id={int(row['id']):row for row in obj['data']}
    for image_id in created:
        for size in (320,640,1000):
            url=f"{PUBLIC}/uploads/products/{by_id[image_id]['basename']}-{size}.webp"
            with urllib.request.urlopen(url) as response: assert webp_dimensions(response.read())==(size,size)
    code,obj=json_request(PATH+'/order','PUT',{'image_ids':[b,a]},csrf); assert code==200,(code,obj)
    code,obj=json_request(PATH+f'/{b}/primary','PUT',{},csrf); assert code==200,(code,obj)
    code,obj=request(PATH); rows=obj['data']; assert [int(x['id']) for x in rows]==[b,a]
    assert [int(x['is_primary']) for x in rows]==[1,0]
    code,obj=request(PATH+f'/{b}','DELETE',csrf=csrf); assert code==200,(code,obj);created.remove(b)
    code,obj=request(PATH); assert len(obj['data'])==1 and int(obj['data'][0]['is_primary'])==1
    for size in (320,640,1000):
        try: urllib.request.urlopen(f"{PUBLIC}/uploads/products/{by_id[b]['basename']}-{size}.webp")
        except urllib.error.HTTPError as err: assert err.code==404
        else: raise AssertionError('Deleted output remains publicly available')
    for _ in range(4):
        code,obj=upload(synthetic_png(),'test.png',csrf); assert code==201,(code,obj);created.append(int(obj['data']['id']))
    code,obj=upload(synthetic_png(),'test.png',csrf); assert code==422,(code,obj)
    print('Image API: upload, invalid/oversized rejection, ordering, primary, deletion and five-image cap passed.')
finally:
    for image_id in created:
        code,obj=request(PATH+f'/{image_id}','DELETE',csrf=csrf)
        if code != 200: print('Cleanup failed for image',image_id,code,obj)
