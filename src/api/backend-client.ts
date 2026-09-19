import type { StateAnalysisCandidate } from '../state-schema';
import type {
  AiChannel,
  AiSettingsResponse,
  BranchResponse,
  ChatReconcileRequest,
  ChatReconcileResponse,
  CreateBranchRequest,
  CurrentStateResponse,
  FloorFinalizeRequest,
  FullAiSettingsResponse,
  GenerationPrepareRequest,
  GenerationPrepareResponse,
  HealthResponse,
  HostChatBindingRequest,
  LongMemoryRecord,
  ModelBindings,
  ModelRole,
  ModelBinding,
  PromptPreset,
  RecallDebugResponse,
  StateSnapshot,
  StateTaskRecord
} from '../types';

const BASE = '/api/plugins/weavememory';

export type AiChannelInput = Pick<AiChannel, 'name' | 'baseUrl'> & Partial<Pick<AiChannel, 'channelId' | 'apiType' | 'timeout' | 'headers'>> & { apiKey?: string | null };
export type ModelBindingInput = Pick<ModelBinding, 'channelId' | 'model'>;
export type StateManualEditRequest = {
  chatId: string; branchId?: string; target: 'profile' | 'trace' | 'story' | 'candidate';
  entityId?: string; fieldPath?: string; value?: unknown; lockedPaths?: string[];
  action?: 'lock' | 'unlock' | 'restore-ai'; candidate?: StateAnalysisCandidate;
};
type EnqueueOutcome = { jobId: string | null; stateNodeId: string | null; outcome: 'queued' | 'already-queued' | 'reused' };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init
  });
  if (!response.ok) {
    const errorText = await response.text();
    let message = errorText;
    try {
      const parsed = JSON.parse(errorText);
      message = parsed.error?.message || parsed.message || errorText;
      if (parsed.error?.code === 'WM_MANUAL_EDIT_REQUIRES_STATE' || parsed.code === 'WM_MANUAL_EDIT_REQUIRES_STATE') {
        message = '当前分支尚未生成首个状态节点，暂不能手动修改状态。';
      }
    } catch {}
    throw new Error(`WeaveMemory backend ${response.status}: ${message}`);
  }
  return response.json() as Promise<T>;
}

