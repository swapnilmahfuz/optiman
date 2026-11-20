#!/usr/bin/env python3
"""Deploy only Optiman storefront files from a reviewed commit on shared hosting."""
import argparse
import fcntl
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from urllib.request import urlopen
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
BRANCH = 'feat/phase-03-ui-prototype'
ROOT_FILES = {'index.html', 'styles.css', 'live-catalog.mjs', 'live-storefront.mjs',
              'live-shopping.js', 'live-configurator.js', 'demo-engine.js'}
VTO_FILES = {'camera.mjs', 'tracker.mjs', 'geometry.mjs', 'frames.mjs', 'controller.mjs', 'vto.css',
             'assets/atlas-front.webp', 'assets/noir-front.webp', 'assets/muse-front.webp',
             'assets/forma-front.webp', 'assets/sample-portrait.webp',
             'vendor/vision_bundle.mjs', 'vendor/face_landmarker.task', 'vendor/LICENSE',
             'vendor/wasm/vision_wasm_internal.js', 'vendor/wasm/vision_wasm_internal.wasm',
             'vendor/wasm/vision_wasm_nosimd_internal.js', 'vendor/wasm/vision_wasm_nosimd_internal.wasm'}


def run(*args):
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


def approved(name):
    parts = PurePosixPath(name).parts
    if not parts or any(part in ('', '.', '..') for part in parts) or name.startswith('/') or '\\' in name:
        return False
    return (name in ROOT_FILES or
            (len(parts) == 2 and parts[0] == 'assets' and parts[1].endswith('.webp')) or
            (parts[0] == 'vto' and '/'.join(parts[1:]) in VTO_FILES))


def validate_archive(archive):
    members = {}
    for info in archive.infolist():
        name = info.filename
        if not approved(name) and not name.startswith('optiman-preview-demo/') and name not in {
            'OPTIMAN-HTACCESS-INSTRUCTIONS.txt', 'OPTIMAN-DEPLOYMENT-MANIFEST.txt'}:
            raise ValueError('Unexpected archive path: ' + name)
        if name in members:
            raise ValueError('Duplicate archive path: ' + name)
        mode = info.external_attr >> 16
        if stat.S_ISLNK(mode):
            raise ValueError('Archive symlink rejected: ' + name)
        if approved(name):
            if info.is_dir():
                raise ValueError('Expected a regular file: ' + name)
            members[name] = info
    if not ROOT_FILES.issubset(members) or not all('vto/' + name in members for name in VTO_FILES):
        raise ValueError('Required storefront file missing')
    if archive.testzip() is not None:
        raise ValueError('Archive checksum failure')
    return members


def safe_target(public, name):
    target = public.joinpath(*PurePosixPath(name).parts)
    cursor = public
    if cursor.is_symlink() or not cursor.is_dir():
        raise ValueError('Invalid public directory')
    for part in PurePosixPath(name).parts[:-1]:
        cursor = cursor / part
        if cursor.is_symlink() or (cursor.exists() and not cursor.is_dir()):
            raise ValueError('Unsafe destination directory: ' + str(cursor))
    if target.is_symlink() or (target.exists() and not target.is_file()):
        raise ValueError('Unsafe destination file: ' + str(target))
    return target


def health(public, url):
    for path in ('index.html', 'live-storefront.mjs', 'styles.css'):
        if not (public / path).is_file() or not (public / path).stat().st_mode & stat.S_IROTH:
            raise RuntimeError('Storefront health failed: ' + path)
    if url:
        with urlopen(url.rstrip('/') + '/', timeout=20) as response:
            body = response.read(1024 * 1024)
            if response.status != 200 or b'live-storefront.mjs' not in body:
                raise RuntimeError('Storefront HTTP health failed')
        with urlopen(url.rstrip('/') + '/optiman-backend/index.php?path=/api/v1/products&per_page=1', timeout=20) as response:
            result = json.load(response)
            if response.status != 200 or not isinstance(result.get('data', {}).get('items'), list):
                raise RuntimeError('Backend API health failed')


