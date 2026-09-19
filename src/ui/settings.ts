import { getSettings, updateSettings } from '../settings/store';
import { backend } from '../api/backend-client';

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
    <h4>织忆 · 近期上下文</h4>
    <label>模式
      <select data-weavememory="mode"><option value="raw">原文</option><option value="summary">摘要（正则提取）</option></select>
    </label>
    <label>最近 AI 楼数 <input data-weavememory="count" type="number" min="1" max="20" step="1"></label>
    <label>摘要正则 <input data-weavememory="regex" type="text" placeholder="例如：\\[摘要\\]([\\s\\S]*?)\\[/摘要\\]"></label>
    <small>摘要正则匹配失败时，该楼自动使用原文，不会额外调用 AI。</small>`;
  root.append(panel);
  panel.insertAdjacentHTML('beforeend', '<label>长期记忆总结间隔（AI 楼） <input data-weavememory="long-memory-interval" type="number" min="1" max="500" step="1"></label>');
  const mode = panel.querySelector<HTMLSelectElement>('[data-weavememory="mode"]')!;
  const count = panel.querySelector<HTMLInputElement>('[data-weavememory="count"]')!;
  const regex = panel.querySelector<HTMLInputElement>('[data-weavememory="regex"]')!;
  const longMemoryInterval = panel.querySelector<HTMLInputElement>('[data-weavememory="long-memory-interval"]')!;
  mode.value = settings.recentContextMode;
  count.value = String(settings.recentFloorCount);
  regex.value = settings.recentSummaryRegex;
  longMemoryInterval.value = String(settings.longMemoryIntervalFloors);
  void backend.getAiSettings().then(result => { longMemoryInterval.value = String(result.longMemory.summaryIntervalFloors); updateSettings({ longMemoryIntervalFloors: result.longMemory.summaryIntervalFloors }); }).catch(error => console.warn('[WeaveMemory] long-memory settings unavailable', error));
  mode.addEventListener('change', () => updateSettings({ recentContextMode: mode.value === 'summary' ? 'summary' : 'raw' }));
  count.addEventListener('change', () => updateSettings({ recentFloorCount: Number(count.value) }));
  regex.addEventListener('change', () => updateSettings({ recentSummaryRegex: regex.value }));
  longMemoryInterval.addEventListener('change', () => { const value = Math.min(500, Math.max(1, Number(longMemoryInterval.value))); longMemoryInterval.value = String(value); updateSettings({ longMemoryIntervalFloors: value }); void backend.saveLongMemorySettings(value).catch(error => console.warn('[WeaveMemory] long-memory settings save failed', error)); });
}
