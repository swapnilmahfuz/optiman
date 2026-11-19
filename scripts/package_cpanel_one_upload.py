#!/usr/bin/env python3
"""Build one ZIP extracting at /home/optiman1 into separate private/public trees."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import argparse

root = Path(__file__).resolve().parents[1]
backend = root / 'backend'
parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path)
args = parser.parse_args()
output = args.output.resolve()
if output.exists() or backend.resolve() in output.parents:
    parser.error('Output must be a new file outside backend')
private = ['README.md', 'ONE_UPLOAD_CPANEL.md', 'config.example.php', 'migrations/001_foundation.sql', 'migrations/002_variant_foundation.sql', 'migrations/003_variant_catalog.php', 'tools/bootstrap-owner.php']
private += [str(p.relative_to(backend)) for p in sorted((backend/'src').glob('*.php'))]
public = ['public/install.php', 'public/index.php', 'public/.htaccess', 'public/uploads/products/.htaccess']
public += [str(p.relative_to(backend)) for p in sorted((backend/'public/admin').iterdir()) if p.is_file() and p.suffix in {'.html','.css','.js'}]
with ZipFile(output, 'x', ZIP_DEFLATED, compresslevel=9) as archive:
    for name in private + public:
        path = backend/name
        if not path.is_file() or path.is_symlink(): parser.error('Invalid source: '+name)
        if name in private:
            target = 'optiman-private/' + name
        else:
            target = 'public_html/optiman-backend/' + name.removeprefix('public/')
        entry = ZipInfo(target)
        entry.compress_type = ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        archive.writestr(entry, path.read_bytes())
print(f'{output}: {len(private)} private + {len(public)} public files')
