#!/usr/bin/env python3
"""Statically snapshot an installed Electron app; never execute its code."""
import argparse
import hashlib
import json
import plistlib
import shutil
import struct
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sha256(path):
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def safe_child(root, relative):
    relative = Path(relative)
    if relative.is_absolute() or '..' in relative.parts:
        raise ValueError(f'Unsafe archive path: {relative}')
    target = root / relative
    if not target.resolve().is_relative_to(root.resolve()):
        raise ValueError(f'Unsafe archive path: {relative}')
    return target


def extract_asar(archive, out, expected_header_hash=None):
    """Extract packed/unpacked members as data; links are recorded and skipped."""
    records, differences = [], []
    before = sha256(archive)
    archive_size = archive.stat().st_size
    with archive.open('rb') as handle:
        first = handle.read(16)
        if len(first) != 16:
            raise ValueError(f'Truncated ASAR header: {archive}')
        size_pickle, header_size, payload_size, json_size = struct.unpack('<4I', first)
        base = 8 + header_size
        if (size_pickle != 4 or payload_size + 4 != header_size
                or json_size + 8 > header_size or base > archive_size):
            raise ValueError(f'Invalid ASAR header sizes: {archive}')
        raw_header = handle.read(json_size)
        header_hash = hashlib.sha256(raw_header).hexdigest()
        if expected_header_hash and header_hash != expected_header_hash.lower():
            raise ValueError(f'Info.plist ASAR header integrity mismatch: {archive}')
        header = json.loads(raw_header)

        def extract(entries, prefix=Path()):
            for name, entry in sorted(entries.items()):
                if name in ('', '.', '..') or '/' in name or '\\' in name:
                    raise ValueError(f'Unsafe ASAR member name: {name!r}')
                rel = prefix / name
                target = safe_child(out, rel)
                if 'files' in entry:
                    target.mkdir(parents=True, exist_ok=True)
                    extract(entry['files'], rel)
                    continue
                if 'link' in entry:
                    records.append({'path': str(rel), 'link': entry['link'], 'skipped': True})
                    continue
                size = entry['size']
                if not isinstance(size, int) or size < 0:
                    raise ValueError(f'Invalid ASAR member size: {rel}')
                if entry.get('unpacked'):
                    source = safe_child(Path(str(archive) + '.unpacked'), rel)
                    data = source.read_bytes()
                else:
                    offset = int(entry['offset'])
                    if offset < 0 or base + offset + size > archive_size:
                        raise ValueError(f'ASAR member outside archive: {rel}')
                    handle.seek(base + offset)
                    data = handle.read(size)
                if len(data) != size and not entry.get('unpacked'):
                    raise ValueError(f'Truncated ASAR member: {rel}')
                digest = hashlib.sha256(data).hexdigest()
                integrity = entry.get('integrity', {})
                if integrity.get('algorithm') == 'SHA256' and integrity.get('hash', '').lower() != digest:
                    difference = {'path': str(rel), 'unpacked': bool(entry.get('unpacked')),
                                  'expected': integrity.get('hash'), 'actual': digest}
                    differences.append(difference)
                    # Installed native binaries may have been re-signed outside the ASAR.
                    if not entry.get('unpacked'):
                        raise ValueError(f'Packed ASAR member integrity mismatch: {rel}')
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                records.append({'path': str(rel), 'size': len(data), 'sha256': digest,
                                'unpacked': bool(entry.get('unpacked')),
                                **({'declaredSize': size} if len(data) != size else {})})

        out.mkdir(parents=True, exist_ok=True)
        extract(header['files'])
    if sha256(archive) != before:
        raise ValueError(f'Source archive changed during extraction: {archive}')
    return records, {'source': str(archive), 'size': archive_size, 'sha256': before,
                     'headerSha256': header_hash, 'entries': len(records),
                     'embeddedIntegrityDifferences': differences}


