import { backend } from '../api/backend-client.js';
export async function logBackendStatus() {
    try {
        const health = await backend.health();
        console.info('[WeaveMemory] backend ready', health);
    }
    catch (error) {
        console.warn('[WeaveMemory] backend unavailable', error);
    }
}
