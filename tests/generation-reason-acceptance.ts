import { generationFailureMessage } from '../src/host/generation-reason.js';

function assertEqual(actual: string, expected: string): void {
  if (actual !== expected) throw new Error(`expected ${expected}, got ${actual}`);
}

assertEqual(generationFailureMessage('STATE_SYNC_PENDING_TIMEOUT'), '上一 AI 楼的状态仍在同步，织忆已阻止本次生成，请稍后重试。');
assertEqual(generationFailureMessage('STATE_SYNC_FAILED'), '上一 AI 楼的状态同步失败，织忆已阻止本次生成。请检查状态任务后重建。');
assertEqual(generationFailureMessage('LONG_MEMORY_RECALL_FAILED'), '长期记忆召回失败，织忆已阻止本次生成。请检查长期记忆、Embedding / 重排配置或服务端日志。');
console.log('generation failure reason acceptance passed');
