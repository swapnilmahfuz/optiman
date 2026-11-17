"""Stage only the reviewed public frontend. No repository-wide directory upload."""
from pathlib import Path
import argparse
import shutil

parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path, help='New staging directory outside preview/')
args = parser.parse_args()
source = Path(__file__).resolve().parents[1] / 'preview'
output = args.output.resolve()
if output == source or source in output.parents:
    parser.error('Staging must be outside preview/')
files = [source / name for name in ('index.html', 'styles.css', 'app.js', 'configurator.js', 'demo-engine.js', 'barcode.js', 'staff.js')]
files += sorted((source / 'assets').glob('*.webp'))
if len(files) == 7:
    parser.error('Expected local WebP assets')
vto_files = ['camera.mjs', 'tracker.mjs', 'geometry.mjs', 'frames.mjs', 'controller.mjs', 'vto.css', 'temples.mjs',
             'assets/atlas-temple.webp', 'assets/noir-temple.webp', 'assets/muse-temple.webp', 'assets/forma-temple.webp',
             'assets/atlas-front.webp', 'assets/noir-front.webp', 'assets/muse-front.webp',
             'assets/forma-front.webp', 'assets/sample-portrait.webp', 'vendor/vision_bundle.mjs',
             'vendor/face_landmarker.task', 'vendor/LICENSE',
             'vendor/wasm/vision_wasm_internal.js', 'vendor/wasm/vision_wasm_internal.wasm',
             'vendor/wasm/vision_wasm_nosimd_internal.js', 'vendor/wasm/vision_wasm_nosimd_internal.wasm']
files += [source / 'vto' / name for name in vto_files]
for file in files:
    if file.is_symlink() or not file.is_file() or not file.resolve().is_relative_to(source):
        parser.error(f'Invalid public file: {file.name}')
output.mkdir(parents=True, exist_ok=False)
for file in files:
    destination = output / file.relative_to(source)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(file, destination)
print(f'Staged {len(files)} public frontend files in {output}; README and unrelated files excluded.')
