from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from tempfile import TemporaryDirectory
import subprocess, shutil
root = Path(__file__).resolve().parents[1]
with TemporaryDirectory(prefix='optiman-storefront-') as temp:
    build = Path(temp)/'site'
    subprocess.run(['python3',str(root/'scripts/package_preview.py'),str(build)],check=True)
    shutil.copy(root/'preview/live-catalog.mjs',build/'live-catalog.mjs')
    shutil.copy(root/'preview/live-storefront.mjs',build/'live-storefront.mjs')
    for name in ('live-shopping.js','live-configurator.js'): shutil.copy(root/'preview'/name,build/name)
    html=(build/'index.html').read_text()
    demo=build/'optiman-preview-demo'
    demo.mkdir()
    # Original demo keeps its existing asset and module paths through a local copy.
    for item in list(build.iterdir()):
        if item.name=='optiman-preview-demo' or item.name.startswith('live-'): continue
        if item.is_dir(): shutil.copytree(item,demo/item.name)
        else: shutil.copy2(item,demo/item.name)
    start=html.index('<script src="configurator.js')
    end=html.index('</head>',start)
    html=html[:start]+'<script src="live-configurator.js" defer></script><script src="demo-engine.js" defer></script><script src="live-shopping.js" defer></script><script type="module" src="live-storefront.mjs"></script>'+html[end:]
    html=html.replace('Frontend preview <span>· AI demo imagery · sample prices · no transactions</span>','Collection browsing <span>· online ordering is being prepared</span>')
    html=html.replace('href="#staff/dashboard"','href="optiman-preview-demo/#staff/dashboard"')
    html=html.replace('Frontend prototype only. AI-generated demonstration photography; not client inventory. Currency BDT is illustrative.','Campaign image is AI-generated. Online ordering is being prepared.')
    (build/'index.html').write_text(html)
    (build/'OPTIMAN-HTACCESS-INSTRUCTIONS.txt').write_text('In cPanel File Manager, edit the existing public_html/.htaccess and add the following line if absent:\n\nOptions -Indexes\n\nKeep all existing directives. The storefront uses hash routes and requires no rewrite rule. Do not change optiman-backend/.htaccess. If Options is disallowed, ask the host to disable directory indexes for public_html.\n')
    (build/'OPTIMAN-DEPLOYMENT-MANIFEST.txt').write_text("""Storefront files: index.html, styles.css, live modules, assets and vto.
The optiman-preview-demo directory contains the existing simulated POS and storefront preview.
Extract into public_html after backing up any existing files with the same names.
This ZIP does not contain optiman-backend, private configuration or database files.
The storefront uses hash routes. Its checkout and lens prices are demonstrations.
""")
    output=root/'packages/optiman-storefront-cpanel.zip'
    with ZipFile(output,'w',ZIP_DEFLATED,compresslevel=9) as archive:
        for file in sorted(build.rglob('*')):
            if file.is_file(): archive.write(file,file.relative_to(build).as_posix())
    with ZipFile(output) as archive:
        assert archive.testzip() is None and 'index.html' in archive.namelist()
        assert not any(name.startswith(('optiman-backend/','optiman-private/')) or name=='.htaccess' for name in archive.namelist())
    print(output)
