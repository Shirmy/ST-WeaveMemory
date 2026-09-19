import { getSettings, updateSettings } from '../settings/store';
import { backend } from '../api/backend-client';
import { mainModal } from './main-modal';
import { showToast } from './toast';

const PANEL_ID = 'weavememory-phase9-settings';

export function mountSettingsPanel(): void {
  const root = document.querySelector('#extensions_settings2, #extensions_settings');
  if (!root || document.getElementById(PANEL_ID)) return;
  const settings = getSettings();
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.className = 'extension_settings';
  panel.innerHTML = `
    <hr>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <h4 style="margin:0;">织忆 (WeaveMemory)</h4>
      <button class="menu_button" id="wm-open-drawer-btn" style="background:var(--wm-primary, #6366f1); color:#fff; border:none; padding:4px 12px; border-radius:6px; cursor:pointer;">
        <i class="fa-solid fa-scroll"></i> 打开织忆控制面板
      </button>
    </div>
    <label>模式
      <select data-weavememory="mode"><option value="raw">原文</option><option value="summary">摘要（正则提取）</option></select>
    </label>
    <label>最近 AI 楼数 <input data-weavememory="count" type="number" min="1" max="20" step="1"></label>
    <label>摘要正则 <input data-weavememory="regex" type="text" placeholder="例如：\\[摘要\\]([\\s\\S]*?)\\[/摘要\\]"></label>
    <small>摘要正则匹配失败时，该楼自动使用原文，不会额外调用 AI。</small>
    <label>长期记忆总结间隔（AI 楼） <input data-weavememory="long-memory-interval" type="number" min="1" max="500" step="1"></label>
  `;
  root.append(panel);

  panel.querySelector('#wm-open-drawer-btn')?.addEventListener('click', () => {
    void mainModal.open();
  });

  const mode = panel.querySelector<HTMLSelectElement>('[data-weavememory="mode"]')!;
  const count = panel.querySelector<HTMLInputElement>('[data-weavememory="count"]')!;
  const regex = panel.querySelector<HTMLInputElement>('[data-weavememory="regex"]')!;
  const longMemoryInterval = panel.querySelector<HTMLInputElement>('[data-weavememory="long-memory-interval"]')!;

  mode.value = settings.recentContextMode;
  count.value = String(settings.recentFloorCount);
  regex.value = settings.recentSummaryRegex;
  longMemoryInterval.value = String(settings.longMemoryIntervalFloors);
  window.addEventListener('weavememory-settings-changed', () => {
    const current = getSettings();
    mode.value = current.recentContextMode;
    count.value = String(current.recentFloorCount);
    regex.value = current.recentSummaryRegex;
    longMemoryInterval.value = String(current.longMemoryIntervalFloors);
  });

  void backend.getAiSettings().then(result => {
    longMemoryInterval.value = String(result.longMemory.summaryIntervalFloors);
    updateSettings({ longMemoryIntervalFloors: result.longMemory.summaryIntervalFloors });
  }).catch(error => console.warn('[WeaveMemory] long-memory settings unavailable', error));

  mode.addEventListener('change', () => updateSettings({ recentContextMode: mode.value === 'summary' ? 'summary' : 'raw' }));
  count.addEventListener('change', () => updateSettings({ recentFloorCount: Number(count.value) }));
  regex.addEventListener('change', () => updateSettings({ recentSummaryRegex: regex.value }));
  longMemoryInterval.addEventListener('change', () => {
    const value = Math.min(500, Math.max(1, Number(longMemoryInterval.value)));
    longMemoryInterval.value = String(value);
    void backend.saveLongMemorySettings(value).then(() => updateSettings({ longMemoryIntervalFloors: value })).catch(error => { longMemoryInterval.value = String(getSettings().longMemoryIntervalFloors); showToast(error instanceof Error ? error.message : String(error), 'error'); });
  });
}
