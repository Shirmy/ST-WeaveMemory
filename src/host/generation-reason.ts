export function generationFailureMessage(reason?: string): string {
  switch (reason) {
    case 'STATE_SYNC_PENDING_TIMEOUT':
      return '上一 AI 楼的状态仍在同步，织忆已阻止本次生成，请稍后重试。';
    case 'LONG_MEMORY_RECALL_FAILED':
      return '长期记忆召回失败，织忆已阻止本次生成。请检查长期记忆、Embedding / 重排配置或服务端日志。';
    case 'STATE_SYNC_FAILED':
    default:
      return '上一 AI 楼的状态同步失败，织忆已阻止本次生成。请检查状态任务后重建。';
  }
}
