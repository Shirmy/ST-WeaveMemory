export type HealthResponse = {
  ok: boolean;
  plugin: 'weavememory';
  backendVersion: string;
  apiVersion: number;
  schemaVersion: number;
  capabilities: string[];
};

export type GenerationPrepareRequest = {
  chatId: string;
  generationType: string;
  contextSize: number;
  latestUserIndex: number | null;
  latestUserText: string;
  recentContextMode?: 'raw' | 'summary';
  recentSummaryRegex?: string;
  recentFloorCount?: number;
  externalState?: ExternalStateSnapshot;
};

export type ExternalStateMapping = { id: string; source: 'mvu'; externalPath: string; weaveTarget: { domain: 'profile' | 'trace' | 'story'; path?: string; characterId?: string; field?: string; itemId?: string; semanticKey?: string }; mode: 'equivalent' | 'related'; enabled: boolean };
export type ExternalStateSnapshot = { source: 'mvu'; detected: boolean; statData: unknown | null; messageIndex: number | null; swipeId: number | null; cardId: string | null; mappings: ExternalStateMapping[]; failure?: string };

export type GenerationPrepareResponse = {
  ready: boolean;
  reason?: string;
  longMemory: string;
  currentState: string;
  diagnostics: {
    memoryCount: number;
    memoryTokens: number;
    stateTokens: number;
    stateNodeId?: string;
    memoryTokenLimit?: number;
    recallCandidateCount?: number;
    fixedRecentCount?: number;
    packedFixedRecentCount?: number;
    packedHighRelevanceCount?: number;
    skippedByTokenBudget?: number;
    skippedByCount?: number;
    externalSource?: string | null;
    mvuDetected?: boolean;
    sourceMessageIndex?: number | null;
    sourceSwipeId?: number | null;
    mappingCount?: number;
    activeEquivalentMappings?: string[];
    activeRelatedMappings?: string[];
    suppressedWeaveFields?: string[];
    mappingFailures?: string[];
    tokensBeforeMapping?: number;
    tokensAfterMapping?: number;
  };
};

export type FloorFinalizeRequest = {
  chatId: string;
  branchId?: string;
  messageIndex: number;
  swipeId: number | null;
  content: string;
};

export type ReconcileFloor = {
  messageIndex: number;
  swipeId: number | null;
  content: string;
};

export type ChatReconcileRequest = {
  chatId: string;
  branchId?: string;
  floors: ReconcileFloor[];
};

export type ChatReconcileResponse = {
  chatId: string;
  branchId: string;
  branch: BranchRecord;
  activeFloorIds: string[];
  reusedFloorIds: string[];
  createdFloorIds: string[];
  staleFloorIds: string[];
};

export type BranchRecord = {
  branchId: string;
  chatId: string;
  parentBranchId: string | null;
  forkFloorId: string | null;
  active: boolean;
  createdAt: string;
};

export type CreateBranchRequest = {
  chatId: string;
  sourceBranchId?: string;
  forkFloorId: string;
};

export type HostChatBindingRequest = {
  chatId: string;
  mainChatId?: string | null;
  forkFloor?: ReconcileFloor | null;
};

export type BranchResponse = {
  branch: BranchRecord;
  activeFloorIds: string[];
};

