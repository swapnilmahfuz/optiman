"""Exercise the real deploy and rollback against a disposable public_html tree."""
import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
from zipfile import ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('storefront_deploy', ROOT/'scripts/deploy_storefront.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
commit = subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
assert not module.approved('../config.php')
assert not module.approved('optiman-backend/index.php')
assert module.approved('index.html')
assert module.approved('assets/campaign-eyewear-duo-1200.webp')
with tempfile.TemporaryDirectory(prefix='optiman-deploy-check-') as base:
    root = Path(base)
    public = root/'public_html'
    public.mkdir()
    (public/'index.html').write_text('before')
    (public/'.htaccess').write_text('Options -Indexes')
    (public/'optiman-backend').mkdir()
    (public/'optiman-backend'/'config.php').write_text('protected')
    workspace = root/'optiman-deploy'
    script = ROOT/'scripts/deploy_storefront.py'
    command = [sys.executable,str(script),'deploy','--commit',commit,'--public',str(public),'--workspace',str(workspace),'--health-url','']
    subprocess.run(command+['--dry-run'],check=True,cwd=ROOT,stdout=subprocess.DEVNULL)
    assert (public/'index.html').read_text() == 'before'
    subprocess.run(command,check=True,cwd=ROOT,stdout=subprocess.DEVNULL)
    assert 'live-storefront.mjs' in (public/'index.html').read_text()
    assert (public/'styles.css').stat().st_mode & 0o777 == 0o644
    assert (public/'assets').stat().st_mode & 0o777 == 0o755
    assert (public/'optiman-backend'/'config.php').read_text() == 'protected'
    assert (public/'.htaccess').read_text() == 'Options -Indexes'
    subprocess.run([sys.executable,str(script),'rollback','--commit',commit,'--public',str(public),'--workspace',str(workspace),'--health-url',''],check=True,cwd=ROOT,stdout=subprocess.DEVNULL)
    assert (public/'index.html').read_text() == 'before'
    assert not (public/'live-storefront.mjs').exists()
    assert (public/'optiman-backend'/'config.php').read_text() == 'protected'
    failed_public=root/'failed-public'
    failed_public.mkdir()
    (failed_public/'index.html').write_text('safe original')
    failed_command=[sys.executable,str(script),'deploy','--commit',commit,'--public',str(failed_public),'--workspace',str(root/'failed-workspace'),'--health-url','http://127.0.0.1:1']
    failed=subprocess.run(failed_command,cwd=ROOT,capture_output=True)
    assert failed.returncode != 0
    assert (failed_public/'index.html').read_text() == 'safe original'
    assert not (failed_public/'live-storefront.mjs').exists()
    assert 'failed and rolled back' in (root/'failed-workspace'/'deployment.log').read_text()
    symlink=root/'linked-public'
    symlink.symlink_to(public)
    result=subprocess.run(command[:6]+[str(symlink)]+command[7:]+['--dry-run'],cwd=ROOT,capture_output=True)
    assert result.returncode != 0
    with ZipFile(root/'malicious.zip','w') as archive:
        archive.writestr(ZipInfo('../outside'),b'bad')
        try:
            module.validate_archive(archive)
        except ValueError:
            pass
        else:
            raise AssertionError('Path traversal accepted')
print('Deploy dry run, publish, permissions, protected files, rollback and path rejection passed.')
