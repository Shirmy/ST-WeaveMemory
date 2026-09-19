import { generationInterceptor } from './host/generation';
import { bindHostEvents } from './host/events';
import { logBackendStatus } from './ui/status';
import { mountSettingsPanel } from './ui/settings';

(globalThis as any).weavememory_generation_interceptor = generationInterceptor;

function bootstrap(): void {
  try {
    bindHostEvents();
    mountSettingsPanel();
    void logBackendStatus();
    console.info('[WeaveMemory] frontend v0.1.0 loaded');
  } catch (error) {
    console.error('[WeaveMemory] frontend bootstrap failed', error);
  }
}

const api = (globalThis as any).SillyTavern;
const context = api?.getContext?.();
const appReady = context?.eventTypes?.APP_READY ?? context?.eventTypes?.APP_INITIALIZED ?? context?.event_types?.APP_READY ?? context?.event_types?.APP_INITIALIZED;
if (appReady && context?.eventSource?.once) context.eventSource.once(appReady, bootstrap);
else queueMicrotask(bootstrap);
