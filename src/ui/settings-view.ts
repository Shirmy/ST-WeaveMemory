import { backend, type ModelBindingInput } from '../api/backend-client';
import type { AiChannel, FullAiSettingsResponse, HealthResponse, ModelBindings, ModelRole, PromptPreset } from '../types';
import { escapeHtml as esc } from './text';
import { getSettings, updateSettings } from '../settings/store';
import { showToast } from './toast';
import { clearMemoryPrompts } from '../injection/prompts';

const channelModelCache = new Map<string, string[]>();

export class SettingsView {
  private channels: AiChannel[] = [];
  private bindings: ModelBindings = { summary: null, state: null, embedding: null, rerank: null };
  private modelCache = channelModelCache;
  private activePresets = { state: '', summary: '' };
  private promptVersions = { state: '', summary: '' };
  private prompts: { state: PromptPreset[]; summary: PromptPreset[] } = { state: [], summary: [] };
  private aiSettings: FullAiSettingsResponse | null = null;
  private health: HealthResponse | null = null;
  private currentSubNav: 'channels' | 'bindings' | 'prompts' | 'params' = 'channels';

  constructor(private readonly container: HTMLElement) {}

  syncLocalSettings(): void {
    const settings = getSettings();
    const values: Record<string, string> = { 'wm-basic-recent': settings.recentContextMode, 'wm-basic-regex': settings.recentSummaryRegex, 'wm-basic-floors': String(settings.recentFloorCount), 'wm-cfg-mem-interval': String(settings.longMemoryIntervalFloors) };
    for (const [id, value] of Object.entries(values)) {
      const input = this.container.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`);
      if (input) input.value = value;
    }
  }

  async loadData(): Promise<void> {
    try {
      const [channelsRes, bindingsRes, statePromptsRes, summaryPromptsRes, aiSettingsRes, health] = await Promise.all([
        backend.listChannels(),
        backend.getModelBindings(),
        backend.listPrompts('state'),
        backend.listPrompts('summary'),
        backend.getAiSettings(), backend.health()
      ]);

      this.channels = channelsRes.channels || [];
      this.bindings = bindingsRes.bindings || this.bindings;
      this.prompts.state = statePromptsRes.presets || [];
      this.prompts.summary = summaryPromptsRes.presets || [];
      this.aiSettings = aiSettingsRes;
      this.health = health;
      this.activePresets = { state: statePromptsRes.activePresetId, summary: summaryPromptsRes.activePresetId };
      this.promptVersions = { state: statePromptsRes.promptVersion, summary: summaryPromptsRes.promptVersion };
      this.render();
    } catch (err) {
      showToast((err instanceof Error ? err.message : String(err)) || '加载设置失败', 'error');
    }
  }

  render(): void {
    this.container.innerHTML = `
      <!-- Settings Sub-Nav -->
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--wm-bg); padding:10px 16px; border-radius:var(--wm-radius); border:1px solid var(--wm-border);">
        <div style="display:flex; gap:6px;">
          <button class="wm-sub-btn ${this.currentSubNav === 'channels' ? 'wm-active' : ''}" id="wm-set-tab-channels"><i class="fa-solid fa-server"></i> AI 渠道管理 (${this.channels.length})</button>
          <button class="wm-sub-btn ${this.currentSubNav === 'bindings' ? 'wm-active' : ''}" id="wm-set-tab-bindings"><i class="fa-solid fa-link"></i> 模型绑定</button>
          <button class="wm-sub-btn ${this.currentSubNav === 'prompts' ? 'wm-active' : ''}" id="wm-set-tab-prompts"><i class="fa-solid fa-file-code"></i> Prompt 预设</button>
          <button class="wm-sub-btn ${this.currentSubNav === 'params' ? 'wm-active' : ''}" id="wm-set-tab-params"><i class="fa-solid fa-sliders"></i> 引擎与召回参数</button>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:16px;">
        ${this.renderCurrentSubNavContent()}
      </div>
    `;

    this.bindEvents();
  }

  private renderCurrentSubNavContent(): string {
    switch (this.currentSubNav) {
      case 'channels': return this.renderChannelsTab();
      case 'bindings': return this.renderBindingsTab();
      case 'prompts': return this.renderPromptsTab();
      case 'params': return this.renderParamsTab();
    }
  }

  // --- 1. AI 渠道管理 (参考构画多渠道设计) ---
  private renderChannelsTab(): string {
    return `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:13px; color:var(--wm-text-muted);">支持多个独立 OpenAI 兼容渠道</span>
        <button class="wm-btn wm-btn-primary" id="wm-add-channel-btn"><i class="fa-solid fa-plus"></i> 新建渠道</button>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px;">
        ${this.channels.length === 0 ? '<div class="wm-card" style="text-align:center; padding:32px; color:var(--wm-text-muted);">暂无已配置渠道，请点击上方“新建渠道”进行添加</div>' : ''}
        ${this.channels.map(c => `
          <div class="wm-card" data-channel-id="${esc(c.channelId)}">
            <div class="wm-card-header">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-weight:600; font-size:15px;">${esc(c.name)}</span>
                <span class="wm-status-badge synced" style="font-size:10px;">${esc(c.apiType)}</span>
                <span style="font-size:12px; color:var(--wm-text-muted);">${esc(c.baseUrl)}</span>
              </div>
              <div class="wm-drawer-actions">
                <button class="wm-btn wm-btn-secondary wm-test-channel-btn" data-id="${esc(c.channelId)}" style="padding:4px 10px; font-size:12px;">
                  <i class="fa-solid fa-plug"></i> 测试连接
                </button>
                <button class="wm-btn wm-btn-secondary wm-fetch-models-btn" data-id="${esc(c.channelId)}" style="padding:4px 10px; font-size:12px;">
                  <i class="fa-solid fa-cloud-arrow-down"></i> 拉取模型
                </button>
                <button class="wm-icon-btn wm-del-channel-btn" data-id="${esc(c.channelId)}" title="删除渠道"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="wm-form-group">
                <span class="wm-label">渠道名称</span>
                <input type="text" class="wm-input wm-chan-name" data-id="${esc(c.channelId)}" value="${esc(c.name)}" />
              </div>
              <div class="wm-form-group">
                <span class="wm-label">接口地址 (Base URL)</span>
                <input type="text" class="wm-input wm-chan-url" data-id="${esc(c.channelId)}" value="${esc(c.baseUrl)}" />
              </div>
              <div class="wm-form-group">
                <span class="wm-label">API Key ${c.hasApiKey ? '(已安全保存在服务端)' : ''}</span>
                <input type="password" class="wm-input wm-chan-key" data-id="${esc(c.channelId)}" placeholder="${c.hasApiKey ? '留空保持已有 Key' : '输入 API Key...'}" />
              </div>
              <div class="wm-form-group">
                <span class="wm-label">模型列表 (${this.modelCache.get(c.channelId)?.length || 0} 个已知模型)</span>
                <input type="text" class="wm-input wm-chan-models" data-id="${esc(c.channelId)}" readonly value="${esc((this.modelCache.get(c.channelId) || []).join(', '))}" placeholder="模型列表 (以逗号分隔)" />
              </div>
            </div>

            <label>协议 <select class="wm-select"><option>openai-compatible</option></select></label>
            <label>超时（秒）<input class="wm-input wm-chan-timeout" data-id="${esc(c.channelId)}" type="number" value="${c.timeout ?? ''}" /></label>
            <label><input class="wm-chan-clear-key" data-id="${esc(c.channelId)}" type="checkbox" /> 清除已保存的 API Key</label>
            <label>Headers（每行 名称: 值）<textarea class="wm-textarea wm-chan-headers" data-id="${esc(c.channelId)}">${esc(Object.entries(c.headers).map(([key, value]) => key + ': ' + value).join('\n'))}</textarea></label>
            <div style="display:flex; justify-content:flex-end;">
              <button class="wm-btn wm-btn-primary wm-save-channel-btn" data-id="${esc(c.channelId)}"><i class="fa-solid fa-floppy-disk"></i> 保存渠道修改</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- 2. 模型绑定 (Model Bindings: 总结、状态、向量、重排) ---
  private renderBindingsTab(): string {
    const roles: Array<{ role: ModelRole; title: string; desc: string; icon: string }> = [
      { role: 'summary', title: '记忆总结模型 (Summary)', desc: '负责对话分片总结与长期记忆归纳提取', icon: 'fa-book' },
      { role: 'state', title: '状态分析模型 (State)', desc: '负责每轮对话后提取人物属性变化、剧情线与处境演进', icon: 'fa-user-gear' },
      { role: 'embedding', title: '向量嵌入模型 (Embedding)', desc: '负责将记忆文本向量化，支持语义搜索', icon: 'fa-draw-polygon' },
      { role: 'rerank', title: '交叉重排模型 (Rerank)', desc: '负责召回候选二次深度重打分 (可使用 BAAI/bge-reranker 等)', icon: 'fa-arrow-down-wide-short' }
    ];

    return `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:13px; color:var(--wm-text-muted);">为四大核心职责独立分配不同渠道与模型，支持强力大模型做状态、轻量模型做总结、专用模型做嵌入与重排</span>
        <button class="wm-btn wm-btn-primary" id="wm-save-bindings-btn"><i class="fa-solid fa-floppy-disk"></i> 保存所有绑定</button>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        ${roles.map(r => {
          const binding = this.bindings[r.role] || { channelId: '', model: '' };
          const selectedChan = this.channels.find(c => c.channelId === binding.channelId);
          const availableModels = this.modelCache.get(selectedChan?.channelId ?? '') || [];

          return `
            <div class="wm-card">
              <div class="wm-card-header">
                <span class="wm-card-title"><i class="fa-solid ${r.icon}"></i> ${r.title}</span>
                <button class="wm-btn wm-btn-secondary wm-test-model-btn" data-role="${r.role}" style="padding:2px 8px; font-size:11px;">测试可用性</button>
              </div>
              <div style="font-size:12px; color:var(--wm-text-muted);">${r.desc}</div>

              <div class="wm-form-group">
                <span class="wm-label">选择渠道</span>
                <select class="wm-select wm-binding-chan" data-role="${r.role}">
                  <option value="">-- 请选择渠道 --</option>
                  ${this.channels.map(c => `<option value="${esc(c.channelId)}" ${c.channelId === binding.channelId ? 'selected' : ''}>${esc(c.name)} (${esc(c.apiType)})</option>`).join('')}
                </select>
              </div>

              <div class="wm-form-group">
                <span class="wm-label">选择或输入模型名称</span>
                <input type="text" class="wm-input wm-binding-model" data-role="${r.role}" list="models-list-${r.role}" value="${esc(binding.model)}" placeholder="例如: gpt-4o, claude-3-5-sonnet..." />
                <datalist id="models-list-${r.role}">
                  ${availableModels.map(m => `<option value="${esc(m)}">`).join('')}
                </datalist>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // --- 3. Prompt 预设管理 ---
  private renderPromptsTab(): string {
    const renderPromptList = (type: 'state' | 'summary', title: string, list: PromptPreset[]) => `
      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-code"></i> ${title} (${list.length})</span>
          <div style="display:flex; gap:6px;">
            <button class="wm-btn wm-btn-secondary wm-reset-prompt-btn" data-type="${type}" style="padding:4px 8px; font-size:12px;"><i class="fa-solid fa-arrow-rotate-left"></i> 恢复默认</button>
            <button class="wm-btn wm-btn-secondary wm-import-prompt-btn" data-type="${type}">导入预设</button>
          </div>
        </div>

        <small>当前依赖版本：${esc(this.promptVersions[type])}</small>
        ${list.length === 0 ? '<div style="color:var(--wm-text-muted); font-size:12px;">暂无预设</div>' : ''}
        ${list.map(p => `
          <div style="display:flex; flex-direction:column; gap:8px; background:var(--wm-bg-alt); padding:12px; border-radius:6px; border:1px solid var(--wm-border);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:600;">${esc(p.name)} (v${p.version})</span>
              <div style="display:flex; align-items:center; gap:6px;">
                ${this.activePresets[type] === p.presetId ? '<span class="wm-status-badge synced" style="font-size:10px;">当前生效</span>' : `
                  <button class="wm-btn wm-btn-secondary wm-activate-prompt-btn" data-type="${type}" data-id="${esc(p.presetId)}" style="padding:2px 8px; font-size:11px;">设为生效</button>
                `}
                <button class="wm-btn wm-btn-secondary wm-test-prompt-btn" data-id="${esc(p.presetId)}" data-type="${type}" style="padding:2px 8px; font-size:11px;">测试 Prompt</button>
                <button class="wm-btn wm-btn-secondary wm-export-prompt-btn" data-id="${esc(p.presetId)}" data-type="${type}">导出</button>
                ${p.isBuiltin ? '' : `<button class="wm-btn wm-btn-secondary wm-delete-prompt-btn" data-id="${esc(p.presetId)}">删除</button>`}
              </div>
            </div>
            <label>名称 <input class="wm-input wm-prompt-name" data-id="${esc(p.presetId)}" value="${esc(p.name)}" /></label>
            <label>System<textarea class="wm-textarea wm-prompt-system" data-id="${esc(p.presetId)}">${esc(p.content.system)}</textarea></label>
            <label>Task</label><textarea class="wm-textarea wm-prompt-text" data-id="${esc(p.presetId)}" rows="6" style="font-family:monospace; font-size:12px;">${esc(p.content.task)}</textarea>
            <div style="display:flex; justify-content:flex-end;">
              <button class="wm-btn wm-btn-primary wm-save-single-prompt-btn" data-id="${esc(p.presetId)}" data-type="${type}"><i class="fa-solid fa-floppy-disk"></i> ${p.isBuiltin ? '保存为用户副本' : '保存 Prompt'}</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        ${renderPromptList('state', '状态分析 Prompt (State Analysis)', this.prompts.state)}
        ${renderPromptList('summary', '记忆总结 Prompt (Long Memory Summary)', this.prompts.summary)}
      </div>
    `;
  }

  // --- 4. 引擎与召回参数 ---
  private renderParamsTab(): string {
    const state = this.aiSettings?.state;
    const memory = this.aiSettings?.longMemory;
    const recall = this.aiSettings?.recall;
    const basic = getSettings();

    return `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:13px; color:var(--wm-text-muted);">配置 WeaveMemory 状态任务超时、长期记忆总结批次、双路召回及 Token 预算</span>
        <button class="wm-btn wm-btn-primary" id="wm-save-params-btn"><i class="fa-solid fa-floppy-disk"></i> 保存所有运行参数</button>
      </div>

      <div class="wm-card">
        <h4>数据状态（只读）</h4>
        <p>数据库路径：${esc(this.health?.database.databasePath ?? '暂无数据')}</p>
        <p>数据库状态：${this.health?.database.available ? '可用' : '暂无数据'}；${esc(this.health?.database.journalMode ?? '暂无数据')}</p>
        <p>最近自动备份结果：暂无数据。导出、导入、备份恢复和完整数据重建留待 Phase 17。</p>
      </div>

      <div class="wm-card">
        <label><input id="wm-basic-enabled" type="checkbox" ${basic.enabled ? 'checked' : ''} /> 启用织忆</label>
        <label><input id="wm-basic-debug" type="checkbox" ${basic.debug ? 'checked' : ''} /> 调试</label>
        <label>语言<select id="wm-basic-language"><option value="zh-CN">简体中文</option></select></label>
        <label>近期上下文<select id="wm-basic-recent"><option value="raw" ${basic.recentContextMode === 'raw' ? 'selected' : ''}>原文</option><option value="summary" ${basic.recentContextMode === 'summary' ? 'selected' : ''}>摘要</option></select></label>
        <label>摘要正则<input class="wm-input" id="wm-basic-regex" value="${esc(basic.recentSummaryRegex)}" /></label>
        <label>近期楼数<input type="number" min="1" max="20" id="wm-basic-floors" value="${basic.recentFloorCount}" /></label>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div class="wm-card">
          <div class="wm-card-header">
            <span class="wm-card-title"><i class="fa-solid fa-gears"></i> 状态链任务参数</span>
          </div>
          <div class="wm-form-group">
            <span class="wm-label">任务超时时间 (秒)</span>
            <input type="number" class="wm-input" id="wm-cfg-state-timeout" value="${state?.timeoutSec ?? 45}" min="10" max="300" />
          </div>
          <div class="wm-form-group">
            <span class="wm-label">任务最大重试次数</span>
            <input type="number" class="wm-input" id="wm-cfg-state-attempts" value="${state?.maxAttempts ?? 3}" min="1" max="10" />
          </div>
          <div class="wm-form-group">
            <span class="wm-label">快照 Checkpoint 间隔 (楼层数)</span>
            <input type="number" class="wm-input" id="wm-cfg-state-checkpoint" value="${state?.checkpointInterval ?? 20}" min="5" max="100" />
          </div>
        </div>

        <div class="wm-card">
          <div class="wm-card-header">
            <span class="wm-card-title"><i class="fa-solid fa-boxes-stacked"></i> 长期记忆归纳参数</span>
          </div>
          <div class="wm-form-group">
            <span class="wm-label">总结触发间隔 (每累积 N 楼触发总结)</span>
            <input type="number" class="wm-input" id="wm-cfg-mem-interval" value="${memory?.summaryIntervalFloors ?? 30}" min="5" max="50" />
          </div>
          <div class="wm-form-group">
            <span class="wm-label">固定近期记忆强制保留条数</span>
            <input type="number" class="wm-input" id="wm-cfg-mem-fixed" value="${memory?.latestForcedCount ?? 2}" min="0" max="10" />
          </div>
        </div>

        <div class="wm-card" style="grid-column: 1 / -1;">
          <div class="wm-card-header">
            <span class="wm-card-title"><i class="fa-solid fa-magnifying-glass-chart"></i> 检索与双路召回参数</span>
          </div>
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px;">
            <div class="wm-form-group">
              <span class="wm-label">BM25 候选数 (TopK)</span>
              <input type="number" class="wm-input" id="wm-cfg-bm25-topk" value="${recall?.bm25TopK ?? 10}" min="1" max="50" />
            </div>
            <div class="wm-form-group">
              <span class="wm-label">向量检索候选数 (TopK)</span>
              <input type="number" class="wm-input" id="wm-cfg-vec-topk" value="${recall?.embeddingTopK ?? 10}" min="1" max="50" />
            </div>
            <div class="wm-form-group">
              <span class="wm-label">RRF 融合常量 k</span>
              <input type="number" class="wm-input" id="wm-cfg-rrf-k" value="${recall?.rrfK ?? 60}" min="1" max="200" />
            </div>
            <div class="wm-form-group">
              <span class="wm-label">重排候选数 (Rerank Limit)</span>
              <input type="number" class="wm-input" id="wm-cfg-rerank-limit" value="${recall?.rerankCandidateLimit ?? 20}" min="1" max="50" />
            </div>
            <div class="wm-form-group">
              <span class="wm-label">最终保留记忆条数</span>
              <input type="number" class="wm-input" id="wm-cfg-final-count" value="${recall?.finalRecallCount ?? 6}" min="1" max="20" />
            </div>
            <div class="wm-form-group">
              <span class="wm-label">记忆预算最小 / 最大 Token</span>
              <div style="display:flex; gap:6px;">
                <input type="number" class="wm-input" id="wm-cfg-budget-min" value="${recall?.minTokenBudget ?? 2000}" style="flex:1;" />
                <input type="number" class="wm-input" id="wm-cfg-budget-max" value="${recall?.maxTokenBudget ?? 6000}" style="flex:1;" />
              </div>
            </div>
          </div>
          <label>Token 比例<input type="number" step="0.001" class="wm-input" id="wm-cfg-token-ratio" value="${recall?.tokenRatio ?? 0.03}" /></label>
          <div style="margin-top:8px;">
            <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;">
              <input type="checkbox" id="wm-cfg-rerank-enabled" ${recall?.rerankEnabled === true ? 'checked' : ''} />
              <span>启用 Rerank 交叉打分模型 (未绑定时自动回退为 RRF 融合分数)</span>
            </label>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    const applyLimits = (entries: Record<string, string>, limits: Record<string, { min: number; max: number }> | undefined): void => {
      for (const [id, key] of Object.entries(entries)) {
        const input = this.container.querySelector<HTMLInputElement>(`#wm-cfg-${id}`);
        const limit = limits?.[key];
        if (input && limit) { input.min = String(limit.min); input.max = String(limit.max); input.required = true; }
      }
    };
    applyLimits({ 'state-timeout': 'timeoutSec', 'state-attempts': 'maxAttempts', 'state-checkpoint': 'checkpointInterval' }, this.aiSettings?.limits);
    applyLimits({ 'mem-interval': 'summaryIntervalFloors', 'mem-fixed': 'latestForcedCount' }, this.aiSettings?.longMemoryLimits);
    applyLimits({ 'bm25-topk': 'bm25TopK', 'vec-topk': 'embeddingTopK', 'rrf-k': 'rrfK', 'rerank-limit': 'rerankCandidateLimit', 'final-count': 'finalRecallCount', 'budget-min': 'minTokenBudget', 'budget-max': 'maxTokenBudget', 'token-ratio': 'tokenRatio' }, this.aiSettings?.recallLimits);
    // Sub-nav tab switching
    this.container.querySelector('#wm-set-tab-channels')?.addEventListener('click', () => { this.currentSubNav = 'channels'; this.render(); });
    this.container.querySelector('#wm-set-tab-bindings')?.addEventListener('click', () => { this.currentSubNav = 'bindings'; this.render(); });
    this.container.querySelector('#wm-set-tab-prompts')?.addEventListener('click', () => { this.currentSubNav = 'prompts'; this.render(); });
    this.container.querySelector('#wm-set-tab-params')?.addEventListener('click', () => { this.currentSubNav = 'params'; this.render(); });

    // --- Channel Events ---
    this.container.querySelector('#wm-add-channel-btn')?.addEventListener('click', async () => {
      const name = prompt('请输入新渠道名称：', 'OpenAI 兼容渠道');
      if (!name?.trim()) return;

      const newChan: Parameters<typeof backend.saveChannel>[0] = {
        name: name.trim(),
        apiType: 'openai-compatible',
        baseUrl: 'https://api.openai.com/v1',

      };
      try {
        await backend.saveChannel(newChan);
        showToast('已新建渠道', 'success');
        await this.loadData();
      } catch (err) {
        showToast((err instanceof Error ? err.message : String(err)) || '新建渠道失败', 'error');
      }
    });

    this.container.querySelectorAll('.wm-test-channel-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;
        try {
          showToast('正在测试连通性...', 'info');
          const key = (this.container.querySelector(`.wm-chan-key[data-id="${CSS.escape(id ?? '')}"]`) as HTMLInputElement)?.value.trim() || undefined;
          const res = await backend.testChannel(id, key);
          showToast(`连接成功！延迟: ${res.durationMs}ms`, 'success');
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '连接失败', 'error');
        }
      });
    });

    this.container.querySelectorAll('.wm-fetch-models-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;
        try {
          showToast('正在从服务端拉取模型列表...', 'info');
          const key = (this.container.querySelector(`.wm-chan-key[data-id="${CSS.escape(id ?? '')}"]`) as HTMLInputElement)?.value.trim() || undefined;
          const res = await backend.probeChannelModels(id, key);
          this.modelCache.set(id, res.models);
          showToast(`成功拉取 ${res.models?.length || 0} 个模型！`, 'success');
          await this.loadData();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '拉取模型失败', 'error');
        }
      });
    });

    this.container.querySelectorAll('.wm-save-channel-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;
        const name = (this.container.querySelector(`.wm-chan-name[data-id="${CSS.escape(id ?? '')}"]`) as HTMLInputElement)?.value.trim();
        const baseUrl = (this.container.querySelector(`.wm-chan-url[data-id="${CSS.escape(id ?? '')}"]`) as HTMLInputElement)?.value.trim();
        const apiKey = (this.container.querySelector(`.wm-chan-key[data-id="${CSS.escape(id ?? '')}"]`) as HTMLInputElement)?.value.trim() || undefined;

        try {
          const timeout = this.container.querySelector<HTMLInputElement>(`.wm-chan-timeout[data-id="${CSS.escape(id ?? '')}"]`)!.value;
          const headers: Record<string, string> = {};
          for (const line of this.container.querySelector<HTMLTextAreaElement>(`.wm-chan-headers[data-id="${CSS.escape(id ?? '')}"]`)!.value.split('\n').filter(line => line.trim())) {
            const colon = line.indexOf(':');
            if (colon <= 0) throw new Error('Header 格式应为 名称: 值');
            headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
          }
          const clearKey = this.container.querySelector<HTMLInputElement>(`.wm-chan-clear-key[data-id="${CSS.escape(id ?? '')}"]`)!.checked;
          await backend.saveChannel({ channelId: id, name: name ?? '', apiType: 'openai-compatible', baseUrl: baseUrl ?? '', apiKey: clearKey ? null : apiKey, timeout: timeout ? Number(timeout) : null, headers });
          showToast('渠道设置已保存！', 'success');
          await this.loadData();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '保存渠道失败', 'error');
        }
      });
    });

    this.container.querySelectorAll('.wm-del-channel-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id || !confirm('确定要删除此渠道吗？')) return;
        try {
          await backend.deleteChannel(id);
          showToast('已删除渠道', 'info');
          await this.loadData();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '删除渠道失败', 'error');
        }
      });
    });

    // --- Bindings Events ---
    this.container.querySelectorAll<HTMLSelectElement>('.wm-binding-chan').forEach(select => {
      select.addEventListener('change', () => {
        const list = this.container.querySelector<HTMLDataListElement>(`#models-list-${select.dataset.role}`);
        list?.replaceChildren(...(this.modelCache.get(select.value) ?? []).map(model => {
          const option = document.createElement('option');
          option.value = model;
          return option;
        }));
      });
    });
    this.container.querySelector('#wm-save-bindings-btn')?.addEventListener('click', async () => {
      const newBindings: Partial<Record<ModelRole, ModelBindingInput | null>> = {};
      const roles: ModelRole[] = ['summary', 'state', 'embedding', 'rerank'];
      for (const role of roles) {
        const chanId = (this.container.querySelector(`.wm-binding-chan[data-role="${role}"]`) as HTMLSelectElement)?.value || '';
        const model = (this.container.querySelector(`.wm-binding-model[data-role="${role}"]`) as HTMLInputElement)?.value.trim() || '';
        newBindings[role] = chanId ? { channelId: chanId, model } : null;
      }
      try {
        await backend.saveModelBindings(newBindings);
        showToast('模型绑定已保存！', 'success');
        await this.loadData();
      } catch (err) {
        showToast((err instanceof Error ? err.message : String(err)) || '保存模型绑定失败', 'error');
      }
    });

    this.container.querySelectorAll('.wm-test-model-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const role = (btn as HTMLElement).dataset.role as ModelRole;
        if (!['summary', 'state', 'embedding', 'rerank'].includes(role)) return;
        const chanId = (this.container.querySelector(`.wm-binding-chan[data-role="${role}"]`) as HTMLSelectElement)?.value;
        const model = (this.container.querySelector(`.wm-binding-model[data-role="${role}"]`) as HTMLInputElement)?.value.trim();
        if (!chanId || !model) {
          showToast('请先选择渠道并填写模型名称', 'warning');
          return;
        }
        try {
          showToast(`正在测试 ${role} 模型可用性...`, 'info');
          const res = await backend.testModel({ role, channelId: chanId, model });
          showToast(`模型测试成功！延迟: ${res.durationMs}ms`, 'success');
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '模型测试失败', 'error');
        }
      });
    });

    // --- Prompts Events ---
    this.container.querySelectorAll<HTMLElement>('.wm-delete-prompt-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!btn.dataset.id || !confirm('删除此用户预设？若正在使用，将恢复内置默认。')) return;
        try { await backend.deletePrompt(btn.dataset.id); await this.loadData(); }
        catch (error) { showToast(error instanceof Error ? error.message : String(error), 'error'); }
      });
    });
    this.container.querySelectorAll<HTMLElement>('.wm-export-prompt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type === 'summary' ? 'summary' : 'state';
        const preset = this.prompts[type].find(item => item.presetId === btn.dataset.id);
        if (!preset) return;
        const url = URL.createObjectURL(new Blob([JSON.stringify({ promptType: type, name: preset.name, content: preset.content, version: preset.version }, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `weavememory-${type}-prompt.json`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    });
    this.container.querySelectorAll<HTMLElement>('.wm-import-prompt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const file = document.createElement('input');
        file.type = 'file'; file.accept = '.json,application/json';
        file.addEventListener('change', async () => {
          const selected = file.files?.[0];
          if (!selected) return;
          try {
            const value: unknown = JSON.parse(await selected.text());
            if (!value || typeof value !== 'object' || !('name' in value) || typeof value.name !== 'string' || !('promptType' in value) || value.promptType !== btn.dataset.type || !('content' in value) || !value.content || typeof value.content !== 'object' || !('system' in value.content) || typeof value.content.system !== 'string' || !('task' in value.content) || typeof value.content.task !== 'string') throw new Error('预设格式或 Prompt 类型不匹配');
            await backend.savePrompt({ promptType: value.promptType === 'summary' ? 'summary' : 'state', name: value.name, content: { system: value.content.system, task: value.content.task } });
            await this.loadData();
            showToast('已导入为用户预设，请按需设为生效', 'success');
          } catch (error) { showToast(error instanceof Error ? error.message : String(error), 'error'); }
        });
        file.click();
      });
    });
    this.container.querySelectorAll('.wm-save-single-prompt-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        const type = (btn as HTMLElement).dataset.type as 'state' | 'summary';
        if (!id) return;
        const text = (this.container.querySelector(`.wm-prompt-text[data-id="${CSS.escape(id ?? '')}"]`) as HTMLTextAreaElement)?.value;
        try {
          const preset = this.prompts[type].find(item => item.presetId === id)!;
          const system = this.container.querySelector<HTMLTextAreaElement>(`.wm-prompt-system[data-id="${CSS.escape(id ?? '')}"]`)!.value;
          const name = this.container.querySelector<HTMLInputElement>(`.wm-prompt-name[data-id="${CSS.escape(id ?? '')}"]`)!.value;
          await backend.savePrompt({ presetId: preset.isBuiltin ? undefined : id, promptType: type, name, content: { system, task: text ?? '' } });
          showToast('Prompt 预设已保存！', 'success');
          await this.loadData();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '保存 Prompt 失败', 'error');
        }
      });
    });

    this.container.querySelectorAll('.wm-activate-prompt-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;
        try {
          await backend.activatePrompt((btn as HTMLElement).dataset.type as 'state' | 'summary', id);
          showToast('已设为生效 Prompt', 'success');
          await this.loadData();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '生效设置失败', 'error');
        }
      });
    });

    this.container.querySelectorAll('.wm-reset-prompt-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const type = (btn as HTMLElement).dataset.type as 'state' | 'summary';
        if (!confirm('确定要重置并恢复默认 Prompt 吗？用户预设会保留。')) return;
        try {
          await backend.resetPrompt(type);
          showToast('已恢复系统默认 Prompt', 'success');
          await this.loadData();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '重置失败', 'error');
        }
      });
    });

    this.container.querySelectorAll('.wm-test-prompt-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        const type = (btn as HTMLElement).dataset.type as 'state' | 'summary';
        const text = (this.container.querySelector(`.wm-prompt-text[data-id="${CSS.escape(id ?? '')}"]`) as HTMLTextAreaElement)?.value || '';
        try {
          showToast('正在执行 Prompt 采样测试...', 'info');
          const sampleContent = prompt('请输入用于测试的正文：');
          if (!sampleContent?.trim()) return;
          const system = this.container.querySelector<HTMLTextAreaElement>(`.wm-prompt-system[data-id="${CSS.escape(id ?? '')}"]`)!.value;
          const res = await backend.testPrompt({ promptType: type, content: { system, task: text }, sampleContent });
          showToast(`Prompt 测试响应成功！耗时: ${res.durationMs}ms`, 'success');
          alert(`测试响应结果：\n\n${JSON.stringify(res.result, null, 2)}`);
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || 'Prompt 测试失败', 'error');
        }
      });
    });

    // --- Params Events ---
    this.container.querySelector('#wm-save-params-btn')?.addEventListener('click', async () => {
      for (const input of this.container.querySelectorAll<HTMLInputElement>('input[type="number"]')) if (!input.reportValidity()) return;
      const state = {
        timeoutSec: Number((this.container.querySelector('#wm-cfg-state-timeout') as HTMLInputElement)?.value || 45),
        maxAttempts: Number((this.container.querySelector('#wm-cfg-state-attempts') as HTMLInputElement)?.value || 3),
        checkpointInterval: Number((this.container.querySelector('#wm-cfg-state-checkpoint') as HTMLInputElement)?.value || 20)
      };
      const longMemory = {
        summaryIntervalFloors: Number((this.container.querySelector('#wm-cfg-mem-interval') as HTMLInputElement)?.value || 30),
        latestForcedCount: Number((this.container.querySelector('#wm-cfg-mem-fixed') as HTMLInputElement)?.value || 2)
      };
      const recall = {
        tokenRatio: Number(this.container.querySelector<HTMLInputElement>('#wm-cfg-token-ratio')!.value),
        bm25TopK: Number((this.container.querySelector('#wm-cfg-bm25-topk') as HTMLInputElement)?.value || 10),
        embeddingTopK: Number((this.container.querySelector('#wm-cfg-vec-topk') as HTMLInputElement)?.value || 10),
        rrfK: Number((this.container.querySelector('#wm-cfg-rrf-k') as HTMLInputElement)?.value || 60),
        rerankCandidateLimit: Number((this.container.querySelector('#wm-cfg-rerank-limit') as HTMLInputElement)?.value || 20),
        finalRecallCount: Number((this.container.querySelector('#wm-cfg-final-count') as HTMLInputElement)?.value || 6),
        minTokenBudget: Number((this.container.querySelector('#wm-cfg-budget-min') as HTMLInputElement)?.value || 2000),
        maxTokenBudget: Number((this.container.querySelector('#wm-cfg-budget-max') as HTMLInputElement)?.value || 6000),
        rerankEnabled: (this.container.querySelector('#wm-cfg-rerank-enabled') as HTMLInputElement)?.checked ?? false
      };

      try {
        const saved = await backend.saveAiSettings({ state, longMemory, recall });
        updateSettings({ longMemoryIntervalFloors: saved.longMemory.summaryIntervalFloors, enabled: this.container.querySelector<HTMLInputElement>('#wm-basic-enabled')!.checked, debug: this.container.querySelector<HTMLInputElement>('#wm-basic-debug')!.checked, language: 'zh-CN', recentContextMode: this.container.querySelector<HTMLSelectElement>('#wm-basic-recent')!.value === 'summary' ? 'summary' : 'raw', recentSummaryRegex: this.container.querySelector<HTMLInputElement>('#wm-basic-regex')!.value, recentFloorCount: Number(this.container.querySelector<HTMLInputElement>('#wm-basic-floors')!.value) });
        if (!getSettings().enabled) clearMemoryPrompts();
        showToast('运行参数已成功保存！', 'success');
        await this.loadData();
      } catch (err) {
        showToast((err instanceof Error ? err.message : String(err)) || '保存参数失败', 'error');
      }
    });
  }
}