def copy_frontend(source, target):
    records = []
    for file in sorted(source.rglob('*')):
        rel = file.relative_to(source)
        if file.is_symlink():
            raise ValueError(f'Frontend symlink requires inspection: {rel}')
        if file.is_file():
            dest = safe_child(target, rel)
            dest.parent.mkdir(parents=True, exist_ok=True)
            before = sha256(file)
            shutil.copy2(file, dest)
            if sha256(dest) != before or sha256(file) != before:
                raise ValueError(f'Frontend file changed during snapshot: {rel}')
            records.append({'path': str(rel), 'size': dest.stat().st_size, 'sha256': before})
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--resources', type=Path, default=Path('/Applications/Claude.app/Contents/Resources'))
    parser.add_argument('--output', type=Path, help='New versioned snapshot directory')
    parser.add_argument('--skip-runtime', action='store_true', help='Omit the unrelated VM disk image')
    parser.add_argument('--copy-archives', action='store_true', help='Also freeze original ASARs in source-archives/')
    args = parser.parse_args()
    resources = args.resources.resolve()
    snapshot = args.output.resolve() if args.output else None
    if args.copy_archives and not snapshot:
        parser.error('--copy-archives requires --output')
    if snapshot and snapshot.exists() and any(snapshot.iterdir()):
        raise FileExistsError(f'Snapshot directory is not empty: {snapshot}')
    info_bytes = (resources.parent / 'Info.plist').read_bytes()
    info = plistlib.loads(info_bytes)
    archives = {}

    def unpack(name, target):
        declared = info.get('ElectronAsarIntegrity', {}).get('Resources/' + name, {})
        if declared and declared.get('algorithm') != 'SHA256':
            raise ValueError(f'Unsupported Info.plist integrity algorithm: {name}')
        records, metadata = extract_asar(resources / name, target, declared.get('hash'))
        archives[name] = metadata
        if snapshot and args.copy_archives:
            dest = snapshot / 'source-archives' / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(resources / name, dest)
            if sha256(dest) != metadata['sha256']:
                raise ValueError(f'Source archive changed while freezing: {name}')
            metadata['snapshotPath'] = str(dest.relative_to(snapshot))
        return records

    out = snapshot / 'asar' if snapshot else ROOT / 'reference/asar'
    records = unpack('app.asar', out)
    frontend = snapshot / 'ion-dist' if snapshot else ROOT / 'reference/ion-dist'
    if (resources / 'ion-dist.asar').is_file():
        frontend_records = unpack('ion-dist.asar', frontend)
        frontend_source = 'ion-dist.asar'
    elif (resources / 'ion-dist').is_dir():
        frontend_records = copy_frontend(resources / 'ion-dist', frontend)
        frontend_source = 'ion-dist/'
    else:
        raise FileNotFoundError('Neither ion-dist.asar nor ion-dist/ exists')

    runtime_records = []
    if snapshot and not args.skip_runtime:
        source = resources / 'smol-bin.arm64.img'
        if source.is_file():
            target = snapshot / 'runtime-resources' / source.name
            target.parent.mkdir(parents=True, exist_ok=True)
            before = sha256(source)
            shutil.copy2(source, target)
            if sha256(target) != before or sha256(source) != before:
                raise ValueError('Runtime image changed during snapshot')
            runtime_records.append({'path': str(target.relative_to(snapshot)), 'sha256': before})
    if (resources.parent / 'Info.plist').read_bytes() != info_bytes:
        raise ValueError('Info.plist changed during extraction')
    for name, metadata in archives.items():
        if sha256(resources / name) != metadata['sha256']:
            raise ValueError(f'Source archive changed during snapshot: {name}')

    plist_record = {'source': str(resources.parent / 'Info.plist'),
                    'sha256': hashlib.sha256(info_bytes).hexdigest()}
    if snapshot:
        target = snapshot / 'metadata/Info.plist'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(info_bytes)
        plist_record['snapshotPath'] = str(target.relative_to(snapshot))
    manifest = snapshot / 'manifest.json' if snapshot else ROOT / 'analysis/asar-manifest.json'
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps({
        'schemaVersion': 2, 'createdAt': datetime.now(timezone.utc).isoformat(),
        'archive': str(resources / 'app.asar'), 'version': info['CFBundleShortVersionString'],
        'buildVersion': info.get('CFBundleVersion'), 'bundleIdentifier': info.get('CFBundleIdentifier'),
        'sha256': archives['app.asar']['sha256'], 'archives': archives, 'infoPlist': plist_record,
        'frontendSource': frontend_source, 'files': records, 'frontend': frontend_records,
        'runtimeResources': runtime_records,
    }, indent=2) + '\n')
    print(f"Extracted installed Claude {info['CFBundleShortVersionString']}: "
          f'{len(records)} ASAR entries, {len(frontend_records)} frontend entries to {out.parent}')


if __name__ == '__main__':
    main()
