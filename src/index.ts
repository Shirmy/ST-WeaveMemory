import { generationInterceptor } from './host/generation';
import { bindHostEvents } from './host/events';
import { logBackendStatus } from './ui/status';
import { mountSettingsPanel } from './ui/settings';
import { injectStyles } from './ui/styles-inline';
import { mountTrigger } from './ui/trigger';
import { mainModal } from './ui/main-modal';
import { currentChatId, getContext } from './host/context';

(globalThis as any).weavememory_generation_interceptor = generationInterceptor;
(globalThis as any).weavememory_open_panel = () => mainModal.open();

function bootstrap(): void {
  try {
    injectStyles();
    bindHostEvents();
    mountSettingsPanel();
    mountTrigger();
    void logBackendStatus();

    const context = getContext();
    const chatId = currentChatId(context);
    if (chatId) {
      void mainModal.setChatContext(chatId);
    }

    console.info('[WeaveMemory] frontend v0.1.0 and UI modules loaded');
  } catch (error) {
    console.error('[WeaveMemory] frontend bootstrap failed', error);
  }
}

const api = (globalThis as any).SillyTavern;
const context = api?.getContext?.();
const appReady = context?.eventTypes?.APP_READY ?? context?.eventTypes?.APP_INITIALIZED ?? context?.event_types?.APP_READY ?? context?.event_types?.APP_INITIALIZED;
if (appReady && context?.eventSource?.once) context.eventSource.once(appReady, bootstrap);
else queueMicrotask(bootstrap);
