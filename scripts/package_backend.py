#!/usr/bin/env python3
"""Create a reviewable cPanel backend ZIP from a strict source allowlist."""
from argparse import ArgumentParser
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
backend = root / 'backend'
parser = ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path, help='New ZIP path outside backend/')
args = parser.parse_args()
output = args.output.resolve()
if backend.resolve() in output.parents:
    parser.error('Output must be outside backend/')
if output.exists():
    parser.error('Refusing to overwrite an existing file')
files = [backend / 'README.md', backend / 'config.example.php']
for directory in ('src', 'public', 'migrations', 'tools'):
    folder = backend / directory
    if not folder.is_dir():
        parser.error(f'Missing required directory: {directory}')
    for path in folder.rglob('*'):
        if path.is_symlink():
            parser.error(f'Symlinks are not permitted: {path}')
        if path.is_file():
            relative = path.relative_to(backend)
            parts = relative.parts
            # Uploads are runtime data, never part of a distribution artifact.
            if parts[:2] == ('public', 'uploads'):
                if parts == ('public', 'uploads', 'products', '.htaccess'):
                    files.append(path)
                continue
            allowed = (directory == 'src' and path.suffix == '.php' or
                       directory == 'migrations' and path.suffix == '.sql' or
                       directory == 'tools' and path.name == 'bootstrap-owner.php' or
                       directory == 'public' and (parts in [('public', 'index.php'), ('public', '.htaccess')] or
                           len(parts) == 3 and parts[:2] == ('public', 'admin') and path.suffix in {'.html', '.css', '.js'}))
            if allowed and path.name != 'config.php':
                files.append(path)
if not all(p.is_file() and not p.is_symlink() for p in files):
    parser.error('Required guide or example config missing or symlinked')
output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(output, 'x', ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(files):
        archive.write(path, 'optiman-backend/' + path.relative_to(backend).as_posix())
print(f'Created {output} with {len(files)} allowlisted files; secrets, uploads, backups and demo excluded.')
