import { backend } from '../api/backend-client';
import type { CharacterProfile, CharacterTrace, StateSnapshot } from '../types';
import { escapeHtml as esc } from './text';
import { showToast } from './toast';

export class CharactersView {
  private selectedCharacterId: string | null = null;
  private currentSubTab: 'profile' | 'trace' = 'profile';
  private snapshot: StateSnapshot | null = null;
  private chatId: string = '';
  private branchId: string = '';
  private syncStatus = '暂无数据';
  private relevantCharacterIds: string[] = [];

  constructor(private readonly container: HTMLElement) {}

  setData(chatId: string, branchId: string, snapshot: StateSnapshot, syncStatus: string, relevantCharacterIds: string[]): void {
    this.syncStatus = syncStatus;
    this.relevantCharacterIds = relevantCharacterIds;
    this.chatId = chatId;
    this.branchId = branchId;
    this.snapshot = snapshot;
    const charIds = Object.keys(snapshot.profiles);
    if (!this.selectedCharacterId || !charIds.includes(this.selectedCharacterId)) {
      this.selectedCharacterId = charIds[0] ?? null;
    }
    this.render();
  }

  render(): void {
    if (!this.snapshot) {
      this.container.innerHTML = '<div class="wm-card"><div>暂无状态数据</div></div>';
      return;
    }

    const profiles = this.snapshot.profiles;
    const charIds = Object.keys(profiles);

    this.container.innerHTML = `
      <div class="wm-char-layout">
        <!-- Sidebar: Character List -->
        <div class="wm-char-sidebar">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-weight:600; font-size:13px; color:var(--wm-text-muted);">人物名册 (${charIds.length})</span>
            <button class="wm-icon-btn" id="wm-char-add-btn" title="添加新人物"><i class="fa-solid fa-plus"></i></button>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px; overflow-y:auto; max-height:540px;">
            ${charIds.length === 0 ? '<div style="color:var(--wm-text-muted); padding:10px; font-size:12px;">名册暂无人物</div>' : ''}
            ${charIds.map(id => {
              const p = profiles[id];
              const isSelected = id === this.selectedCharacterId;
              const lockedCount = p.lockedPaths?.length || 0;
              return `
                <div class="wm-char-item ${isSelected ? 'wm-active' : ''}" data-char-id="${esc(id)}">
                  <div>
                    <div style="font-weight:500;">${esc(p.canonicalName || id)}</div>
                    <div>${esc(this.syncStatus)} · ${this.relevantCharacterIds.includes(id) ? '当前场景相关' : '当前场景未选中'}</div>
                    <div style="font-size:11px; color:var(--wm-text-muted);">ID: ${esc(id)}</div>
                  </div>
                  ${lockedCount > 0 ? `<span style="color:#fbbf24; font-size:11px;" title="${lockedCount} 个锁定字段"><i class="fa-solid fa-lock"></i> ${lockedCount}</span>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="wm-char-content">
          ${!this.selectedCharacterId || !profiles[this.selectedCharacterId] ? `
            <div class="wm-card"><div style="text-align:center; padding:40px; color:var(--wm-text-muted);">请在左侧选择或添加人物</div></div>
          ` : this.renderCharacterDetail(profiles[this.selectedCharacterId], this.snapshot.traces[this.selectedCharacterId])}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderCharacterDetail(profile: CharacterProfile, trace?: CharacterTrace): string {
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--wm-card-bg); padding:12px 16px; border-radius:var(--wm-radius); border:1px solid var(--wm-card-border);">
        <div>
          <span style="font-size:16px; font-weight:600;">${esc(profile.canonicalName || profile.characterId)}</span>
          <span style="font-size:12px; color:var(--wm-text-muted); margin-left:8px;">别名: ${esc(profile.aliases?.length ? profile.aliases.join(', ') : '无')}</span>
        </div>
        <div class="wm-drawer-actions">
          <button class="wm-sub-btn ${this.currentSubTab === 'profile' ? 'wm-active' : ''}" id="wm-subtab-profile"><i class="fa-solid fa-id-card"></i> 谱 (Profile)</button>
          <button class="wm-sub-btn ${this.currentSubTab === 'trace' ? 'wm-active' : ''}" id="wm-subtab-trace"><i class="fa-solid fa-shoe-prints"></i> 迹 (Trace)</button>
        </div>
      </div>

      ${this.currentSubTab === 'profile' ? this.renderProfileTab(profile) : this.renderTraceTab(profile, trace)}
    `;
  }

  private renderProfileTab(profile: CharacterProfile): string {
    const lockedPaths = new Set(profile.lockedPaths || []);
    const sourcePriority = profile.sourcePriority || {};

    const renderField = (groupName: string, fieldName: string, label: string, value: unknown) => {
      const fullPath = groupName ? `${groupName}.${fieldName}` : fieldName;
      const isLocked = lockedPaths.has(fullPath);
      const isManual = sourcePriority[fullPath] === 'manual';
      const displayVal = Array.isArray(value) ? value.join(', ') : String(value ?? '');

      return `
        <div class="wm-form-group">
          <div class="wm-label">
            <span>${label}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              ${isManual ? '<span style="font-size:10px; background:rgba(56,189,248,0.2); color:#38bdf8; padding:1px 6px; border-radius:4px;">手动修改</span>' : ''}
              <button class="wm-lock-btn ${isLocked ? 'locked' : ''}" data-field-path="${esc(fullPath)}" title="${isLocked ? '已锁定：AI更新不可覆盖' : '点击锁定字段'}">
                <i class="fa-solid ${isLocked ? 'fa-lock' : 'fa-lock-open'}"></i>
              </button>
              ${isManual || isLocked ? `
                <button class="wm-lock-btn" data-restore-field="${esc(fullPath)}" title="恢复 AI 自动管理" style="color:var(--wm-accent);">
                  <i class="fa-solid fa-rotate-left"></i>
                </button>
              ` : ''}
            </div>
          </div>
          <div class="wm-field-row">
            <input type="text" class="wm-input wm-profile-input" style="flex:1;" data-field-path="${esc(fullPath)}" value="${esc(displayVal)}" placeholder="请输入${label}..." />
          </div>
        </div>
      `;
    };

    return `
      <details class="wm-card"><summary>查看来源</summary><pre>${esc(JSON.stringify({ ...profile.source, sourcePriority: profile.sourcePriority }, null, 2))}</pre></details>
      <div class="wm-card">
        ${renderField('', 'canonicalName', '名字', profile.canonicalName)}
        ${renderField('', 'aliases', '别名（逗号分隔）', profile.aliases)}
      </div>
      <div class="wm-card"><h4>身份</h4>
        ${renderField('identity', 'occupation', '职业', profile.identity.occupation)}
        ${renderField('identity', 'organizations', '组织（逗号分隔）', profile.identity.organizations)}
        ${renderField('identity', 'socialIdentity', '社会身份（逗号分隔）', profile.identity.socialIdentity)}
        ${renderField('identity', 'background', '背景', profile.identity.background)}
        ${renderField('identity', 'importantRelations', '重要关系（逗号分隔）', profile.identity.importantRelations)}
      </div>
      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-user"></i> 基础信息</span>
          <button class="wm-btn wm-btn-primary" id="wm-save-profile-btn"><i class="fa-solid fa-floppy-disk"></i> 保存修改</button>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          ${renderField('basic', 'gender', '性别', profile.basic?.gender)}
          ${renderField('basic', 'age', '年龄', profile.basic?.age)}
          ${renderField('basic', 'race', '种族/物种', profile.basic?.race)}
          ${renderField('basic', 'birthday', '生日', profile.basic?.birthday)}
          ${renderField('basic', 'notes', '备注', profile.basic?.notes)}
        </div>
      </div>

      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-shirt"></i> 外貌形态</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          ${renderField('appearance', 'build', '体型', profile.appearance?.build)}
          ${renderField('appearance', 'face', '面容', profile.appearance?.face)}
          ${renderField('appearance', 'notes', '外貌备注', profile.appearance?.notes)}
          ${renderField('appearance', 'height', '身高/体型', profile.appearance?.height)}
          ${renderField('appearance', 'hair', '发型/发色', profile.appearance?.hair)}
          ${renderField('appearance', 'eyes', '眼瞳', profile.appearance?.eyes)}
          ${renderField('appearance', 'clothingStyle', '常穿服饰', profile.appearance?.clothingStyle)}
          <div style="grid-column:1 / -1;">
            ${renderField('appearance', 'distinctiveFeatures', '显著特征 (逗号分隔)', profile.appearance?.distinctiveFeatures)}
          </div>
        </div>
      </div>

      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-brain"></i> 性格与特质</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div style="grid-column:1 / -1;">
            ${renderField('personality', 'expressionHabits', '表达习惯（逗号分隔）', profile.personality?.expressionHabits)}
            ${renderField('personality', 'coreTraits', '核心特质 (逗号分隔)', profile.personality?.coreTraits)}
          </div>
          <div style="grid-column:1 / -1;">
            ${renderField('personality', 'behaviorStyle', '行为风格', profile.personality?.behaviorStyle)}
          </div>
          <div style="grid-column:1 / -1;">
            ${renderField('personality', 'likes', '喜好事物', profile.personality?.likes)}
          </div>
          <div style="grid-column:1 / -1;">
            ${renderField('personality', 'dislikes', '厌恶事物', profile.personality?.dislikes)}
          </div>
          <div style="grid-column:1 / -1;">
            ${renderField('personality', 'principles', '处事底线 / 原则', profile.personality?.principles)}
          </div>
        </div>
      </div>

      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-mug-hot"></i> 生活细节 (Life Details)</span>
          <button class="wm-btn wm-btn-secondary" id="wm-add-life-detail"><i class="fa-solid fa-plus"></i> 添加细节</button>
        </div>
        <div id="wm-life-details-list" style="display:flex; flex-direction:column; gap:8px;">
          ${(profile.lifeDetails || []).map((detail, idx) => `
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="text" class="wm-input wm-life-detail-input" style="flex:1;" value="${esc(detail)}" />
              <button class="wm-icon-btn wm-del-life-detail" data-index="${idx}"><i class="fa-solid fa-trash"></i></button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderTraceTab(profile: CharacterProfile, trace?: CharacterTrace): string {
    const inner = trace?.affinity?.inner ?? '';
    const outer = trace?.affinity?.outer ?? '';
    const note = trace?.affinity?.note ?? '';

    return `
      <details class="wm-card"><summary>迹的来源</summary><pre>${esc(trace ? JSON.stringify(trace.source, null, 2) : '暂无数据')}</pre></details>
      <div class="wm-card"><h4>信息可见范围</h4>
        <div id="wm-visibility-list">${(trace?.visibility ?? []).map(item => `<div class="wm-visibility-row" data-id="${esc(item.id)}"><input class="wm-input wm-vis-fact" placeholder="事实" value="${esc(item.fact)}" /><input class="wm-input wm-vis-known" placeholder="知情人物 ID（逗号分隔）" value="${esc(item.knownBy.join(', '))}" /><input class="wm-input wm-vis-unknown" placeholder="不知情人物 ID（逗号分隔）" value="${esc(item.unknownBy?.join(', ') ?? '')}" /><button class="wm-vis-remove">删除</button></div>`).join('')}</div>
        <button id="wm-vis-add" class="wm-btn">添加可见事实</button>
      </div>
      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-heart"></i> 好感度与态度 (Affinity)</span>
          <button class="wm-btn wm-btn-primary" id="wm-save-trace-btn"><i class="fa-solid fa-floppy-disk"></i> 保存修改</button>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="wm-form-group">
            <div class="wm-label"><span>内心好感度 (-2 ~ +2)</span><b id="wm-inner-val">${inner}</b></div>
            <input type="number" placeholder="未知" class="wm-input" id="wm-affinity-inner" min="-2" max="2" step="1" value="${inner}" />
            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--wm-text-muted);">
              <span>-2 极度厌恶</span>
              <span>0 中立客套</span>
              <span>+2 深深信任/爱慕</span>
            </div>
          </div>
          <div class="wm-form-group">
            <div class="wm-label"><span>表面态度 (-2 ~ +2)</span><b id="wm-outer-val">${outer}</b></div>
            <input type="number" placeholder="未知" class="wm-input" id="wm-affinity-outer" min="-2" max="2" step="1" value="${outer}" />
            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--wm-text-muted);">
              <span>-2 冷酷抵触</span>
              <span>0 平淡礼貌</span>
              <span>+2 亲切热情</span>
            </div>
          </div>
          <div class="wm-form-group" style="grid-column:1 / -1;">
            <div class="wm-label"><span>好感度备注 / 态度原因</span></div>
            <input type="text" class="wm-input" id="wm-affinity-note" value="${esc(note)}" placeholder="例如：因为昨天救了她一次，心存感激但表面克制" />
          </div>
        </div>
      </div>

      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-compass"></i> 长期倾向 (Long-Term Tendencies)</span>
          <button class="wm-btn wm-btn-secondary" id="wm-add-tendency-btn"><i class="fa-solid fa-plus"></i> 添加倾向</button>
        </div>
        <div id="wm-tendencies-list" style="display:flex; flex-direction:column; gap:8px;">
          ${(trace?.longTermTendencies || []).map((item, idx) => `
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="text" class="wm-input wm-tendency-input" style="flex:1;" data-id="${esc(item.id)}" value="${esc(item.text)}" placeholder="倾向描述..." />
              <button class="wm-icon-btn wm-del-tendency" data-index="${idx}"><i class="fa-solid fa-trash"></i></button>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-person-walking-dashed-line-arrow-right"></i> 当前处境 (Current Situations)</span>
          <button class="wm-btn wm-btn-secondary" id="wm-add-situation-btn"><i class="fa-solid fa-plus"></i> 添加处境</button>
        </div>
        <div id="wm-situations-list" style="display:flex; flex-direction:column; gap:8px;">
          ${(trace?.currentSituations || []).map((item, idx) => `
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="text" class="wm-input wm-situation-input" style="flex:1;" data-id="${esc(item.id)}" value="${esc(item.text)}" placeholder="处境描述..." />
              <button class="wm-icon-btn wm-del-situation" data-index="${idx}"><i class="fa-solid fa-trash"></i></button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.container.querySelectorAll('.wm-vis-remove').forEach(button => button.addEventListener('click', () => button.closest('.wm-visibility-row')?.remove()));
    this.container.querySelector('#wm-vis-add')?.addEventListener('click', () => {
      const row = document.createElement('div');
      row.className = 'wm-visibility-row'; row.dataset.id = crypto.randomUUID();
      for (const [className, placeholder] of [['wm-vis-fact', '事实'], ['wm-vis-known', '知情人物 ID（逗号分隔）'], ['wm-vis-unknown', '不知情人物 ID（逗号分隔）']]) {
        const input = document.createElement('input'); input.className = 'wm-input ' + className; input.placeholder = placeholder; row.append(input);
      }
      const remove = document.createElement('button'); remove.textContent = '删除'; remove.addEventListener('click', () => row.remove()); row.append(remove);
      this.container.querySelector('#wm-visibility-list')?.append(row);
    });
    // Character selection
    this.container.querySelectorAll('.wm-char-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.charId;
        if (id) {
          this.selectedCharacterId = id;
          this.render();
        }
      });
    });

    // Subtab switch
    this.container.querySelector('#wm-subtab-profile')?.addEventListener('click', () => {
      this.currentSubTab = 'profile';
      this.render();
    });
    this.container.querySelector('#wm-subtab-trace')?.addEventListener('click', () => {
      this.currentSubTab = 'trace';
      this.render();
    });

    // Add character
    this.container.querySelector('#wm-char-add-btn')?.addEventListener('click', async () => {
      const name = prompt('请输入新人物名字或标识：');
      if (!name?.trim()) return;
      const id = name.trim().toLowerCase().replace(/\s+/g, '_');
      try {
        await backend.manualEditState({
          chatId: this.chatId,
          branchId: this.branchId,
          target: 'profile',
          entityId: id,
          fieldPath: 'canonicalName',
          value: name.trim()
        });
        showToast(`已添加人物：${name.trim()}`, 'success');
        this.selectedCharacterId = id;
        const res = await backend.getCurrentState(this.chatId, this.branchId);
        this.snapshot = res.snapshot;
        this.render();
      } catch (err) {
        showToast((err instanceof Error ? err.message : String(err)) || '添加失败', 'error');
      }
    });

    // Lock / Unlock toggle
    this.container.querySelectorAll('.wm-lock-btn[data-field-path]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const path = (btn as HTMLElement).dataset.fieldPath;
        if (!path || !this.selectedCharacterId) return;
        const isLocked = btn.classList.contains('locked');
        const action = isLocked ? 'unlock' : 'lock';
        try {
          await backend.manualEditState({
            chatId: this.chatId,
            branchId: this.branchId,
            target: 'profile',
            entityId: this.selectedCharacterId,
            fieldPath: path,
            action
          });
          showToast(action === 'lock' ? '字段已锁定，AI 不可覆盖' : '字段已解锁', 'success');
          const res = await backend.getCurrentState(this.chatId, this.branchId);
          this.snapshot = res.snapshot;
          this.render();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '操作失败', 'error');
        }
      });
    });

    // Restore AI Management
    this.container.querySelectorAll('button[data-restore-field]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const path = (btn as HTMLElement).dataset.restoreField;
        if (!path || !this.selectedCharacterId) return;
        try {
          await backend.manualEditState({
            chatId: this.chatId,
            branchId: this.branchId,
            target: 'profile',
            entityId: this.selectedCharacterId,
            fieldPath: path,
            action: 'restore-ai'
          });
          showToast('已恢复 AI 自动管理', 'success');
          const res = await backend.getCurrentState(this.chatId, this.branchId);
          this.snapshot = res.snapshot;
          this.render();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '操作失败', 'error');
        }
      });
    });

    // Save profile changes
    this.container.querySelector('#wm-save-profile-btn')?.addEventListener('click', async () => {
      if (!this.selectedCharacterId) return;
      const inputs = this.container.querySelectorAll<HTMLInputElement>('.wm-profile-input');
      try {
        for (const input of Array.from(inputs)) {
          const path = input.dataset.fieldPath;
          if (!path) continue;
          let val: string | string[] = input.value.trim();
          if (['aliases', 'distinctiveFeatures', 'coreTraits', 'behaviorStyle', 'expressionHabits', 'likes', 'dislikes', 'principles', 'organizations', 'socialIdentity', 'importantRelations'].includes(path.split('.').at(-1)!)) {
            val = val ? val.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) : [];
          }
          const [group, field] = path.split('.');
          const currentProfile = this.snapshot!.profiles[this.selectedCharacterId];
          const currentGroup = currentProfile[group as keyof CharacterProfile];
          const previous = !field ? currentGroup : currentGroup && typeof currentGroup === 'object' ? (currentGroup as Record<string, unknown>)[field] : undefined;
          if (JSON.stringify(previous) === JSON.stringify(val) || (previous === undefined && (!val.length))) continue;
          await backend.manualEditState({
            chatId: this.chatId,
            branchId: this.branchId,
            target: 'profile',
            entityId: this.selectedCharacterId,
            fieldPath: path,
            value: val
          });
        }
        // Life details
        const lifeInputs = this.container.querySelectorAll<HTMLInputElement>('.wm-life-detail-input');
        const lifeDetails = Array.from(lifeInputs).map(i => i.value.trim()).filter(Boolean);
        await backend.manualEditState({
          chatId: this.chatId,
          branchId: this.branchId,
          target: 'profile',
          entityId: this.selectedCharacterId,
          fieldPath: 'lifeDetails',
          value: lifeDetails
        });

        showToast('人物资料已保存！', 'success');
        const res = await backend.getCurrentState(this.chatId, this.branchId);
        this.snapshot = res.snapshot;
        this.render();
      } catch (err) {
        showToast((err instanceof Error ? err.message : String(err)) || '保存失败', 'error');
      }
    });

    // Save trace changes
    this.container.querySelector('#wm-save-trace-btn')?.addEventListener('click', async () => {
      if (!this.selectedCharacterId) return;
      const innerText = this.container.querySelector<HTMLInputElement>('#wm-affinity-inner')!.value;
      const inner = innerText === '' ? null : Number(innerText);
      const outerText = this.container.querySelector<HTMLInputElement>('#wm-affinity-outer')!.value;
      const outer = outerText === '' ? null : Number(outerText);
      const note = (this.container.querySelector('#wm-affinity-note') as HTMLInputElement)?.value || '';

      const tendencies = Array.from(this.container.querySelectorAll<HTMLInputElement>('.wm-tendency-input')).map((el, i) => ({
        ...this.snapshot?.traces[this.selectedCharacterId!]?.longTermTendencies.find(item => item.id === el.dataset.id),
        id: el.dataset.id || `tendency_${i + 1}`,
        text: el.value.trim()
      })).filter(t => t.text);

      const situations = Array.from(this.container.querySelectorAll<HTMLInputElement>('.wm-situation-input')).map((el, i) => ({
        ...this.snapshot?.traces[this.selectedCharacterId!]?.currentSituations.find(item => item.id === el.dataset.id),
        id: el.dataset.id || `situation_${i + 1}`,
        text: el.value.trim()
      })).filter(s => s.text);

      const visibility = Array.from(this.container.querySelectorAll<HTMLElement>('.wm-visibility-row')).map(row => ({
        id: row.dataset.id!, fact: row.querySelector<HTMLInputElement>('.wm-vis-fact')!.value.trim(),
        knownBy: row.querySelector<HTMLInputElement>('.wm-vis-known')!.value.split(/[,，]/).map(value => value.trim()).filter(Boolean),
        unknownBy: row.querySelector<HTMLInputElement>('.wm-vis-unknown')!.value.split(/[,，]/).map(value => value.trim()).filter(Boolean)
      })).filter(item => item.fact);

      try {
        await backend.manualEditState({
          chatId: this.chatId,
          branchId: this.branchId,
          target: 'trace',
          entityId: this.selectedCharacterId,
          fieldPath: 'affinity',
          value: { inner, outer, ...(note ? { note } : {}) }
        });
        await backend.manualEditState({
          chatId: this.chatId,
          branchId: this.branchId,
          target: 'trace',
          entityId: this.selectedCharacterId,
          fieldPath: 'longTermTendencies',
          value: tendencies
        });
        await backend.manualEditState({
          chatId: this.chatId,
          branchId: this.branchId,
          target: 'trace',
          entityId: this.selectedCharacterId,
          fieldPath: 'currentSituations',
          value: situations
        });

        await backend.manualEditState({ chatId: this.chatId, branchId: this.branchId, target: 'trace', entityId: this.selectedCharacterId, fieldPath: 'visibility', value: visibility });
        showToast('人物好感度与倾向已保存！', 'success');
        const res = await backend.getCurrentState(this.chatId, this.branchId);
        this.snapshot = res.snapshot;
        this.render();
      } catch (err) {
        showToast((err instanceof Error ? err.message : String(err)) || '保存失败', 'error');
      }
    });

    // Affinity sliders live update
    const innerSlider = this.container.querySelector<HTMLInputElement>('#wm-affinity-inner');
    const outerSlider = this.container.querySelector<HTMLInputElement>('#wm-affinity-outer');
    innerSlider?.addEventListener('input', () => {
      const el = this.container.querySelector('#wm-inner-val');
      if (el) el.textContent = innerSlider.value;
    });
    outerSlider?.addEventListener('input', () => {
      const el = this.container.querySelector('#wm-outer-val');
      if (el) el.textContent = outerSlider.value;
    });

    // Add life detail, tendency, situation
    this.container.querySelector('#wm-add-life-detail')?.addEventListener('click', () => {
      const list = this.container.querySelector('#wm-life-details-list');
      if (!list) return;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; gap:8px; align-items:center;';
      row.innerHTML = '<input type="text" class="wm-input wm-life-detail-input" style="flex:1;" placeholder="新增细节..." /><button class="wm-icon-btn"><i class="fa-solid fa-trash"></i></button>';
      row.querySelector('button')?.addEventListener('click', () => row.remove());
      list.appendChild(row);
    });

    this.container.querySelector('#wm-add-tendency-btn')?.addEventListener('click', () => {
      const list = this.container.querySelector('#wm-tendencies-list');
      if (!list) return;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; gap:8px; align-items:center;';
      row.innerHTML = `<input type="text" class="wm-input wm-tendency-input" style="flex:1;" data-id="tendency_${Date.now()}" placeholder="新增长期倾向..." /><button class="wm-icon-btn"><i class="fa-solid fa-trash"></i></button>`;
      row.querySelector('button')?.addEventListener('click', () => row.remove());
      list.appendChild(row);
    });

    this.container.querySelector('#wm-add-situation-btn')?.addEventListener('click', () => {
      const list = this.container.querySelector('#wm-situations-list');
      if (!list) return;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; gap:8px; align-items:center;';
      row.innerHTML = `<input type="text" class="wm-input wm-situation-input" style="flex:1;" data-id="situation_${Date.now()}" placeholder="新增处境..." /><button class="wm-icon-btn"><i class="fa-solid fa-trash"></i></button>`;
      row.querySelector('button')?.addEventListener('click', () => row.remove());
      list.appendChild(row);
    });

    // Delete handlers for existing rows
    this.container.querySelectorAll('.wm-del-life-detail').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('div')?.remove());
    });
    this.container.querySelectorAll('.wm-del-tendency').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('div')?.remove());
    });
    this.container.querySelectorAll('.wm-del-situation').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('div')?.remove());
    });
  }
}
