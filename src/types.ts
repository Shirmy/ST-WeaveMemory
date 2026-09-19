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
