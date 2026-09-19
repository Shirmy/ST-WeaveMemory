export type HealthResponse = {
  ok: boolean;
  plugin: 'weavememory';
  backendVersion: string;
  apiVersion: number;
  schemaVersion: number;
  capabilities: string[];
  database: { available: boolean; journalMode: string; databasePath: string };
};

export type DebugResponse = {
  generation?: { at: string; longMemory: string; currentState: string; estimatedTokens: number };
  summary?: { at: string; durationMs: number; promptVersion: string; model: string; channelId: string };
  recall?: { at: string; timings?: { bm25Ms: number; embeddingMs: number; rrfMs: number; rerankMs: number; totalMs: number }; packMs?: number; errors: Array<{ source: string; code: string; message: string }> };
  stateTask: { durationMs: number; model: string; channelId: string; promptVersion: string } | null;
  database: { available: boolean; journalMode: string; databasePath: string };
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
  channelId: string;
  name: string;
  apiType: 'openai-compatible';
  baseUrl: string;
  hasApiKey: boolean;
  timeout: number | null;
  headers: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type ModelRole = 'summary' | 'state' | 'embedding' | 'rerank';

export type ModelBinding = {
  role: ModelRole;
  channelId: string;
  model: string;
  updatedAt: string;
};

export type ModelBindings = Record<ModelRole, ModelBinding | null>;

export type PromptPreset = {
  presetId: string;
  promptType: 'state' | 'summary';
  name: string;
  content: { system: string; task: string };
  version: number;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
};

// State types are synchronized from the server schema, not independently defined.
export type { CharacterProfile, CharacterTrace, CalendarEntry, Plotline, PlotPlan, StoryState, StateSnapshot } from './state-schema';
import type { StateSnapshot } from './state-schema';

export type CurrentStateResponse = {
  relevantCharacterIds: string[];
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

export type FusedMemory = { memory: LongMemoryRecord; rrfScore: number; ranks: Partial<Record<'bm25' | 'embedding', number>>; scores: Partial<Record<'bm25' | 'embedding', number>> };
export type RecallDebugResponse = {
  query: string;
  settings: RecallSettings;
  bm25: Array<{ memory: LongMemoryRecord; score: number }>;
  embedding: Array<{ memory: LongMemoryRecord; score: number }>;
  rrf: FusedMemory[];
  rerank: { status: 'applied' | 'disabled' | 'not_configured' | 'no_candidates' | 'skipped_within_final' | 'failed'; documentCount: number; model: string | null; error?: string; candidates: Array<FusedMemory & { rerankScore: number }> };
  final: FusedMemory[];
  errors: Array<{ source: string; code: string; message: string }>;
  pack: { memories: Array<{ memory: LongMemoryRecord; source: 'fixed_recent' | 'high_relevance'; priority: 'fixed_recent' | 'high_relevance'; fused?: FusedMemory; estimatedTokens: number }>; text: string; tokenLimit: number; estimatedTokens: number; currentStateTokens: number; diagnostics: { recallCandidateCount: number; fixedRecentCandidateCount: number; deduplicatedCount: number; candidateCount: number; fixedRecentCount: number; packedFixedRecentCount: number; packedHighRelevanceCount: number; skippedByTokenBudget: number; skippedByCount: number; packedCount: number } };
  timings: { bm25Ms: number; embeddingMs: number; rrfMs: number; rerankMs: number; packMs: number; totalMs: number };
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
  tokenRatio: number;
  minTokenBudget: number;
  maxTokenBudget: number;
};

export type FullAiSettingsResponse = {
  state: StateTaskSettings;
  longMemory: LongMemorySettings;
  recall: RecallSettings;
  limits: Record<string, { min: number; max: number }>;
  longMemoryLimits: Record<string, { min: number; max: number }>;
  recallLimits: Record<string, { min: number; max: number }>;
};

export type AiSettingsResponse = Pick<FullAiSettingsResponse, 'state' | 'longMemory' | 'recall'>;

// State Tasks
export type StateTaskRecord = {
  jobId: string;
  chatId: string;
  branchId: string;
  floorId: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'stale';
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};
