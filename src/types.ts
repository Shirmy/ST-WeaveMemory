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
};

export type GenerationPrepareResponse = {
  ready: boolean;
  reason?: string;
  longMemory: string;
  currentState: string;
  diagnostics: {
    memoryCount: number;
    memoryTokens: number;
    stateTokens: number;
  };
};

export type FloorFinalizeRequest = {
  chatId: string;
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

export type BranchResponse = {
  branch: BranchRecord;
  activeFloorIds: string[];
};
