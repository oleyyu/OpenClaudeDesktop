import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptDiffImage, dataUrlByteSize, diffImageButtonShown, diffImagePreviousPath, diffImageViewer, fetchDiffFileImages, formatImageBytes, isDiffImagePath } from '../src/diff-image-model.mjs';

test('Ya / Da: raster image extensions only, and only for a row without a text body', () => {
  for (const path of ['a.png', 'dir/B.JPG', 'x.jpeg', 'y.gif', 'z.bmp', 'w.webp', 'v.avif']) assert.equal(isDiffImagePath(path), true, path);
  for (const path of ['icon.svg', 'notes.txt', 'png', 'archive.png.zip', '', null]) assert.equal(isDiffImagePath(path), false, String(path));
  assert.equal(diffImageButtonShown('logo.png', false), true);
  assert.equal(diffImageButtonShown('logo.png', true), false, 'a text body (an image with a textual patch) has no viewer');
  assert.equal(diffImageButtonShown('logo.svg', false), false);
});

test('Ea / Oa: image data URLs only; decoded size from the base64 length minus padding', () => {
  assert.equal(acceptDiffImage('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
  assert.equal(acceptDiffImage('data:text/plain;base64,AAAA'), null);
  assert.equal(acceptDiffImage(null), null);
  assert.equal(dataUrlByteSize('data:image/png;base64,AAAA'), 3);
  assert.equal(dataUrlByteSize('data:image/png;base64,AAA='), 2);
  assert.equal(dataUrlByteSize('data:image/png;base64,AA=='), 1);
  assert.equal(dataUrlByteSize('data:image/png,raw'), null, 'not base64');
});

test('hb short: bytes spelled long, larger units 1000-based with one decimal', () => {
  assert.equal(formatImageBytes(512, 'en-US'), '512 bytes');
  assert.equal(formatImageBytes(1536, 'en-US'), '1.5 kB');
  assert.equal(formatImageBytes(2_400_000, 'en-US'), '2.4 MB');
});

test('Ta: before reads the previous name (none for an added file), after the path (none for a removed one); failures are null', async () => {
  const calls = [];
  const fetchImages = fetchDiffFileImages(async ({ path, side }) => {
    calls.push(`${side}:${path}`);
    if (path === 'broken.png') throw new Error('nope');
    return side === 'before' ? 'data:image/png;base64,AAAA' : 'data:text/html;base64,AAAA';
  });
  assert.deepEqual(await fetchImages({ path: 'new.png', status: 'renamed', renamedFrom: 'old.png' }), { before: 'data:image/png;base64,AAAA', after: null });
  assert.deepEqual(calls, ['before:old.png', 'after:new.png']);
  calls.length = 0;
  assert.deepEqual(await fetchImages({ path: 'added.png', status: 'added' }), { before: null, after: null });
  assert.deepEqual(calls, ['after:added.png']);
  calls.length = 0;
  assert.deepEqual(await fetchImages({ path: 'gone.png', status: 'deleted' }), { before: 'data:image/png;base64,AAAA', after: null });
  assert.deepEqual(calls, ['before:gone.png']);
  assert.deepEqual(await fetchImages({ path: 'broken.png', status: 'modified' }), { before: null, after: null });
  assert.equal(diffImagePreviousPath({ path: 'a.png', renamedFrom: 'a.png' }), 'a.png');
});

test('Pa: basename title, folder description, Before | After for a change, a single Added / Deleted figure otherwise', () => {
  assert.deepEqual(diffImageViewer({ path: 'assets/img/logo.png', status: 'modified' }), {
    title: 'logo.png', description: 'assets/img', columns: 2,
    figures: [
      { side: 'before', label: 'Before', alt: 'assets/img/logo.png before the change' },
      { side: 'after', label: 'After', alt: 'assets/img/logo.png after the change' },
    ],
  });
  const renamed = diffImageViewer({ path: 'b.png', status: 'renamed', renamedFrom: 'a.png' });
  assert.equal(renamed.description, undefined);
  assert.equal(renamed.figures[0].alt, 'a.png before the change');
  assert.deepEqual(diffImageViewer({ path: 'new.png', status: 'added' }).figures, [{ side: 'after', label: 'Added', alt: 'new.png' }]);
  assert.deepEqual(diffImageViewer({ path: 'old.png', status: 'deleted' }).figures, [{ side: 'before', label: 'Deleted', alt: 'old.png' }]);
  assert.equal(diffImageViewer({ path: 'old.png', status: 'deleted' }).columns, 1);
});
