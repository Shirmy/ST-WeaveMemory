import { characterCardId, previousAssistantIndex, readMvuExternalState } from './external-state.js';

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(message); }

const mapping = [{ id: 'location', source: 'mvu' as const, externalPath: '角色.沈砚.当前位置', weaveTarget: { domain: 'trace' as const, characterId: 'shenyan', field: 'currentSituations', semanticKey: 'location' }, mode: 'equivalent' as const, enabled: true }];
const characters = [{ avatar: 'card-a.png' }, { avatar: 'card-b.png' }];
assert(characterCardId({ characterId: 0, groupId: null, characters }) === 'card-a.png', 'single card A must resolve avatar');
assert(characterCardId({ characterId: 1, group_id: null, characters }) === 'card-b.png', 'single card B must resolve avatar');
assert(characterCardId({ characterId: 0, selected_group: null, characters }) === 'card-a.png', 'null selected group is not a group chat');
assert(characterCardId({ characterId: 0, characters }) === 'card-a.png', 'undefined group is not a group chat');
assert(characterCardId({ characterId: 0, groupId: '', characters }) === 'card-a.png', 'empty group is not a group chat');
assert(characterCardId({ characterId: 0, groupId: 'group-a', characters }) === null, 'groupId group chat must fail open');
assert(characterCardId({ characterId: 0, group_id: 'group-a', characters }) === null, 'group_id group chat must fail open');
assert(characterCardId({ characterId: 0, selected_group: 'group-a', characters }) === null, 'selected_group group chat must fail open');

const context = { characterId: 0, characters, chat: [{ is_user: false, is_system: false, swipe_id: 0, variables: [{ stat_data: { location: 'A' } }, { stat_data: { location: 'B' } }] }, { is_system: true, is_user: false }, { is_user: true }] };
assert(previousAssistantIndex(context, 2) === 0, 'system message must be excluded');
const swipeMessage = context.chat[0] as { swipe_id: number; variables: Array<{ stat_data: { location: string } }> };
(globalThis as typeof globalThis & { Mvu?: unknown }).Mvu = { getMvuData: () => ({ stat_data: swipeMessage.variables[swipeMessage.swipe_id ?? 0].stat_data }) };
assert((readMvuExternalState(context, 0, mapping).statData as { location: string }).location === 'A', '70A active swipe must read A');
swipeMessage.swipe_id = 1;
assert((readMvuExternalState(context, 0, mapping).statData as { location: string }).location === 'B', '70B active swipe must read B');
swipeMessage.swipe_id = 0;
assert((readMvuExternalState(context, 0, mapping).statData as { location: string }).location === 'A', 'switching back to 70A must restore A');
console.log('external state acceptance passed');