def restore(public, backup, manifest):
    for name in reversed(manifest['files']):
        target = safe_target(public, name)
        saved = backup / 'original' / name
        if saved.is_file():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(saved, target)
            os.chmod(target, 0o644)
        elif target.exists():
            target.unlink()
    for name in sorted(manifest['created_dirs'], key=lambda x: len(PurePosixPath(x).parts), reverse=True):
        directory = public / name
        if directory.is_dir() and not directory.is_symlink():
            try:
                directory.rmdir()
            except OSError:
                pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['deploy', 'rollback'])
    parser.add_argument('--commit', required=True)
    parser.add_argument('--public', type=Path, default=Path('/home/optiman1/public_html'))
    parser.add_argument('--workspace', type=Path, default=Path('/home/optiman1/optiman-deploy'))
    parser.add_argument('--health-url', default='https://optiman.bd')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    if len(args.commit) != 40 or any(c not in '0123456789abcdef' for c in args.commit):
        parser.error('Commit must be a full lowercase SHA-1')
    if run('git', 'branch', '--show-current') != BRANCH:
        parser.error('Checkout branch does not match the approved branch')
    if args.action == 'deploy' and run('git', 'rev-parse', 'HEAD') != args.commit:
        parser.error('Checkout commit does not match the approved selection')
    if args.public.is_symlink() or args.workspace.is_symlink():
        parser.error('Symlinked deployment paths are forbidden')
    public, workspace = args.public.resolve(), args.workspace.resolve()
    if public == workspace or public in workspace.parents or workspace in public.parents:
        parser.error('Deployment workspace must be outside public_html')
    workspace.mkdir(mode=0o700, parents=True, exist_ok=True)
    if workspace.is_symlink():
        parser.error('Unsafe deployment workspace')
    with (workspace / 'deployment.lock').open('a+') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        def log(message):
            with (workspace / 'deployment.log').open('a') as record:
                record.write(datetime.now(timezone.utc).isoformat() + ' ' + message + '\n')
        if args.action == 'rollback':
            backup = workspace / 'backups' / args.commit
            manifest = json.loads((backup / 'manifest.json').read_text())
            if manifest['commit'] != args.commit:
                raise ValueError('Backup commit mismatch')
            if not args.dry_run:
                restore(public, backup, manifest)
                if (public / 'index.html').is_file():
                    assert (public / 'index.html').stat().st_mode & stat.S_IROTH
            if not args.dry_run:
                log('rollback ' + args.commit + ' restored')
            print('Rollback ready' if args.dry_run else 'Rollback restored storefront from ' + str(backup))
            return
        package = workspace / 'storefront-staged.zip'
        subprocess.run([sys.executable, str(ROOT / 'scripts/package_live_storefront.py'), '--output', str(package)], cwd=ROOT, check=True)
        with ZipFile(package) as archive:
            members = validate_archive(archive)
            for name in members:
                safe_target(public, name)
            if args.dry_run:
                print(f'Dry run passed: {len(members)} approved files, commit {args.commit}')
                return
            timestamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
            backup = workspace / 'backups' / args.commit
            if backup.exists():
                raise ValueError('Backup for this commit exists; choose a new commit or inspect rollback')
            backup.mkdir(parents=True, mode=0o700)
            staged = Path(tempfile.mkdtemp(prefix='storefront-stage-', dir=workspace))
            changed, created_dirs = [], set()
            try:
                for name, info in members.items():
                    output = staged / name
                    output.parent.mkdir(parents=True, exist_ok=True)
                    with archive.open(info) as source, output.open('wb') as dest:
                        shutil.copyfileobj(source, dest)
                    os.chmod(output, 0o644)
                    target = safe_target(public, name)
                    if target.exists():
                        saved = backup / 'original' / name
                        saved.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(target, saved)
                        os.chmod(saved, 0o600)
                    changed.append(name)
                manifest = {'commit': args.commit, 'date': timestamp, 'files': changed, 'created_dirs': []}
                for name in changed:
                    target = safe_target(public, name)
                    cursor = target.parent
                    while cursor != public and not cursor.exists():
                        created_dirs.add(cursor.relative_to(public).as_posix())
                        cursor = cursor.parent
                manifest['created_dirs'] = sorted(created_dirs)
                (backup / 'manifest.json').write_text(json.dumps(manifest, indent=2))
                for name in changed:
                    target = safe_target(public, name)
                    target.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
                    os.chmod(target.parent, 0o755)
                    os.replace(staged / name, target)
                    os.chmod(target, 0o644)
                health(public, args.health_url)
            except Exception:
                restore(public, backup, {'files': changed, 'created_dirs': sorted(created_dirs)})
                log('deploy ' + args.commit + ' failed and rolled back')
                raise
            finally:
                shutil.rmtree(staged)
            log('deploy ' + args.commit + ' completed; backup ' + str(backup))
            print('Deployed storefront commit ' + args.commit + '; backup: ' + str(backup))


if __name__ == '__main__':
    main()
