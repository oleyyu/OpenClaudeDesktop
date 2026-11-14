import test from 'node:test';
import assert from 'node:assert/strict';
import { markdownToClipboardHtml, promoteSoftBreaks } from '../src/rich-copy-html.mjs';

// micromark emits only the line endings present in the trimmed source, so a
// whole-document result ends without a trailing newline.
test('soft line breaks inside a paragraph become hard breaks; blank lines still split paragraphs', () => {
  assert.equal(promoteSoftBreaks('line one\nline two\n\nsecond paragraph'), 'line one  \nline two\n\nsecond paragraph');
  const html = markdownToClipboardHtml('line one\nline two\n\nsecond paragraph');
  assert.equal(html, '<p>line one<br />\nline two</p>\n<p>second paragraph</p>');
  assert.equal((html.match(/<br \/>/g) || []).length, 1);
  assert.equal((html.match(/<p>/g) || []).length, 2);
});

test('lines already ending a hard break are left alone; blank, last and next-blank lines get no marker', () => {
  assert.equal(promoteSoftBreaks('two spaces  \nnext'), 'two spaces  \nnext');
  assert.equal(promoteSoftBreaks('three spaces   \nnext'), 'three spaces   \nnext');
  assert.equal(promoteSoftBreaks('one space \nnext'), 'one space   \nnext');
  assert.equal(promoteSoftBreaks('before blank\n\nafter'), 'before blank\n\nafter');
  assert.equal(promoteSoftBreaks('before whitespace line\n \t \nafter'), 'before whitespace line\n \t \nafter');
  assert.equal(promoteSoftBreaks('last line'), 'last line');
  assert.equal(promoteSoftBreaks('\n\n'), '\n\n');
});

test('an odd trailing backslash run is already a hard break; an even run is escaped text and gets the marker', () => {
  assert.equal(promoteSoftBreaks('odd\\\nnext'), 'odd\\\nnext');
  assert.equal(promoteSoftBreaks('triple\\\\\\\nnext'), 'triple\\\\\\\nnext');
  assert.equal(promoteSoftBreaks('even\\\\\nnext'), 'even\\\\  \nnext');
  assert.equal(markdownToClipboardHtml('odd\\\nnext'), '<p>odd<br />\nnext</p>');
  assert.equal(markdownToClipboardHtml('even\\\\\nnext'), '<p>even\\<br />\nnext</p>');
});

test('backtick and tilde fences are untouched, including info strings and closers longer than the opener', () => {
  const fenced = '```js title\nconst a = 1;\nconst b = 2;\n```\nafter\nfence';
  assert.equal(promoteSoftBreaks(fenced), '```js title\nconst a = 1;\nconst b = 2;\n```\nafter  \nfence');
  const tilde = '~~~\nfirst\nsecond\n~~~~\nprose\nline';
  assert.equal(promoteSoftBreaks(tilde), '~~~\nfirst\nsecond\n~~~~\nprose  \nline');
  const html = markdownToClipboardHtml(fenced);
  assert.ok(html.includes('<pre><code class="language-js">const a = 1;\nconst b = 2;\n</code></pre>'), html);
  assert.equal(html.includes('<br'), true, 'prose after the fence keeps its promoted break');
  assert.equal(html.indexOf('<br'), html.indexOf('after') + 'after'.length, 'the only break is in the trailing prose');
});

test('a shorter closer or a different fence character does not end the fence; a backtick info string is not a fence', () => {
  assert.equal(promoteSoftBreaks('````\ncode\n```\nstill\ncode\n````\nx\ny'), '````\ncode\n```\nstill\ncode\n````\nx  \ny');
  assert.equal(promoteSoftBreaks('```\ncode\n~~~\nstill\n```\nx\ny'), '```\ncode\n~~~\nstill\n```\nx  \ny');
  assert.equal(promoteSoftBreaks('``` a`b\nnot\nfenced'), '``` a`b  \nnot  \nfenced');
  assert.equal(promoteSoftBreaks('~~~ a`b\nis\nfenced\n~~~'), '~~~ a`b\nis\nfenced\n~~~');
  assert.equal(promoteSoftBreaks('    ```\nnot\nfenced'), '    ```  \nnot  \nfenced');
});

