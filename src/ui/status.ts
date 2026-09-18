import { backend } from '../api/backend-client';

export async function logBackendStatus(): Promise<void> {
  try {
    const health = await backend.health();
    console.info('[WeaveMemory] backend ready', health);
  } catch (error) {
    console.warn('[WeaveMemory] backend unavailable', error);
  }
}
