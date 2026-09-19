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
  PromptPreset,
  RecallDebugResponse,
  StateSnapshot,
  StateTaskRecord
} from '../types';

const BASE = '/api/plugins/weavememory';

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
    } catch {}
    throw new Error(`WeaveMemory backend ${response.status}: ${message}`);
  }
  return response.json() as Promise<T>;
}

export const backend = {
  // System & Health
  health: () => request<HealthResponse>('/health'),

  // AI Channels
  listChannels: () => request<{ channels: AiChannel[] }>('/ai/channels'),
  saveChannel: (channel: Partial<AiChannel>) => request<{ ok: boolean; channel: AiChannel }>('/ai/channels/save', {
    method: 'POST', body: JSON.stringify(channel)
  }),
  deleteChannel: (channelId: string) => request<{ ok: boolean }>('/ai/channels/delete', {
    method: 'POST', body: JSON.stringify({ channelId })
  }),
  probeChannelModels: (channelId: string, apiKey?: string) => request<{ models: string[] }>('/ai/channels/models', {
    method: 'POST', body: JSON.stringify({ channelId, apiKey })
  }),
  testChannel: (channelId: string, apiKey?: string) => request<{ ok: boolean; message: string; latencyMs: number }>('/ai/channels/test', {
    method: 'POST', body: JSON.stringify({ channelId, apiKey })
  }),
  testModel: (payload: { role: string; channelId: string; model: string; apiKey?: string }) => request<{ ok: boolean; message: string; latencyMs: number }>('/ai/models/test', {
    method: 'POST', body: JSON.stringify(payload)
  }),

  // Model Bindings
  getModelBindings: () => request<{ bindings: ModelBindings }>('/ai/model-bindings'),
  saveModelBindings: (bindings: Partial<ModelBindings>) => request<{ ok: boolean; bindings: ModelBindings }>('/ai/model-bindings/save', {
    method: 'POST', body: JSON.stringify({ bindings })
  }),

  // Prompts
  listPrompts: (type: 'state' | 'summary') => request<{ prompts: PromptPreset[]; activePromptId: string }>(`/ai/prompts?type=${type}`),
  savePrompt: (prompt: Partial<PromptPreset>) => request<{ ok: boolean; prompt: PromptPreset }>('/ai/prompts/save', {
    method: 'POST', body: JSON.stringify(prompt)
  }),
  deletePrompt: (id: string) => request<{ ok: boolean }>('/ai/prompts/delete', {
    method: 'POST', body: JSON.stringify({ id })
  }),
  activatePrompt: (id: string) => request<{ ok: boolean; activePromptId: string }>('/ai/prompts/activate', {
    method: 'POST', body: JSON.stringify({ id })
  }),
  resetPrompt: (type: 'state' | 'summary') => request<{ ok: boolean; prompt: PromptPreset }>('/ai/prompts/reset', {
    method: 'POST', body: JSON.stringify({ type })
  }),
  testPrompt: (payload: { type: string; prompt: string; sampleContext?: string }) => request<{ ok: boolean; result: string; latencyMs: number }>('/ai/prompts/test', {
    method: 'POST', body: JSON.stringify(payload)
  }),

  // Settings
  getAiSettings: () => request<FullAiSettingsResponse>('/ai/settings'),
  saveAiSettings: (settings: { state?: any; longMemory?: any; recall?: any }) => request<FullAiSettingsResponse>('/ai/settings/save', {
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
  runStateTask: (chatId: string, floorId: string) => request<{ ok: boolean; jobId: string }>('/state/tasks/run', {
    method: 'POST', body: JSON.stringify({ chatId, floorId })
  }),
  rebuildState: (chatId: string, branchId?: string, fromMessageIndex?: number, force = false) => request<{ firstInvalidIndex: number | null; cancelled: number; enqueued: number; skipped: number }>('/state/rebuild', {
    method: 'POST', body: JSON.stringify({ chatId, branchId, fromMessageIndex, force })
  }),
  manualEditState: (payload: {
    chatId: string;
    branchId?: string;
    target: 'profile' | 'trace' | 'story' | 'candidate';
    entityId?: string;
    fieldPath?: string;
    value?: unknown;
    lockedPaths?: string[];
    action?: 'lock' | 'unlock' | 'restore-ai';
    candidate?: any;
  }) => request<{ snapshot: StateSnapshot; changed: boolean }>('/state/manual-edit', {
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
  rebuildVectors: (chatId: string, branchId: string) => request<{ ok: boolean; processed: number }>('/memory/vector-rebuild', {
    method: 'POST', body: JSON.stringify({ chatId, branchId })
  }),
  toggleMemoryActive: (memoryId: string, stale: boolean) => request<{ memoryId: string; stale: boolean }>('/memory/toggle-active', {
    method: 'POST', body: JSON.stringify({ memoryId, stale })
  }),
  recallDebug: (payload: {
    chatId: string;
    branchId: string;
    query: string;
    options?: any;
    fixedRecentCount?: number;
    contextWindow?: number;
    maxMemoryCount?: number;
    tokenLimit?: number;
    currentState?: string;
  }) => request<RecallDebugResponse>('/recall/debug', {
    method: 'POST', body: JSON.stringify(payload)
  }),
  resummarizeMemories: (input: any) => request<{ memories: LongMemoryRecord[] }>('/memory/resummarize', {
    method: 'POST', body: JSON.stringify({ input })
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
