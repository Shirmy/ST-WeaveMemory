import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual host event module without a browser or a DOM mock.
const listeners = new Map();
const eventSource = { on: (event, callback) => listeners.set(event, callback) };
const eventTypes = { CHAT_CHANGED: 'chat-changed' };
const contextFor = id => ({ chatId: id, eventSource, eventTypes, chat: [{ is_user: false, is_system: false, swipe_id: 0, mes: `text-${id}` }] });
let current = contextFor('A');
let enabled = true;
let releaseA;
const waitingA = new Promise(resolve => { releaseA = resolve; });
const reconciled = [], displayed = [], branches = new Map();
let bindingStarted = false;
const imports = {
  '../ui/main-modal': { mainModal: { setChatContext: async (id, branch) => { displayed.push({ id, branch }); } } },
  '../api/backend-client': { backend: {
    bindHostChat: async ({ chatId }) => { if (chatId === 'A') { bindingStarted = true; await waitingA; } return { branch: { branchId: `branch-${chatId}` } }; },
    reconcileChat: async input => { reconciled.push(input); return { branch: { branchId: `branch-${input.chatId}` } }; }
  } },
  './context': { getContext: () => current, currentChatId: context => context.chatId, currentChatMetadata: () => ({}) },
  '../settings/store': { getSettings: () => ({ enabled }) },
  './branch-state': { getCurrentBranchId: id => branches.get(id), resetBranchState: id => branches.delete(id), setCurrentBranch: (id, branch) => branches.set(id, branch.branchId) },
  '../injection/prompts': { clearMemoryPrompts: () => undefined }
};
const source = await fs.readFile(new URL('../src/host/events.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
const exported = {};
vm.runInNewContext(outputText, { exports: exported, require: name => { assert.ok(name in imports, name); return imports[name]; }, console: { debug() {}, warn(...args) { throw new Error(args.join(' ')); } } });
exported.bindHostEvents();
listeners.get('chat-changed')();
await new Promise(resolve => setImmediate(resolve));
assert.equal(bindingStarted, true);
current = contextFor('B');
listeners.get('chat-changed')();
releaseA();
for (let attempt = 0; attempt < 20 && reconciled.length < 2; attempt++) await new Promise(resolve => setImmediate(resolve));
assert.equal(reconciled.length, 2);
assert.equal(reconciled[0].chatId, 'A');
assert.equal(reconciled[0].floors[0].content, 'text-A');
assert.equal(reconciled[1].chatId, 'B');
assert.equal(reconciled[1].floors[0].content, 'text-B');
assert.equal(displayed.filter(item => item.id === 'A').length, 1, 'late A response must not restore the old scope');
assert.equal(displayed.at(-1).id, 'B');
enabled = false;
current = contextFor('C');
listeners.get('chat-changed')();
await new Promise(resolve => setImmediate(resolve));
assert.equal(displayed.at(-1).id, 'C', 'disabled extension still changes UI scope');
assert.equal(reconciled.length, 2);
console.log('Phase 16 host scope event acceptance passed');
