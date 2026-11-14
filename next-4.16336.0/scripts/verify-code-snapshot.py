#!/usr/bin/env python3
"""Verify an extracted snapshot against its manifest and the installed source."""
import argparse
import hashlib
import json
import plistlib
import struct
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--snapshot', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
root = args.snapshot.resolve()
manifest = json.loads((root / 'manifest.json').read_text())
archive = Path(manifest['archive'])
resources = archive.parent
data = archive.read_bytes()
_, header_size, _, json_size = struct.unpack('<4I', data[:16])
header = json.loads(data[16:16 + json_size])
base = 8 + header_size
digest = lambda value: hashlib.sha256(value).hexdigest()
issues, metadata_differences = [], []
counts = {'asar': 0, 'frontend': 0, 'runtime': 0}

def check(relative, expected, installed, section):
    target = (root / relative).resolve()
    if not target.is_relative_to(root):
        raise ValueError(f'Unsafe snapshot path: {relative}')
    copied = target.read_bytes()
    counts[section] += 1
    if digest(copied) != expected:
        issues.append({'file': str(relative), 'reason': 'snapshot hash mismatch'})
    if copied != installed:
        issues.append({'file': str(relative), 'reason': 'installed bytes mismatch'})

for record in manifest['files']:
    if record.get('skipped'):
        continue
    entry = header
    for part in Path(record['path']).parts:
        entry = entry['files'][part]
    source = ((resources / 'app.asar.unpacked' / record['path']).read_bytes()
              if record['unpacked'] else data[
                  base + int(entry['offset']):base + int(entry['offset']) + entry['size']])
    check(Path('asar') / record['path'], record['sha256'], source, 'asar')
    expected = entry.get('integrity', {}).get('hash')
    if expected and digest(source).lower() != expected.lower():
        metadata_differences.append({'file': record['path'], 'unpacked': record['unpacked'],
                                     'expected': expected, 'actual': digest(source)})
for record in manifest['frontend']:
    relative = Path('ion-dist') / record['path']
    check(relative, record['sha256'], (resources / relative).read_bytes(), 'frontend')
for record in manifest.get('runtimeResources', []):
    check(Path(record['path']), record['sha256'],
          (resources / Path(record['path']).name).read_bytes(), 'runtime')
if digest(data) != manifest['sha256']:
    issues.append({'file': 'app.asar', 'reason': 'archive changed'})
with (resources.parent / 'Info.plist').open('rb') as handle:
    installed_version = plistlib.load(handle)['CFBundleShortVersionString']
if installed_version != manifest['version']:
    issues.append({'file': 'Info.plist', 'reason': 'installed version changed'})
source_files = {str(p.relative_to(resources / 'ion-dist'))
                for p in (resources / 'ion-dist').rglob('*') if p.is_file()}
manifest_files = {r['path'] for r in manifest['frontend']}
if source_files != manifest_files:
    issues.append({'reason': 'frontend file list differs',
                   'missing': sorted(source_files - manifest_files),
                   'extra': sorted(manifest_files - source_files)})
result = {'version': manifest['version'], 'archiveSHA256': manifest['sha256'],
          'asarFilesByteVerified': counts['asar'], 'frontendFilesByteVerified': counts['frontend'],
          'runtimeFilesByteVerified': counts['runtime'], 'copyIssues': issues,
          'asarEmbeddedIntegrityDifferences': metadata_differences,
          'note': 'Unpacked native metadata differences are recorded separately from byte equality to installed files.'}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'verified': counts, 'copyIssues': len(issues),
                  'embeddedIntegrityDifferences': len(metadata_differences)}))
raise SystemExit(1 if issues or any(not r['unpacked'] for r in metadata_differences) else 0)