test('fence closers tolerate up to three extra spaces; a dedented non-blank line ends fence tracking', () => {
  assert.equal(promoteSoftBreaks(' ```\n code\n    ```\nx\ny'), ' ```\n code\n    ```\nx  \ny');
  assert.equal(promoteSoftBreaks(' ```\n code\n     ```\n still\n code\n ```\nx\ny'), ' ```\n code\n     ```\n still\n code\n ```\nx  \ny', 'five spaces exceed the +3 closer tolerance');
  assert.equal(promoteSoftBreaks('  ```\n  code\n\nprose\nline'), '  ```\n  code\n\nprose  \nline');
  assert.equal(promoteSoftBreaks('  ```\n  code\nprose\nline\n  ```'), '  ```\n  code\nprose  \nline  \n  ```', 'the dedented lines are processed as prose (the re-opened fence is a non-blank next line)');
  assert.equal(promoteSoftBreaks('  ```\n  code\n```\nx\ny'), '  ```\n  code\n```\nx\ny', 'a dedented fence line re-opens a fence');
});

test('CRLF and CR input are normalized before break promotion', () => {
  assert.equal(promoteSoftBreaks('a\r\nb\r\n\r\nc\rd'), 'a  \nb\n\nc  \nd');
  assert.equal(markdownToClipboardHtml('a\r\nb'), '<p>a<br />\nb</p>');
});

test('GFM table compiles to thead/tbody; strikethrough, tasklists and bare URLs are not extensions', () => {
  const html = markdownToClipboardHtml('| a | b |\n|---|:-:|\n| 1 | 2 |');
  assert.equal(html, '<table>\n<thead>\n<tr>\n<th>a</th>\n<th align="center">b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>1</td>\n<td align="center">2</td>\n</tr>\n</tbody>\n</table>');
  assert.equal(markdownToClipboardHtml('~~x~~'), '<p>~~x~~</p>');
  assert.equal(markdownToClipboardHtml('- [ ] task'), '<ul>\n<li>[ ] task</li>\n</ul>');
  assert.equal(markdownToClipboardHtml('see https://example.com now'), '<p>see https://example.com now</p>');
});

test('raw HTML is escaped and unsafe link protocols are dropped', () => {
  assert.equal(markdownToClipboardHtml('<b>x</b> <script>alert(1)</script>'), '<p>&lt;b&gt;x&lt;/b&gt; &lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.equal(markdownToClipboardHtml('<div>block</div>'), '&lt;div&gt;block&lt;/div&gt;');
  assert.equal(markdownToClipboardHtml('[l](javascript:alert(1))'), '<p><a href="">l</a></p>');
  assert.equal(markdownToClipboardHtml('[l](https://example.com/a?b=1&c=2)'), '<p><a href="https://example.com/a?b=1&amp;c=2">l</a></p>');
  assert.equal(markdownToClipboardHtml('![i](javascript:alert(1))'), '<p><img src="" alt="i" /></p>');
});

test('the markdown is trimmed first; blank, whitespace-only and non-string input produce an empty string', () => {
  assert.equal(markdownToClipboardHtml('  \n\thello\n\n  '), '<p>hello</p>');
  assert.equal(markdownToClipboardHtml(''), '');
  assert.equal(markdownToClipboardHtml(' \n\t '), '');
  assert.equal(markdownToClipboardHtml(undefined), '');
  assert.equal(markdownToClipboardHtml(null), '');
  assert.equal(markdownToClipboardHtml(42), '');
  assert.equal(promoteSoftBreaks(undefined), '');
});

test('breaks:false leaves soft breaks as soft breaks', () => {
  assert.equal(markdownToClipboardHtml('a\nb', { breaks: false }), '<p>a\nb</p>');
});

test('the audited acceptance fixture yields one break in the first paragraph, two paragraphs, a raw-newline fence and a table', () => {
  const fixture = 'line one\nline two\n\nSecond paragraph.\n\n```js\nconst a = 1;\nconst b = 2;\n```\n\n| col | val |\n|-----|-----|\n| x | 1 |';
  const html = markdownToClipboardHtml(fixture);
  const first = html.slice(0, html.indexOf('</p>'));
  assert.equal((first.match(/<br \/>/g) || []).length, 1);
  assert.equal((html.match(/<p>/g) || []).length, 2);
  const fence = html.slice(html.indexOf('<pre>'), html.indexOf('</pre>'));
  assert.ok(fence.startsWith('<pre><code class="language-js">'));
  assert.ok(fence.includes('const a = 1;\nconst b = 2;'));
  assert.equal(fence.includes('<br'), false);
  assert.ok(html.includes('<table>') && html.includes('<thead>') && html.includes('<tbody>'));
});
