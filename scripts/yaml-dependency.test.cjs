'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const yaml=require('yaml');
const version=require('yaml/package.json').version;
test('root YAML parser uses patched 1.x and preserves OpenAPI parsing',()=>{
 assert.equal(version,'1.10.3');
 const source='openapi: 3.0.3\ninfo: &info\n  title: "on"\n  version: "1.0"\ncopy: *info\npaths: {}\n';
 const parsed=yaml.parse(source);assert.equal(parsed.info.title,'on');assert.deepEqual(parsed.copy,parsed.info);assert.deepEqual(yaml.parse(yaml.stringify(parsed)),parsed);
 assert.throws(()=>yaml.parse('broken: [unterminated'));
});