// AI Channels & Models
export type AiChannel = {
  id: string;
  name: string;
  type: 'openai' | 'claude' | 'gemini' | 'ollama' | 'custom' | string;
  baseUrl: string;
  apiKey?: string;
  hasApiKey?: boolean;
  models?: string[];
  headers?: Record<string, string>;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ModelRole = 'summary' | 'state' | 'embedding' | 'rerank';

export type ModelBinding = {
  channelId: string;
  model: string;
};

export type ModelBindings = Record<ModelRole, ModelBinding>;

export type PromptPreset = {
  id: string;
  name: string;
  type: 'state' | 'summary';
  prompt: string;
  version: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// Character Profiles & Traces
export type CharacterProfileGroup = Record<string, string | string[] | undefined>;

export type CharacterProfile = {
  characterId: string;
  canonicalName: string;
  aliases: string[];
  basic: CharacterProfileGroup;
  appearance: CharacterProfileGroup;
  identity: CharacterProfileGroup;
  personality: CharacterProfileGroup;
  lifeDetails: string[];
  lockedPaths: string[];
  sourcePriority: Record<string, 'manual' | 'story' | 'card'>;
  source: { branchId: string; sourceFloorIds?: string[]; sourceHostChatIds?: string[]; sourceType?: string };
  updatedAt: string;
};

export type CharacterTrace = {
  characterId: string;
  longTermTendencies: Array<{ id: string; text: string; targetCharacterId?: string }>;
  currentSituations: Array<{ id: string; text: string; targetCharacterId?: string }>;
  visibility: Array<{ id: string; fact: string; knownBy: string[]; unknownBy?: string[] }>;
  affinity: { inner: number | null; outer: number | null; note?: string };
  source: { branchId: string; sourceFloorIds?: string[]; sourceHostChatIds?: string[]; sourceType?: string };
  updatedAt: string;
};

// Story
export type CalendarEntry = {
  id: string;
  dateKey: string;
  type: 'story' | 'festival' | 'birthday' | 'anniversary' | 'custom';
  title: string;
  description: string;
  confirmed?: boolean;
  sourceFloorIds?: string[];
};

export type Plotline = {
  id: string;
  name: string;
  stage: '起线' | '延展' | '成形' | '收束' | '淡出';
  timeAnchor?: string;
  currentState: string;
  nextStep: string;
  drivers?: string[];
  stalled?: boolean;
  pinned?: boolean;
  relatedCharacterIds?: string[];
  sourceFloorIds?: string[];
};

export type PlotPlan = {
  id: string;
  type: '明线' | '暗线' | '红线';
  title: string;
  time: '今天' | '明天' | '后天' | '未来';
  description: string;
  relatedPlotlineIds?: string[];
  pinned?: boolean;
  status: 'planned' | 'triggered' | 'cancelled' | 'expired';
  sourceFloorIds?: string[];
};

export type StoryState = {
  now: {
    currentTime?: string;
    ongoing: Array<{ id: string; title: string; description: string; relatedCharacterIds?: string[]; relatedPlotlineIds?: string[] }>;
    upcoming: Array<{ id: string; title: string; expectedTime?: string; description: string; relatedCharacterIds?: string[]; relatedPlotlineIds?: string[] }>;
  };
  calendar: CalendarEntry[];
  plotlines: Plotline[];
  plotPlans: PlotPlan[];
  source: { branchId: string; sourceFloorIds?: string[]; sourceHostChatIds?: string[]; sourceType?: string };
};

export type StateSnapshot = {
  schemaVersion: number;
  branchId: string;
  profiles: Record<string, CharacterProfile>;
  traces: Record<string, CharacterTrace>;
  story: StoryState;
  updatedAt: string;
};

export type CurrentStateResponse = {
  chatId: string;
  branchId: string;
  stateNodeId: string | null;
  stateFingerprint: string | null;
  headMessageIndex: number | null;
  latestMessageIndex: number | null;
  firstInvalidMessageIndex: number | null;
  firstLineageBreakMessageIndex: number | null;
  promptVersion: string;
  syncStatus: 'empty' | 'synced' | 'pending' | 'failed' | 'stale' | 'missing';
  snapshot: StateSnapshot;
};

// Long Memory
export type LongMemoryRecord = {
  memoryId: string;
  chatId: string;
  branchId: string;
  batchId: string;
  sliceId: string;
  startFloor: number;
  endFloor: number;
  batchStartFloor: number;
  batchEndFloor: number;
  title?: string;
  summary: string;
  tags: string[];
  characterIds: string[];
  plotlineIds: string[];
  narrativeTime?: string;
  sourceFloorIds: string[];
  batchDependencyFingerprint: string;
  endStateNodeId: string;
  endStateFingerprint: string;
  bm25Indexed: boolean;
  embeddingIndexed: boolean;
  stale: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecallDebugResponse = {
  query: string;
  candidates: {
    bm25: Array<{ memoryId: string; score: number }>;
    embedding: Array<{ memoryId: string; score: number }>;
    rrf: Array<{ memoryId: string; score: number }>;
    rerank: Array<{ memoryId: string; score: number }>;
  };
  final: LongMemoryRecord[];
  pack: {
    text: string;
    tokens: number;
    budget: number;
    count: number;
  };
  timings: {
    bm25Ms: number;
    embeddingMs: number;
    rrfMs: number;
    rerankMs: number;
    totalMs: number;
  };
};

// Settings
export type StateTaskSettings = {
  timeoutSec: number;
  maxAttempts: number;
  checkpointInterval: number;
};

export type LongMemorySettings = {
  summaryIntervalFloors: number;
  latestForcedCount: number;
};

export type RecallSettings = {
  bm25TopK: number;
  embeddingTopK: number;
  rrfK: number;
  rerankEnabled: boolean;
  rerankCandidateLimit: number;
  finalRecallCount: number;
  minTokenBudget: number;
  maxTokenBudget: number;
  contextRatioBudget: number;
};

export type FullAiSettingsResponse = {
  state: StateTaskSettings;
  longMemory: LongMemorySettings;
  recall: RecallSettings;
  limits: Record<string, { min: number; max: number }>;
  longMemoryLimits: Record<string, { min: number; max: number }>;
  recallLimits: Record<string, { min: number; max: number }>;
};

// Backwards-compatible alias
export type AiSettingsResponse = {
  longMemory: { summaryIntervalFloors: number };
  state?: StateTaskSettings;
  recall?: RecallSettings;
};

// State Tasks
export type StateTaskRecord = {
  jobId: string;
  chatId: string;
  branchId: string;
  floorId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  attempts: number;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
};
