import { generationInterceptor } from './host/generation.js';
import { bindHostEvents } from './host/events.js';
import { logBackendStatus } from './ui/status.js';
globalThis.weavememory_generation_interceptor = generationInterceptor;
function bootstrap() {
    try {
        bindHostEvents();
        void logBackendStatus();
        console.info('[WeaveMemory] frontend v0.1.0 loaded');
    }
    catch (error) {
        console.error('[WeaveMemory] frontend bootstrap failed', error);
    }
}
const api = globalThis.SillyTavern;
const context = api?.getContext?.();
const appReady = context?.eventTypes?.APP_READY ?? context?.eventTypes?.APP_INITIALIZED ?? context?.event_types?.APP_READY ?? context?.event_types?.APP_INITIALIZED;
if (appReady && context?.eventSource?.once)
    context.eventSource.once(appReady, bootstrap);
else
    queueMicrotask(bootstrap);
