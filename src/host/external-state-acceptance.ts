import { characterCardId, previousAssistantIndex, readMvuExternalState } from './external-state.js';

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(message); }

const mapping = [{ id: 'location', source: 'mvu' as const, externalPath: '角色.沈砚.当前位置', weaveTarget: { domain: 'trace' as const, characterId: 'shenyan', field: 'currentSituations', semanticKey: 'location' }, mode: 'equivalent' as const, enabled: true }];
const context = { characterId: 0, characters: [{ avatar: 'card-a.png' }, { avatar: 'card-b.png' }], chat: [{ is_user: false, is_system: false, swipe_id: 0, variables: [{ stat_data: { location: 'A' } }, { stat_data: { location: 'B' } }] }, { is_system: true, is_user: false }, { is_user: true }] };
let active = 0;
(globalThis as typeof globalThis & { Mvu?: unknown }).Mvu = { getMvuData: () => ({ stat_data: { location: active === 0 ? 'A' : 'B' } }) };
assert(previousAssistantIndex(context, 2) === 0, 'system message must be excluded');
assert(characterCardId(context) === 'card-a.png', 'numeric character index must resolve avatar');
assert(readMvuExternalState(context, 0, mapping).statData !== null, 'swipe 0 must be readable');
active = 1; context.chat[0].swipe_id = 1;
assert((readMvuExternalState(context, 0, mapping).statData as { location: string }).location === 'B', 'swipe 1 must be readable');
active = 0; context.chat[0].swipe_id = 0;
assert((readMvuExternalState(context, 0, mapping).statData as { location: string }).location === 'A', 'switching back must restore swipe 0');
assert(characterCardId({ characterId: 0, characters: context.characters, groupId: 'group-a' }) === null, 'group mapping must fail open');
assert(characterCardId({ characterId: 1, characters: context.characters }) === 'card-b.png', 'card B must use its own avatar scope');
console.log('external state acceptance passed');
