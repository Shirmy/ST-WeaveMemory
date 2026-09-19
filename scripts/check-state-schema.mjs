import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const source = await readFile(new URL('../../ST-WeaveMemory-Server/src/state/schema.ts', import.meta.url), 'utf8');
const synced = await readFile(new URL('../src/state-schema.ts', import.meta.url), 'utf8');
assert.equal(synced.split('\n').slice(1).join('\n').replace(/\r/g, '').trim(), source.split('export class StateSchemaError')[0].replace(/\r/g, '').trim(), 'State schema types have drifted from the server');
console.log('Shared state schema synchronization passed');
