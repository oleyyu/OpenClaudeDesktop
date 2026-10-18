#!/usr/bin/env python3
"""Read-only extraction of an installed Electron app for local UI inspection."""
import argparse,hashlib,json,plistlib,shutil,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
APP=Path('/Applications/Claude.app/Contents/Resources')
archive=APP/'app.asar'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,help='Versioned snapshot directory (contains asar, ion-dist and manifest.json)')
parser.add_argument('--skip-runtime', action='store_true', help='Snapshot source only; omit the unrelated VM disk image')
args=parser.parse_args()
snapshot=args.output.resolve() if args.output else None
if snapshot and (snapshot/'manifest.json').exists(): raise FileExistsError(f'Snapshot already exists: {snapshot}')
out=snapshot/'asar' if snapshot else ROOT/'reference/asar'
out.mkdir(parents=True,exist_ok=True)
records=[]
with archive.open('rb') as f:
    first=f.read(16)
    _,header_size,_,json_size=struct.unpack('<4I',first)
    header=json.loads(f.read(json_size));base=8+header_size
    def extract(entries,prefix=Path()):
        for name,entry in entries.items():
            rel=prefix/name;target=out/rel
            if not target.resolve().is_relative_to(out.resolve()):raise ValueError('Unsafe archive path')
            if 'files' in entry:
                target.mkdir(parents=True,exist_ok=True);extract(entry['files'],rel);continue
            if 'link' in entry:
                records.append({'path':str(rel),'link':entry['link'],'skipped':True});continue
            if entry.get('unpacked'):
                source=Path(str(archive)+'.unpacked')/rel
                data=source.read_bytes()
            else:
                f.seek(base+int(entry['offset']));data=f.read(entry['size'])
                if len(data)!=entry['size']:raise ValueError('Truncated archive member')
            target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
            records.append({'path':str(rel),'size':len(data),'sha256':hashlib.sha256(data).hexdigest(),'unpacked':bool(entry.get('unpacked'))})
    extract(header['files'])
frontend=snapshot/'ion-dist' if snapshot else ROOT/'reference/ion-dist'
shutil.copytree(APP/'ion-dist',frontend,dirs_exist_ok=True)
with (APP.parent/'Info.plist').open('rb') as f:version=plistlib.load(f)['CFBundleShortVersionString']
frontend_records=[{'path':str(p.relative_to(frontend)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(frontend.rglob('*')) if p.is_file()]
runtime_records=[]
if snapshot and not args.skip_runtime:
    for name in ['smol-bin.arm64.img']:
        source=APP/name
        if source.is_file():
            target=snapshot/'runtime-resources'/name
            target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(source,target)
            runtime_records.append({'path':str(target.relative_to(snapshot)),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
manifest=snapshot/'manifest.json' if snapshot else ROOT/'analysis/asar-manifest.json'
manifest.write_text(json.dumps({'archive':str(archive),'version':version,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':records,'frontend':frontend_records,'runtimeResources':runtime_records},indent=2))
print(f'Extracted installed Claude {version}: {len(records)} ASAR entries, {len(frontend_records)} frontend files to {out.parent}')
