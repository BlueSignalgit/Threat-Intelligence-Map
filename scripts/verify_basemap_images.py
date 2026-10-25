#!/usr/bin/env python3
"""Check original provider pixels and rendered map for API-key watermarks in CI.

Requires tesseract-ocr. Images come from the live browser test, not fixtures.
The original JPEG is checked before the application's dark styling or overlays.
"""
from pathlib import Path
import re
import subprocess

root = Path('basemap-evidence')
for name in ['provider-tile.jpeg', 'rendered-map.png']:
    image = root / name
    if not image.is_file():
        raise SystemExit(f'Missing live basemap evidence: {image}')
    result = subprocess.run(
        ['tesseract', str(image), 'stdout', '--psm', '11'],
        check=True, capture_output=True, text=True,
    )
    text = result.stdout
    image.with_suffix('.ocr.txt').write_text(text)
    if re.search(r'\bAPI[\s_-]*KEY[\s_-]*REQUIRED\b', text, re.IGNORECASE):
        raise SystemExit(f'API-key watermark detected in {name}')
    if name == 'rendered-map.png' and len(text.strip()) < 30:
        raise SystemExit('Too little map text recognized to validate the rendered screenshot')
    print(f'Checked original pixels: {name}; recognized {len(text.strip())} text characters')
print('::notice title=Basemap watermark verification::Live NASA provider tile and rendered map passed OCR checks for API KEY REQUIRED; original tile checked without CSS or overlays.')
