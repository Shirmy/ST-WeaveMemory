// Generated from ST-WeaveMemory-Server/src/state/schema.ts; contract test verifies exact synchronization.
export const STATE_SCHEMA_VERSION = 1;

export type StateRecordSource = {
  branchId: string;
  sourceFloorIds: string[];
  sourceHostChatIds: string[];
  sourceType?: 'manual' | 'story' | 'card';
};

export type CharacterProfile = {
  characterId: string;
  canonicalName: string;
  aliases: string[];
  basic: { gender?: string; age?: string; birthday?: string; race?: string; notes?: string };
  appearance: {
    height?: string; build?: string; face?: string; hair?: string; eyes?: string;
    distinctiveFeatures?: string[]; clothingStyle?: string; notes?: string;
  };
  identity: {
    occupation?: string; organizations?: string[]; socialIdentity?: string[];
    background?: string; importantRelations?: string[];
  };
  personality: {
    coreTraits?: string[]; behaviorStyle?: string[]; expressionHabits?: string[];
    likes?: string[]; dislikes?: string[]; principles?: string[];
  };
  lifeDetails: string[];
  nsfw?: Record<string, unknown>;
  lockedPaths: string[];
  sourcePriority: Record<string, 'manual' | 'story' | 'card'>;
  source: StateRecordSource;
  updatedAt: string;
};

export type CharacterTrace = {
  characterId: string;
  longTermTendencies: Array<{ id: string; text: string; targetCharacterId?: string }>;
  currentSituations: Array<{ id: string; text: string; targetCharacterId?: string }>;
  visibility: Array<{ id: string; fact: string; knownBy: string[]; unknownBy?: string[] }>;
  affinity: { inner: -2 | -1 | 0 | 1 | 2 | null; outer: -2 | -1 | 0 | 1 | 2 | null; note?: string };
  source: StateRecordSource;
  updatedAt: string;
};

export type CalendarEntry = {
  id: string;
  dateKey: string;
  type: 'story' | 'festival' | 'birthday' | 'anniversary' | 'custom';
  title: string;
  description?: string;
  relatedCharacterIds?: string[];
  sourceFloorIds?: string[];
  sourceHostChatIds?: string[];
  confirmed: boolean;
};

export type Plotline = {
  id: string;
  name: string;
  stage: '起线' | '延展' | '成形' | '收束' | '淡出';
  timeAnchor?: string;
  currentState: string;
  nextStep?: string;
  drivers?: string[];
  stalled?: boolean;
  pinned?: boolean;
  relatedCharacterIds?: string[];
  sourceFloorIds?: string[];
  sourceHostChatIds?: string[];
  updatedAt: string;
};

export type PlotPlan = {
  id: string;
  type: '明线' | '暗线' | '红线';
  title: string;
  description?: string;
  time: '今天' | '明天' | '后天' | '未来';
  location?: string;
  threadDynamic?: string;
  pinned?: boolean;
  relatedPlotlineIds?: string[];
  relatedCharacterIds?: string[];
  status: 'planned' | 'triggered' | 'cancelled' | 'expired';
  sourceFloorIds?: string[];
  sourceHostChatIds?: string[];
  createdAt: string;
  updatedAt: string;
};

export type StoryState = {
  now: {
    currentTime?: string;
    ongoing: Array<{ id: string; title: string; description?: string; relatedCharacterIds?: string[]; relatedPlotlineIds?: string[] }>;
    upcoming: Array<{ id: string; title: string; description?: string; expectedTime?: string; relatedCharacterIds?: string[]; relatedPlotlineIds?: string[] }>;
  };
  calendar: CalendarEntry[];
  plotlines: Plotline[];
  plotPlans: PlotPlan[];
  source: StateRecordSource;
};

export type StateSnapshot = {
  schemaVersion: number;
  branchId: string;
  profiles: Record<string, CharacterProfile>;
  traces: Record<string, CharacterTrace>;
  story: StoryState;
  updatedAt: string;
};

export type StateAnalysisRequest = {
  protocolVersion: number;
  schemaVersion: number;
  /** Content hash of the active state prompt preset (see ai/prompts/state-prompt.ts computePromptVersion). */
  statePromptVersion: string;
  floor: { hostChatId: string; branchId: string; floorId: string; messageIndex: number; swipeId: number | null; content: string };
  previousRelevantState: Pick<StateSnapshot, 'profiles' | 'traces' | 'story'>;
  lockedPaths: string[];
  knownCharacters: Array<{ characterId: string; canonicalName: string; aliases: string[] }>;
};

export type StateAnalysisBasicCandidate = { gender?: string; age?: string; birthday?: string; race?: string; notes?: string };
export type StateAnalysisAppearanceCandidate = { height?: string; build?: string; face?: string; hair?: string; eyes?: string; distinctiveFeatures?: string[]; clothingStyle?: string; notes?: string };
export type StateAnalysisIdentityCandidate = { occupation?: string; organizations?: string[]; socialIdentity?: string[]; background?: string; importantRelations?: string[] };
export type StateAnalysisPersonalityCandidate = { coreTraits?: string[]; behaviorStyle?: string[]; expressionHabits?: string[]; likes?: string[]; dislikes?: string[]; principles?: string[] };
export type StateAnalysisAffinityCandidate = { inner?: -2 | -1 | 0 | 1 | 2 | null; outer?: -2 | -1 | 0 | 1 | 2 | null; note?: string };

export type StateAnalysisProfileCandidate = {
  characterId?: string;
  canonicalName?: string;
  aliases?: string[];
  basic?: StateAnalysisBasicCandidate;
  appearance?: StateAnalysisAppearanceCandidate;
  identity?: StateAnalysisIdentityCandidate;
  personality?: StateAnalysisPersonalityCandidate;
  lifeDetails?: string[];
  nsfw?: Record<string, unknown>;
  lockedPaths?: string[];
  sourcePriority?: Record<string, 'manual' | 'story' | 'card'>;
  updatedAt?: string;
};

export type StateAnalysisTraceCandidate = {
  characterId?: string;
  longTermTendencies?: CharacterTrace['longTermTendencies'];
  currentSituations?: CharacterTrace['currentSituations'];
  visibility?: CharacterTrace['visibility'];
  affinity?: StateAnalysisAffinityCandidate;
  updatedAt?: string;
};

export type StateAnalysisStoryCandidate = {
  now?: {
    currentTime?: string;
    ongoing?: StoryState['now']['ongoing'];
    upcoming?: StoryState['now']['upcoming'];
  };
  calendar?: CalendarEntry[];
  plotlines?: Plotline[];
  plotPlans?: PlotPlan[];
};

export type StateAnalysisCandidate = {
  profiles?: Record<string, StateAnalysisProfileCandidate>;
  traces?: Record<string, StateAnalysisTraceCandidate>;
  story?: StateAnalysisStoryCandidate;
  touchedCharacterIds?: string[];
  notes?: string[];
};

export type StateAnalysisResponse = StateAnalysisCandidate;

export type StateSourceContext = {
  branchId: string;
  floorId?: string;
  hostChatId?: string;
  sourceType?: StateRecordSource['sourceType'];
};

export type ManualStateEdit = {
  branchId: string;
  hostChatId?: string;
  target: 'profile' | 'trace' | 'story';
  entityId?: string;
  path: string;
  value: unknown;
  source: StateRecordSource;
  updatedAt: string;
};

export type KnownCharacter = { characterId: string; canonicalName: string; aliases: string[] };
