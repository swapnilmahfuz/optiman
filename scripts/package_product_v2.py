"""Build the cPanel update archive from an explicit overlay allowlist."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
import os
from datetime import datetime, timezone
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / 'backend'
OUTPUT = ROOT / 'packages/optiman-product-v2-update.zip'
PRIVATE = (
    'PRODUCT_V2_UPDATE.md', 'migrations/002_variant_foundation.sql', 'migrations/003_variant_catalog.php',
    'src/Catalog.php', 'src/ImageManager.php', 'src/ImageService.php', 'src/ProductUpgrade.php',
    'src/Variants.php', 'src/VariantInventory.php',
)
PUBLIC = ('index.php', 'admin/index.html', 'admin/style.css', 'admin/app.js', 'admin/product-editor.js')


def build():
    # Fresh Phase 1 archives used ZIP's default 1980 timestamp. Give changed
    # PHP files a new release timestamp so OPcache can invalidate old bytecode.
    epoch = os.environ.get('SOURCE_DATE_EPOCH')
    release = datetime.fromtimestamp(int(epoch), timezone.utc) if epoch else datetime.now(timezone.utc)
    if release.year <= 1980:
        raise ValueError('Use the release timestamp, later than the Phase 1 archive.')
    entries = {f'optiman-private/{name}': BACKEND / name for name in PRIVATE}
    entries.update({f'public_html/optiman-backend/{name}': BACKEND / 'public' / name for name in PUBLIC})
    with tempfile.NamedTemporaryFile(dir=OUTPUT.parent, delete=False) as tmp:
        staging = Path(tmp.name)
    try:
        with ZipFile(staging, 'w') as archive:
            for name, source in entries.items():
                if not source.is_file() or source.is_symlink():
                    raise ValueError(f'Invalid source {source}')
                item = ZipInfo(name, release.timetuple()[:6])
                item.create_system = 3
                mode = 0o100644 if name.startswith('public_html/') else 0o100600
                item.external_attr = mode << 16
                archive.writestr(item, source.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
        with ZipFile(staging) as archive:
            assert archive.testzip() is None and set(archive.namelist()) == set(entries)
            for name, source in entries.items():
                assert archive.read(name) == source.read_bytes()
        os.replace(staging, OUTPUT)
    finally:
        staging.unlink(missing_ok=True)
    print(f'{OUTPUT.name}: verified {len(entries)} update files')


if __name__ == '__main__':
    build()
