import test from 'node:test';
import assert from 'node:assert/strict';
import {fileSearchFocus} from '../src/file-search-focus.mjs';
test('source content entry trims and prefixes once while selecting only the query',()=>{
 assert.deepEqual(fileSearchFocus('  needle  ','content'),{value:'?needle',start:1,end:7});
 assert.deepEqual(fileSearchFocus(' ?needle ','content'),{value:'?needle',start:1,end:7});
 assert.deepEqual(fileSearchFocus('','content'),{value:'?',start:1,end:1});
 assert.deepEqual(fileSearchFocus('  ?  ','content'),{value:'?',start:1,end:1});
 assert.deepEqual(fileSearchFocus(' ?needle ','filter'),{value:' ?needle ',start:0,end:9});
});