export const backend = {
  debugCurrent: (chatId: string, branchId: string) => request<import('../types').DebugResponse>(`/debug/current?${new URLSearchParams({ chatId, branchId })}`),
  // System & Health
  health: () => request<HealthResponse>('/health'),

  // AI Channels
  listChannels: () => request<{ channels: AiChannel[] }>('/ai/channels'),
  saveChannel: (channel: AiChannelInput) => request<{ channel: AiChannel }>('/ai/channels/save', {
    method: 'POST', body: JSON.stringify(channel)
  }),
  deleteChannel: (channelId: string) => request<{ deleted: boolean; unboundRoles: ModelRole[] }>('/ai/channels/delete', {
    method: 'POST', body: JSON.stringify({ channelId })
  }),
  probeChannelModels: (channelId: string, apiKey?: string) => request<{ models: string[] }>('/ai/channels/models', {
    method: 'POST', body: JSON.stringify({ channelId, apiKey })
  }),
  testChannel: (payloadOrId: { channelId?: string; baseUrl?: string; apiKey?: string | null; headers?: Record<string, string>; timeout?: number | null } | string, apiKey?: string) => request<{ ok: true; modelCount: number; durationMs: number }>('/ai/channels/test', {
    method: 'POST', body: JSON.stringify(typeof payloadOrId === 'string' ? { channelId: payloadOrId, apiKey } : payloadOrId)
  }),
  testModel: (payload: { role: ModelRole; channelId?: string; baseUrl?: string; model: string; apiKey?: string | null }) => request<{ ok: true; role: ModelRole; model: string; detail: string; durationMs: number }>('/ai/models/test', {
    method: 'POST', body: JSON.stringify(payload)
  }),

  // Model Bindings
  getModelBindings: () => request<{ bindings: ModelBindings }>('/ai/model-bindings'),
  saveModelBinding: (role: ModelRole, binding: ModelBindingInput | null) => request<{ binding: ModelBinding | null }>('/ai/model-bindings/save', {
    method: 'POST', body: JSON.stringify(binding ? { role, channelId: binding.channelId, model: binding.model } : { role, channelId: null })
  }),
  saveModelBindings: async (bindings: Partial<Record<ModelRole, ModelBindingInput | null>>) => {
    for (const role of ['summary', 'state', 'embedding', 'rerank'] as const) {
      if (bindings[role] !== undefined) await backend.saveModelBinding(role, bindings[role]!);
    }
    return backend.getModelBindings();
  },

  // Prompts
  listPrompts: (type: 'state' | 'summary') => request<{ promptType: 'state' | 'summary'; presets: PromptPreset[]; activePresetId: string; promptVersion: string }>(`/ai/prompts?type=${type}`),
  savePrompt: (prompt: { presetId?: string; promptType: 'state' | 'summary'; name: string; content: { system: string; task: string } }) => request<{ preset: PromptPreset }>('/ai/prompts/save', {
    method: 'POST', body: JSON.stringify(prompt)
  }),
  deletePrompt: (presetId: string) => request<{ deleted: boolean; activePresetId: string }>('/ai/prompts/delete', {
    method: 'POST', body: JSON.stringify({ presetId })
  }),
  activatePrompt: (promptType: 'state' | 'summary', presetId: string) => request<{ activePresetId: string; promptVersion: string }>('/ai/prompts/activate', {
    method: 'POST', body: JSON.stringify({ promptType, presetId })
  }),
  resetPrompt: (promptType: 'state' | 'summary') => request<{ activePresetId: string; promptVersion: string }>('/ai/prompts/reset', {
    method: 'POST', body: JSON.stringify({ promptType })
  }),
  testPrompt: (payload: { promptType: 'state' | 'summary'; presetId?: string; content?: { system: string; task: string }; sampleContent: string }) => request<{ ok: true; result: unknown; durationMs: number; promptVersion: string; model: string; channelId: string }>('/ai/prompts/test', {
    method: 'POST', body: JSON.stringify(payload)
  }),

  // Settings
  getAiSettings: () => request<FullAiSettingsResponse>('/ai/settings'),
  saveAiSettings: (settings: { state?: Partial<FullAiSettingsResponse['state']>; longMemory?: Partial<FullAiSettingsResponse['longMemory']>; recall?: Partial<FullAiSettingsResponse['recall']> }) => request<Pick<FullAiSettingsResponse, 'state' | 'longMemory' | 'recall'>>('/ai/settings/save', {
    method: 'POST', body: JSON.stringify(settings)
  }),
  saveLongMemorySettings: (summaryIntervalFloors: number) => request<AiSettingsResponse>('/ai/settings/save', {
    method: 'POST', body: JSON.stringify({ longMemory: { summaryIntervalFloors } })
  }),

  // State Engine
  getCurrentState: (chatId: string, branchId?: string) => {
    const params = new URLSearchParams({ chatId });
    if (branchId) params.set('branchId', branchId);
    return request<CurrentStateResponse>(`/state/current?${params.toString()}`);
  },
  getStateAt: (chatId: string, messageIndex: number, swipeId?: number | null, branchId?: string) => {
    const params = new URLSearchParams({ chatId, messageIndex: String(messageIndex) });
    if (swipeId !== undefined && swipeId !== null) params.set('swipeId', String(swipeId));
    if (branchId) params.set('branchId', branchId);
    return request<{ chatId: string; branchId: string; floorId: string; stateNodeId: string; valid: boolean; snapshot: StateSnapshot }>(`/state/at?${params.toString()}`);
  },
  listStateTasks: (params: { chatId: string; branchId?: string; floorId?: string; status?: string; limit?: number }) => {
    const search = new URLSearchParams();
    search.set('chatId', params.chatId);
    if (params.branchId) search.set('branchId', params.branchId);
    if (params.floorId) search.set('floorId', params.floorId);
    if (params.status) search.set('status', params.status);
    if (params.limit) search.set('limit', String(params.limit));
    return request<{ tasks: StateTaskRecord[] }>(`/state/tasks?${search.toString()}`);
  },
  runStateTask: (chatId: string, floorId: string) => request<EnqueueOutcome>('/state/tasks/run', {
    method: 'POST', body: JSON.stringify({ chatId, floorId })
  }),
  rebuildState: (chatId: string, branchId?: string, fromMessageIndex?: number, force = false) => request<{ chatId: string; branchId: string; firstInvalidIndex: number | null; firstLineageBreakIndex: number | null; cancelled: number; enqueued: EnqueueOutcome | null; skipped: 'chain-valid' | 'no-chain' | 'prompt-version' | 'failed-floor' | null }>('/state/rebuild', {
    method: 'POST', body: JSON.stringify({ chatId, branchId, fromMessageIndex, force })
  }),
  manualEditState: (payload: StateManualEditRequest) => request<{ snapshot: StateSnapshot; changed: boolean }>('/state/manual-edit', {
    method: 'POST', body: JSON.stringify(payload)
  }),

  // Long Memory
  listMemories: (chatId: string, branchId?: string, includeStale = false) => {
    const params = new URLSearchParams({ chatId });
    if (branchId) params.set('branchId', branchId);
    if (includeStale) params.set('includeStale', 'true');
    return request<{ memories: LongMemoryRecord[] }>(`/memory/list?${params.toString()}`);
  },
  searchMemories: (chatId: string, branchId: string, query: string, topK = 10) => {
    const params = new URLSearchParams({ chatId, branchId, query, topK: String(topK) });
    return request<{ query: string; candidates: Array<{ memoryId: string; score: number }> }>(`/memory/search?${params.toString()}`);
  },
  vectorSearchMemories: (chatId: string, branchId: string, query: string, topK = 10) => {
    const params = new URLSearchParams({ chatId, branchId, query, topK: String(topK) });
    return request<{ query: string; candidates: Array<{ memoryId: string; score: number }> }>(`/memory/vector-search?${params.toString()}`);
  },
  rebuildVectors: (chatId: string, branchId: string) => request<{ indexed: number; failed: number; removed: number }>('/memory/vector-rebuild', {
    method: 'POST', body: JSON.stringify({ chatId, branchId })
  }),
  toggleMemoryActive: (memoryId: string, stale: boolean) => request<{ memoryId: string; stale: boolean }>('/memory/toggle-active', {
    method: 'POST', body: JSON.stringify({ memoryId, stale })
  }),
  recallDebug: (payload: {
    chatId: string;
    branchId: string;
    query: string;
    options?: Record<string, unknown>;
    fixedRecentCount?: number;
    contextWindow?: number;
    maxMemoryCount?: number;
    tokenLimit?: number;
    currentState?: string;
  }) => request<RecallDebugResponse>('/recall/debug', {
    method: 'POST', body: JSON.stringify(payload)
  }),
  resummarizeMemories: (payload: { chatId: string; branchId: string; batchId?: string; startFloor?: number; endFloor?: number }) => request<{ memories: LongMemoryRecord[] }>('/memory/resummarize-range', {
    method: 'POST', body: JSON.stringify(payload)
  }),

  // Runtime core
  prepareGeneration: (payload: GenerationPrepareRequest) => request<GenerationPrepareResponse>('/generation/prepare', {
    method: 'POST', body: JSON.stringify(payload)
  }),
  finalizeFloor: (payload: FloorFinalizeRequest) => request<{ accepted: boolean; floorKey: string }>('/floor/finalize', {
    method: 'POST', body: JSON.stringify(payload)
  }),
  reconcileChat: (payload: ChatReconcileRequest) => request<ChatReconcileResponse>('/chat/reconcile', {
    method: 'POST', body: JSON.stringify(payload)
  }),
  createBranch: (payload: CreateBranchRequest) => request<BranchResponse>('/branch/create', {
    method: 'POST', body: JSON.stringify(payload)
  }),
  activateBranch: (chatId: string, branchId: string) => request<BranchResponse>('/branch/activate', {
    method: 'POST', body: JSON.stringify({ chatId, branchId })
  }),
  bindHostChat: (payload: HostChatBindingRequest) => request<BranchResponse>('/host-chat/bind', {
    method: 'POST', body: JSON.stringify(payload)
  })
};
