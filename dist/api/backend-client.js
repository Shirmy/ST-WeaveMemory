const BASE = '/api/plugins/weavememory';
async function request(path, init) {
    const response = await fetch(`${BASE}${path}`, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        ...init
    });
    if (!response.ok)
        throw new Error(`WeaveMemory backend ${response.status}: ${await response.text()}`);
    return response.json();
}
export const backend = {
    health: () => request('/health'),
    prepareGeneration: (payload) => request('/generation/prepare', {
        method: 'POST', body: JSON.stringify(payload)
    }),
    finalizeFloor: (payload) => request('/floor/finalize', {
        method: 'POST', body: JSON.stringify(payload)
    })
};
