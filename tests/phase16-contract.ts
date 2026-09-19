import { backend } from '../src/api/backend-client.js';
import { escapeHtml } from '../src/ui/text.js';

function equal(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Contract mismatch: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
}
const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
const channel = { channelId: 'server-id', name: '<img onerror=alert(1)>', apiType: 'openai-compatible', baseUrl: 'https://example.test/v1', hasApiKey: true, timeout: null, headers: {}, createdAt: 'now', updatedAt: 'now' };
const bindings = { summary: { role: 'summary', channelId: 'server-id', model: 'summary', updatedAt: 'now' }, state: null, embedding: null, rerank: null };
const prompt = { presetId: 'builtin:state', promptType: 'state', name: 'default', content: { system: 'System', task: '</textarea><script>alert(1)</script>' }, version: 1, isBuiltin: true, createdAt: 'now', updatedAt: 'now' };
const settings = { state: { timeoutSec: 45, maxAttempts: 3, checkpointInterval: 20 }, longMemory: { summaryIntervalFloors: 30, latestForcedCount: 2 }, recall: { bm25TopK: 10, embeddingTopK: 10, rrfK: 60, rerankEnabled: false, rerankCandidateLimit: 20, finalRecallCount: 6, tokenRatio: 0.03, minTokenBudget: 2000, maxTokenBudget: 6000 }, limits: {}, longMemoryLimits: {}, recallLimits: {} };
const recall = { query: 'key', settings: settings.recall, bm25: [], embedding: [], rrf: [], rerank: { status: 'disabled', documentCount: 0, model: null, candidates: [] }, final: [], errors: [], pack: { text: 'memory', tokenLimit: 2000, estimatedTokens: 3, currentStateTokens: 4, diagnostics: { packedFixedRecentCount: 0, packedHighRelevanceCount: 0, skippedByTokenBudget: 0, skippedByCount: 0, packedCount: 0 } }, timings: { bm25Ms: 1, embeddingMs: 2, rrfMs: 0.1, rerankMs: 0.1, packMs: 0.2, totalMs: 3 } };
globalThis.fetch = async (input, init) => {
  const path = String(input).replace('/api/plugins/weavememory', '');
  const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
  calls.push({ path, body });
  const payload = path === '/ai/channels' ? { channels: [channel] } : path === '/ai/channels/save' ? { channel } : path === '/ai/model-bindings' ? { bindings } : path.startsWith('/ai/prompts?') ? { promptType: 'state', presets: [prompt], activePresetId: prompt.presetId, promptVersion: 'pv1:test' } : path === '/ai/settings' ? settings : path === '/recall/debug' ? recall : path === '/ai/channels/test' ? { ok: true, modelCount: 1, durationMs: 12 } : path === '/memory/vector-rebuild' ? { indexed: 4, failed: 1, removed: 2 } : { binding: null };
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
};
equal((await backend.listChannels()).channels[0].channelId, 'server-id');
equal((await backend.getModelBindings()).bindings.state, null);
equal((await backend.listPrompts('state')).presets[0].content.system, 'System');
equal((await backend.getAiSettings()).recall.tokenRatio, 0.03);
const result = await backend.recallDebug({ chatId: 'chat', branchId: 'branch', query: 'key' });
equal(result.pack.estimatedTokens, 3); equal(result.rerank.status, 'disabled');
await backend.saveChannel({ name: 'New', apiType: 'openai-compatible', baseUrl: 'https://example.test' });
equal('channelId' in calls.at(-1)!.body, false);
await backend.saveChannel({ channelId: 'server-id', name: 'Edit', baseUrl: channel.baseUrl });
equal('apiKey' in calls.at(-1)!.body, false);
await backend.saveChannel({ channelId: 'server-id', name: 'Edit', baseUrl: channel.baseUrl, apiKey: null });
equal(calls.at(-1)!.body.apiKey, null);
await backend.saveModelBindings({ summary: null, state: null, embedding: null, rerank: null });
equal(calls.filter(call => call.path === '/ai/model-bindings/save').map(call => call.body), ['summary', 'state', 'embedding', 'rerank'].map(role => ({ role, channelId: null })));
await backend.savePrompt({ promptType: 'summary', name: 'copy', content: { system: 's', task: 't' } });
equal(calls.at(-1)!.body, { promptType: 'summary', name: 'copy', content: { system: 's', task: 't' } });
equal((await backend.testChannel('server-id')).durationMs, 12);
equal(await backend.rebuildVectors('chat', 'branch'), { indexed: 4, failed: 1, removed: 2 });
equal(escapeHtml('<>&"\''), '&lt;&gt;&amp;&quot;&#39;');
equal(escapeHtml(prompt.content.task).includes('<script>'), false);
console.log('Phase 16 frontend contract acceptance passed');
