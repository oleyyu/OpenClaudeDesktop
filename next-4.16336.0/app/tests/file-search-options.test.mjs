import test from 'node:test';
import assert from 'node:assert/strict';
import { searchInText, DEFAULT_SEARCH_OPTIONS as defaults, getSearchOptions, rememberSearchOptions } from '../src/file-find-model.mjs';
import { compileSearch, normalizeSearchText, scanSearch } from '../src/generated/code-editor/search.mjs';
const opts = values => ({ ...defaults, ...values });
test('original options distinguish case and Unicode whole words, preserving literal punctuation', () => {
 const text='foo Foo foobar foo_bar foo2\n(foo) foo.\n猫 猫咪';
 assert.equal(searchInText(text,'foo').matches.length,7);
 assert.equal(searchInText(text,'foo',opts({matchCase:true})).matches.length,6);
 assert.equal(searchInText(text,'foo',opts({wholeWord:true})).matches.length,4);
 assert.deepEqual(searchInText(text,'猫',opts({wholeWord:true})).matches,[{line:3,start:0,end:1}]);
 assert.deepEqual(searchInText('a.b aXb','a.b',opts({wholeWord:true})).matches,[{line:1,start:0,end:3}]);
 assert.equal(searchInText('foo foobar','foo',opts({wholeWord:true,regexp:true})).matches.length,1);
});
test('original normalization preserves UTF-16 offsets, curly quotes, dotted I and astral characters', () => {
 assert.equal(normalizeSearchText('İΣ😀“A”').length,'İΣ😀“A”'.length);
 assert.deepEqual(searchInText('İx “Foo” 😀FOO','foo').matches,[{line:1,start:4,end:7},{line:1,start:11,end:14}]);
 assert.equal(searchInText('“hi”','"hi"').matches.length,1);
 assert.deepEqual(searchInText('foo\r\nFOO\rfoo','foo').matches.map(m=>m.line),[1,2,3]);
});
test('regex invalid and empty-width expressions; original long-line exclusion', () => {
 assert.equal(searchInText('abc','[',opts({regexp:true})).invalid,true);
 assert.equal(searchInText('abc','[',opts({regexp:false})).invalid,false);
 assert.deepEqual(searchInText('😀a','(?:)',opts({regexp:true})).matches,[]);
 assert.deepEqual(searchInText('foo12 foo34','foo\\d+',opts({regexp:true})).matches,[{line:1,start:0,end:5},{line:1,start:6,end:11}]);
 const result=searchInText('a'.repeat(1001)+'\naaa','a+',opts({regexp:true}));
 assert.equal(result.hasLongLines,true);assert.deepEqual(result.matches,[{line:2,start:0,end:3}]);
 assert.equal(searchInText('a'.repeat(1001),'a').matches.length,1001);
});
test('original time budget pauses and resumes without dropping or duplicating matches', () => {
 let tick=0;const now=()=>{tick+=130;return tick;};
 const first=searchInText('foo\nfoo\nfoo','f.o',opts({regexp:true}),{now});
 assert.equal(first.partial,true);assert.equal(first.matches.length,1);
 const next=searchInText('foo\nfoo\nfoo','f.o',opts({regexp:true}),{previous:first,now:()=>0});
 assert.equal(next.partial,false);assert.deepEqual(next.matches.map(m=>m.line),[1,2,3]);
 const done=scanSearch('foo',compileSearch('foo',defaults));assert.equal(scanSearch('foo',compileSearch('foo',defaults),done),done);
});
test('options are remembered for the renderer lifetime, independently of query', () => {
 rememberSearchOptions(opts({regexp:true}));assert.equal(getSearchOptions().regexp,true);
 rememberSearchOptions(defaults);assert.deepEqual(getSearchOptions(),defaults);
});
