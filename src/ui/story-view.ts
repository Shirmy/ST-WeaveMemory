import { backend } from '../api/backend-client';
import type { CalendarEntry, Plotline, PlotPlan, StateSnapshot, StoryState } from '../types';
import { escapeHtml as esc } from './text';
import { showToast } from './toast';

export class StoryView {
  private currentTab: 'now' | 'calendar' | 'plotlines' | 'plans' = 'now';
  private snapshot: StateSnapshot | null = null;
  private chatId: string = '';
  private branchId: string = '';

  // Calendar state
  private calYear: number = new Date().getFullYear();
  private calMonth: number = new Date().getMonth() + 1; // 1-12
  private selectedDateKey: string = '';

  constructor(private readonly container: HTMLElement) {
    const d = new Date();
    this.selectedDateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  setData(chatId: string, branchId: string, snapshot: StateSnapshot): void {
    this.chatId = chatId;
    this.branchId = branchId;
    this.snapshot = snapshot;
    this.render();
  }

  render(): void {
    if (!this.snapshot) {
      this.container.innerHTML = '<div class="wm-card">暂无故事状态数据</div>';
      return;
    }

    const story = this.snapshot.story;

    this.container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--wm-bg); padding:10px 16px; border-radius:var(--wm-radius); border:1px solid var(--wm-border);">
        <div style="display:flex; gap:6px;">
          <button class="wm-sub-btn ${this.currentTab === 'now' ? 'wm-active' : ''}" id="wm-story-tab-now"><i class="fa-solid fa-clock"></i> 现在</button>
          <button class="wm-sub-btn ${this.currentTab === 'calendar' ? 'wm-active' : ''}" id="wm-story-tab-cal"><i class="fa-solid fa-calendar-days"></i> 日历</button>
          <button class="wm-sub-btn ${this.currentTab === 'plotlines' ? 'wm-active' : ''}" id="wm-story-tab-plotlines"><i class="fa-solid fa-timeline"></i> 剧情线 (${story.plotlines?.length || 0})</button>
          <button class="wm-sub-btn ${this.currentTab === 'plans' ? 'wm-active' : ''}" id="wm-story-tab-plans"><i class="fa-solid fa-list-check"></i> 剧情安排 (${story.plotPlans?.length || 0})</button>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:16px;">
        ${this.renderCurrentTabContent(story)}
      </div>
    `;

    this.bindEvents(story);
  }

  private renderCurrentTabContent(story: StoryState): string {
    switch (this.currentTab) {
      case 'now': return this.renderNowTab(story);
      case 'calendar': return this.renderCalendarTab(story);
      case 'plotlines': return this.renderPlotlinesTab(story);
      case 'plans': return this.renderPlansTab(story);
    }
  }

  // --- 1. 现在 (Now) ---
  private renderNowTab(story: StoryState): string {
    const ongoing = story.now?.ongoing || [];
    const upcoming = story.now?.upcoming || [];
    const currentTime = story.now?.currentTime || '未知时间';

    return `
      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-hourglass-start"></i> 当前叙事时间</span>
          <button class="wm-btn wm-btn-primary" id="wm-save-now-time-btn"><i class="fa-solid fa-floppy-disk"></i> 更新时间</button>
        </div>
        <div class="wm-form-group">
          <input type="text" class="wm-input" id="wm-now-current-time" value="${esc(currentTime)}" placeholder="例如：新历344年 霜月15日 下午" />
        </div>
      </div>

      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-play"></i> 进行中事项 (Ongoing)</span>
          <button class="wm-btn wm-btn-secondary" id="wm-add-ongoing-btn"><i class="fa-solid fa-plus"></i> 添加事项</button>
        </div>
        <div id="wm-ongoing-list" style="display:flex; flex-direction:column; gap:10px;">
          ${ongoing.length === 0 ? '<div style="color:var(--wm-text-muted); font-size:12px;">暂无进行中事项</div>' : ''}
          ${ongoing.map((item, idx) => `
            <div class="wm-card" data-id="${esc(item.id)}" style="background:var(--wm-bg-alt); padding:12px; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <input type="text" class="wm-input wm-ongoing-title" value="${esc(item.title)}" placeholder="事项标题..." style="font-weight:600; flex:1; max-width:320px;" />
                <button class="wm-icon-btn wm-del-ongoing" data-idx="${idx}"><i class="fa-solid fa-trash"></i></button>
              </div>
              <textarea class="wm-textarea wm-ongoing-desc" rows="2" placeholder="事项详情描述...">${esc(item.description)}</textarea>
            </div>
          `).join('')}
        </div>
        <button class="wm-btn wm-btn-primary" id="wm-save-ongoing-btn" style="align-self:flex-end;"><i class="fa-solid fa-floppy-disk"></i> 保存进行中事项</button>
      </div>

      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-forward"></i> 即将到来事项 (Upcoming)</span>
          <button class="wm-btn wm-btn-secondary" id="wm-add-upcoming-btn"><i class="fa-solid fa-plus"></i> 添加待办</button>
        </div>
        <div id="wm-upcoming-list" style="display:flex; flex-direction:column; gap:10px;">
          ${upcoming.length === 0 ? '<div style="color:var(--wm-text-muted); font-size:12px;">暂无即将到来事项</div>' : ''}
          ${upcoming.map((item, idx) => `
            <div class="wm-card" data-id="${esc(item.id)}" style="background:var(--wm-bg-alt); padding:12px; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <input type="text" class="wm-input wm-upcoming-title" value="${esc(item.title)}" placeholder="事项标题..." style="font-weight:600; flex:1;" />
                <input type="text" class="wm-input wm-upcoming-time" value="${esc(item.expectedTime || '')}" placeholder="预计时间 (如: 明早/三日后)" style="width:160px;" />
                <button class="wm-icon-btn wm-del-upcoming" data-idx="${idx}"><i class="fa-solid fa-trash"></i></button>
              </div>
              <textarea class="wm-textarea wm-upcoming-desc" rows="2" placeholder="待办描述...">${esc(item.description)}</textarea>
            </div>
          `).join('')}
        </div>
        <button class="wm-btn wm-btn-primary" id="wm-save-upcoming-btn" style="align-self:flex-end;"><i class="fa-solid fa-floppy-disk"></i> 保存即将到来事项</button>
      </div>
    `;
  }

  // --- 2. 日历 (Calendar) ---
  private renderCalendarTab(story: StoryState): string {
    const calendar = story.calendar || [];
    const dateMap = new Map<string, CalendarEntry[]>();
    for (const e of calendar) {
      const arr = dateMap.get(e.dateKey) || [];
      arr.push(e);
      dateMap.set(e.dateKey, arr);
    }

    const firstDayIndex = new Date(this.calYear, this.calMonth - 1, 1).getDay(); // 0 is Sun
    const daysInMonth = new Date(this.calYear, this.calMonth, 0).getDate();
    const cells: string[] = [];

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push('<div class="wm-cal-cell" style="opacity:0.25; pointer-events:none;"></div>');
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${this.calYear}-${String(this.calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = key === this.selectedDateKey;
      const entries = dateMap.get(key) || [];
      cells.push(`
        <div class="wm-cal-cell ${isSelected ? 'selected' : ''}" data-date-key="${key}">
          <span style="font-weight:600; font-size:12px;">${day}</span>
          ${entries.length > 0 ? `
            <div class="wm-cal-dots">
              ${entries.slice(0, 3).map(() => '<span class="wm-cal-dot"></span>').join('')}
            </div>
          ` : ''}
        </div>
      `);
    }

    const selectedEntries = dateMap.get(this.selectedDateKey) || [];

    return `
      <div class="wm-card wm-cal-container">
        <div class="wm-cal-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="wm-icon-btn" id="wm-cal-prev-month"><i class="fa-solid fa-chevron-left"></i></button>
            <span style="font-size:15px; font-weight:600;">${this.calYear} 年 ${this.calMonth} 月</span>
            <button class="wm-icon-btn" id="wm-cal-next-month"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
          <button class="wm-btn wm-btn-secondary" id="wm-cal-today-btn">回到今天</button>
        </div>

        <div class="wm-cal-grid">
          <div class="wm-cal-day-head">日</div>
          <div class="wm-cal-day-head">一</div>
          <div class="wm-cal-day-head">二</div>
          <div class="wm-cal-day-head">三</div>
          <div class="wm-cal-day-head">四</div>
          <div class="wm-cal-day-head">五</div>
          <div class="wm-cal-day-head">六</div>
          ${cells.join('')}
        </div>
      </div>

      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-calendar-check"></i> ${this.selectedDateKey} 当日事件 (${selectedEntries.length})</span>
          <button class="wm-btn wm-btn-secondary" id="wm-add-cal-event-btn"><i class="fa-solid fa-plus"></i> 添加事件</button>
        </div>

        <div id="wm-cal-entries-list" style="display:flex; flex-direction:column; gap:10px;">
          ${selectedEntries.length === 0 ? '<div style="color:var(--wm-text-muted); font-size:12px;">该日暂无剧情或纪念事件</div>' : ''}
          ${selectedEntries.map(e => `
            <div class="wm-card" data-id="${esc(e.id)}" style="background:var(--wm-bg-alt); padding:12px; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <select class="wm-select wm-cal-type" style="width:110px;">
                  <option value="story" ${e.type === 'story' ? 'selected' : ''}>剧情</option>
                  <option value="festival" ${e.type === 'festival' ? 'selected' : ''}>节日</option>
                  <option value="birthday" ${e.type === 'birthday' ? 'selected' : ''}>生日</option>
                  <option value="anniversary" ${e.type === 'anniversary' ? 'selected' : ''}>纪念日</option>
                  <option value="custom" ${e.type === 'custom' ? 'selected' : ''}>自定义</option>
                </select>
                <input type="text" class="wm-input wm-cal-title" value="${esc(e.title)}" placeholder="事件标题..." style="font-weight:600; flex:1;" />
                <button class="wm-icon-btn wm-del-cal-entry" data-id="${esc(e.id)}"><i class="fa-solid fa-trash"></i></button>
              </div>
              <textarea class="wm-textarea wm-cal-desc" rows="2" placeholder="事件内容详情...">${esc(e.description)}</textarea>
            </div>
          `).join('')}
        </div>

          <button class="wm-btn wm-btn-primary" id="wm-save-cal-btn" style="align-self:flex-end;"><i class="fa-solid fa-floppy-disk"></i> 保存当日事件</button>
      </div>
    `;
  }

  // --- 3. 剧情线 (Plotlines) ---
  private renderPlotlinesTab(story: StoryState): string {
    const plotlines = story.plotlines || [];
    const stages = ['起线', '延展', '成形', '收束', '淡出'] as const;

    return `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:13px; color:var(--wm-text-muted);">共 ${plotlines.length} 条剧情线，支持五阶段生命周期演进</span>
        <button class="wm-btn wm-btn-secondary" id="wm-add-plotline-btn"><i class="fa-solid fa-plus"></i> 新建剧情线</button>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px;">
        ${plotlines.length === 0 ? '<div class="wm-card">暂无剧情线</div>' : ''}
        ${plotlines.map(p => {
          const isPinned = Boolean(p.pinned);
          const isStalled = Boolean(p.stalled);
          return `
            <div class="wm-card" style="border-left: 4px solid ${isPinned ? 'var(--wm-accent)' : 'var(--wm-card-border)'};">
              <div class="wm-card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <input class="wm-input wm-plotline-name" data-id="${esc(p.id)}" value="${esc(p.name)}" aria-label="剧情线名称" />
                  <select class="wm-select wm-plotline-stage" data-id="${esc(p.id)}" style="padding:2px 8px; font-size:12px;">
                    ${stages.map(s => `<option value="${s}" ${p.stage === s ? 'selected' : ''}>${s}</option>`).join('')}
                  </select>
                  ${isStalled ? '<span style="font-size:10px; background:rgba(239,68,68,0.2); color:#f87171; padding:2px 6px; border-radius:4px;">停滞</span>' : ''}
                </div>
                <div class="wm-drawer-actions">
                  <button class="wm-icon-btn wm-toggle-pin-plotline" data-id="${esc(p.id)}" title="${isPinned ? '取消置顶' : '置顶剧情线'}" style="${isPinned ? 'color:var(--wm-accent);' : ''}">
                    <i class="fa-solid fa-thumbtack"></i>
                  </button>
                  <button class="wm-icon-btn wm-del-plotline" data-id="${esc(p.id)}" title="删除剧情线"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="wm-form-group">
                  <span class="wm-label">当前状态 (Current State)</span>
                  <textarea class="wm-textarea wm-plotline-state" data-id="${esc(p.id)}" rows="2">${esc(p.currentState)}</textarea>
                </div>
                <div class="wm-form-group">
                  <span class="wm-label">下一步动向 (Next Step)</span>
                  <textarea class="wm-textarea wm-plotline-next" data-id="${esc(p.id)}" rows="2">${esc(p.nextStep)}</textarea>
                </div>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--wm-text-muted);">
                <label>相关人物（ID，逗号分隔）<input class="wm-input wm-plotline-characters" data-id="${esc(p.id)}" value="${esc(p.relatedCharacterIds?.join(', ') ?? '')}" /></label>
                <button class="wm-btn wm-btn-primary wm-save-single-plotline" data-id="${esc(p.id)}"><i class="fa-solid fa-floppy-disk"></i> 保存此线</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // --- 4. 剧情安排 (Plot Plans) ---
  private renderPlansTab(story: StoryState): string {
    const plans = story.plotPlans || [];
    const types = ['明线', '暗线', '红线'] as const;
    const times = ['今天', '明天', '后天', '未来'] as const;
    const statuses = [
      { id: 'planned', label: '计划中' },
      { id: 'triggered', label: '已触发' },
      { id: 'cancelled', label: '已取消' },
      { id: 'expired', label: '已过期' }
    ] as const;

    return `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:13px; color:var(--wm-text-muted);">共 ${plans.length} 条规划安排 (明线/暗线/红线)</span>
        <button class="wm-btn wm-btn-secondary" id="wm-add-plan-btn"><i class="fa-solid fa-plus"></i> 新建剧情安排</button>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px;">
        ${plans.length === 0 ? '<div class="wm-card">暂无剧情安排</div>' : ''}
        ${plans.map(pl => {
          const isPinned = Boolean(pl.pinned);
          const colorMap: Record<string, string> = {
            '明线': '#38bdf8',
            '暗线': '#a855f7',
            '红线': '#ef4444'
          };
          const color = colorMap[pl.type] || 'var(--wm-accent)';

          return `
            <div class="wm-card" style="border-left:4px solid ${color};">
              <div class="wm-card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <select class="wm-select wm-plan-type" data-id="${esc(pl.id)}" style="color:${color}; font-weight:600; padding:2px 8px; font-size:12px;">
                    ${types.map(t => `<option value="${t}" ${pl.type === t ? 'selected' : ''}>${t}</option>`).join('')}
                  </select>
                  <select class="wm-select wm-plan-time" data-id="${esc(pl.id)}" style="padding:2px 8px; font-size:12px;">
                    ${times.map(tm => `<option value="${tm}" ${pl.time === tm ? 'selected' : ''}>${tm}</option>`).join('')}
                  </select>
                  <input type="text" class="wm-input wm-plan-title" data-id="${esc(pl.id)}" value="${esc(pl.title)}" style="font-weight:600; flex:1; max-width:260px;" />
                </div>
                <div class="wm-drawer-actions">
                  <select class="wm-select wm-plan-status" data-id="${esc(pl.id)}" style="padding:2px 8px; font-size:12px;">
                    ${statuses.map(st => `<option value="${st.id}" ${pl.status === st.id ? 'selected' : ''}>${st.label}</option>`).join('')}
                  </select>
                  <button class="wm-icon-btn wm-toggle-pin-plan" data-id="${esc(pl.id)}" title="${isPinned ? '取消置顶' : '置顶'}" style="${isPinned ? 'color:var(--wm-accent);' : ''}">
                    <i class="fa-solid fa-thumbtack"></i>
                  </button>
                  <button class="wm-icon-btn wm-del-plan" data-id="${esc(pl.id)}" title="删除"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>

              <div class="wm-form-group">
                <label>相关剧情线（ID，逗号分隔）<input class="wm-input wm-plan-plotlines" data-id="${esc(pl.id)}" value="${esc(pl.relatedPlotlineIds?.join(', ') ?? '')}" /></label>
                <textarea class="wm-textarea wm-plan-desc" data-id="${esc(pl.id)}" rows="2" placeholder="安排详细说明...">${esc(pl.description)}</textarea>
              </div>

              <div style="display:flex; justify-content:flex-end;">
                <button class="wm-btn wm-btn-primary wm-save-single-plan" data-id="${esc(pl.id)}"><i class="fa-solid fa-floppy-disk"></i> 保存安排</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // --- Bind All Events ---
  private bindEvents(story: StoryState): void {
    // Tab switching
    this.container.querySelector('#wm-story-tab-now')?.addEventListener('click', () => { this.currentTab = 'now'; this.render(); });
    this.container.querySelector('#wm-story-tab-cal')?.addEventListener('click', () => { this.currentTab = 'calendar'; this.render(); });
    this.container.querySelector('#wm-story-tab-plotlines')?.addEventListener('click', () => { this.currentTab = 'plotlines'; this.render(); });
    this.container.querySelector('#wm-story-tab-plans')?.addEventListener('click', () => { this.currentTab = 'plans'; this.render(); });

    // 1. Now events
    this.container.querySelector('#wm-save-now-time-btn')?.addEventListener('click', async () => {
      const timeVal = (this.container.querySelector('#wm-now-current-time') as HTMLInputElement)?.value || '';
      try {
        await backend.manualEditState({
          chatId: this.chatId,
          branchId: this.branchId,
          target: 'story',
          fieldPath: 'now.currentTime',
          value: timeVal
        });
        showToast('叙事时间已更新！', 'success');
        const res = await backend.getCurrentState(this.chatId, this.branchId);
        this.snapshot = res.snapshot;
        this.render();
      } catch (err) {
        showToast((err instanceof Error ? err.message : String(err)) || '更新失败', 'error');
      }
    });

    this.container.querySelector('#wm-add-ongoing-btn')?.addEventListener('click', () => {
      const list = this.container.querySelector('#wm-ongoing-list');
      if (!list) return;
      const card = document.createElement('div');
      card.className = 'wm-card';
      card.style.cssText = 'background:var(--wm-bg-alt); padding:12px; gap:8px;';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <input type="text" class="wm-input wm-ongoing-title" placeholder="新增事项标题..." style="font-weight:600; flex:1; max-width:320px;" />
          <button class="wm-icon-btn"><i class="fa-solid fa-trash"></i></button>
        </div>
        <textarea class="wm-textarea wm-ongoing-desc" rows="2" placeholder="事项详情描述..."></textarea>
      `;
      card.querySelector('button')?.addEventListener('click', () => card.remove());
      list.appendChild(card);
    });

    this.container.querySelector('#wm-save-ongoing-btn')?.addEventListener('click', async () => {
      const cards = this.container.querySelectorAll('#wm-ongoing-list .wm-card');
      const items = Array.from(cards).map(card => ({
        ...story.now?.ongoing.find(item => item.id === (card as HTMLElement).dataset.id),
        id: (card as HTMLElement).dataset.id || crypto.randomUUID(),
        title: (card.querySelector('.wm-ongoing-title') as HTMLInputElement)?.value.trim() || undefined,
        description: (card.querySelector('.wm-ongoing-desc') as HTMLTextAreaElement)?.value.trim() || undefined
      })).filter(i => i.title);

      try {
        await backend.manualEditState({
          chatId: this.chatId,
          branchId: this.branchId,
          target: 'story',
          fieldPath: 'now.ongoing',
          value: items
        });
        showToast('进行中事项已保存！', 'success');
        const res = await backend.getCurrentState(this.chatId, this.branchId);
        this.snapshot = res.snapshot;
        this.render();
      } catch (err) {
        showToast((err instanceof Error ? err.message : String(err)) || '保存失败', 'error');
      }
    });

    this.container.querySelector('#wm-add-upcoming-btn')?.addEventListener('click', () => {
      const list = this.container.querySelector('#wm-upcoming-list');
      if (!list) return;
      const card = document.createElement('div');
      card.className = 'wm-card';
      card.style.cssText = 'background:var(--wm-bg-alt); padding:12px; gap:8px;';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <input type="text" class="wm-input wm-upcoming-title" placeholder="待办标题..." style="font-weight:600; flex:1;" />
          <input type="text" class="wm-input wm-upcoming-time" placeholder="预计时间" style="width:160px;" />
          <button class="wm-icon-btn"><i class="fa-solid fa-trash"></i></button>
        </div>
        <textarea class="wm-textarea wm-upcoming-desc" rows="2" placeholder="待办描述..."></textarea>
      `;
      card.querySelector('button')?.addEventListener('click', () => card.remove());
      list.appendChild(card);
    });

    this.container.querySelector('#wm-save-upcoming-btn')?.addEventListener('click', async () => {
      const cards = this.container.querySelectorAll('#wm-upcoming-list .wm-card');
      const items = Array.from(cards).map(card => ({
        ...story.now?.upcoming.find(item => item.id === (card as HTMLElement).dataset.id),
        id: (card as HTMLElement).dataset.id || crypto.randomUUID(),
        title: (card.querySelector('.wm-upcoming-title') as HTMLInputElement)?.value.trim() || undefined,
        expectedTime: (card.querySelector('.wm-upcoming-time') as HTMLInputElement)?.value.trim() || undefined,
        description: (card.querySelector('.wm-upcoming-desc') as HTMLTextAreaElement)?.value.trim() || undefined
      })).filter(i => i.title);

      try {
        await backend.manualEditState({
          chatId: this.chatId,
          branchId: this.branchId,
          target: 'story',
          fieldPath: 'now.upcoming',
          value: items
        });
        showToast('即将到来事项已保存！', 'success');
        const res = await backend.getCurrentState(this.chatId, this.branchId);
        this.snapshot = res.snapshot;
        this.render();
      } catch (err) {
        showToast((err instanceof Error ? err.message : String(err)) || '保存失败', 'error');
      }
    });

    // 2. Calendar events
    this.container.querySelectorAll('.wm-cal-cell[data-date-key]').forEach(cell => {
      cell.addEventListener('click', () => {
        const key = (cell as HTMLElement).dataset.dateKey;
        if (key) {
          this.selectedDateKey = key;
          this.render();
        }
      });
    });

    this.container.querySelector('#wm-cal-prev-month')?.addEventListener('click', () => {
      if (this.calMonth === 1) { this.calMonth = 12; this.calYear -= 1; } else { this.calMonth -= 1; }
      this.render();
    });
    this.container.querySelector('#wm-cal-next-month')?.addEventListener('click', () => {
      if (this.calMonth === 12) { this.calMonth = 1; this.calYear += 1; } else { this.calMonth += 1; }
      this.render();
    });
    this.container.querySelector('#wm-cal-today-btn')?.addEventListener('click', () => {
      const d = new Date();
      this.calYear = d.getFullYear();
      this.calMonth = d.getMonth() + 1;
      this.selectedDateKey = `${this.calYear}-${String(this.calMonth).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      this.render();
    });

    this.container.querySelector('#wm-add-cal-event-btn')?.addEventListener('click', () => {
      const list = this.container.querySelector('#wm-cal-entries-list');
      if (!list) return;
      const card = document.createElement('div');
      card.className = 'wm-card';
      card.style.cssText = 'background:var(--wm-bg-alt); padding:12px; gap:8px;';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <select class="wm-select wm-cal-type" style="width:110px;">
            <option value="story">剧情</option>
            <option value="festival">节日</option>
            <option value="birthday">生日</option>
            <option value="anniversary">纪念日</option>
            <option value="custom">自定义</option>
          </select>
          <input type="text" class="wm-input wm-cal-title" placeholder="事件标题..." style="font-weight:600; flex:1;" />
          <button class="wm-icon-btn"><i class="fa-solid fa-trash"></i></button>
        </div>
        <textarea class="wm-textarea wm-cal-desc" rows="2" placeholder="事件内容详情..."></textarea>
      `;
      card.querySelector('button')?.addEventListener('click', () => card.remove());
      list.appendChild(card);
    });

    this.container.querySelector('#wm-save-cal-btn')?.addEventListener('click', async () => {
      const cards = this.container.querySelectorAll('#wm-cal-entries-list .wm-card');
      const newEntriesForDate: CalendarEntry[] = Array.from(cards).map(card => ({
        ...story.calendar.find(item => item.id === (card as HTMLElement).dataset.id),
        id: (card as HTMLElement).dataset.id || crypto.randomUUID(),
        dateKey: this.selectedDateKey,
        type: ((card.querySelector('.wm-cal-type') as HTMLSelectElement)?.value || 'story') as CalendarEntry['type'],
        confirmed: true,
        title: (card.querySelector('.wm-cal-title') as HTMLInputElement)?.value.trim() || '',
        description: (card.querySelector('.wm-cal-desc') as HTMLTextAreaElement)?.value.trim() || undefined
      })).filter(e => e.title);

      // Keep entries for other dates
      const remaining = (story.calendar || []).filter(e => e.dateKey !== this.selectedDateKey);
      const updatedCalendar = [...remaining, ...newEntriesForDate];

      try {
        await backend.manualEditState({
          chatId: this.chatId,
          branchId: this.branchId,
          target: 'story',
          fieldPath: 'calendar',
          value: updatedCalendar
        });
        showToast('日历事件已保存！', 'success');
        const res = await backend.getCurrentState(this.chatId, this.branchId);
        this.snapshot = res.snapshot;
        this.render();
      } catch (err) {
        showToast((err instanceof Error ? err.message : String(err)) || '保存失败', 'error');
      }
    });

    // Delete calendar entry
    this.container.querySelectorAll('.wm-del-cal-entry').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.wm-card')?.remove());
    });

    // 3. Plotline events
    this.container.querySelector('#wm-add-plotline-btn')?.addEventListener('click', async () => {
      const name = prompt('请输入新剧情线名称：');
      if (!name?.trim()) return;
      const newPlotline: Plotline = {
        id: `plot_${Date.now()}`,
        name: name.trim(),
        stage: '起线',
        currentState: '刚刚建立',
        nextStep: '待发展',
        updatedAt: new Date().toISOString()
      };
      const updated = [...(story.plotlines || []), newPlotline];
      try {
        await backend.manualEditState({
          chatId: this.chatId,
          branchId: this.branchId,
          target: 'story',
          fieldPath: 'plotlines',
          value: updated
        });
        showToast(`已创建剧情线：${name.trim()}`, 'success');
        const res = await backend.getCurrentState(this.chatId, this.branchId);
        this.snapshot = res.snapshot;
        this.render();
      } catch (err) {
        showToast((err instanceof Error ? err.message : String(err)) || '创建失败', 'error');
      }
    });

    this.container.querySelectorAll('.wm-save-single-plotline').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;
        const stage = (this.container.querySelector(`.wm-plotline-stage[data-id="${CSS.escape(id)}"]`) as HTMLSelectElement)?.value as Plotline['stage'];
        const state = (this.container.querySelector(`.wm-plotline-state[data-id="${CSS.escape(id)}"]`) as HTMLTextAreaElement)?.value || '';
        const next = (this.container.querySelector(`.wm-plotline-next[data-id="${CSS.escape(id)}"]`) as HTMLTextAreaElement)?.value || '';

        const name = this.container.querySelector<HTMLInputElement>(`.wm-plotline-name[data-id="${CSS.escape(id)}"]`)!.value.trim();
        const updated = (story.plotlines || []).map(p => p.id === id ? { ...p, name, stage, currentState: state, nextStep: next || undefined, updatedAt: new Date().toISOString(), relatedCharacterIds: this.container.querySelector<HTMLInputElement>(`.wm-plotline-characters[data-id="${CSS.escape(id)}"]`)!.value.split(/[,，]/).map(value => value.trim()).filter(Boolean) } : p);
        try {
          await backend.manualEditState({
            chatId: this.chatId,
            branchId: this.branchId,
            target: 'story',
            fieldPath: 'plotlines',
            value: updated
          });
          showToast('剧情线已保存！', 'success');
          const res = await backend.getCurrentState(this.chatId, this.branchId);
          this.snapshot = res.snapshot;
          this.render();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '保存失败', 'error');
        }
      });
    });

    this.container.querySelectorAll('.wm-toggle-pin-plotline').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;
        const updated = (story.plotlines || []).map(p => p.id === id ? { ...p, pinned: !p.pinned } : p);
        try {
          await backend.manualEditState({
            chatId: this.chatId,
            branchId: this.branchId,
            target: 'story',
            fieldPath: 'plotlines',
            value: updated
          });
          const res = await backend.getCurrentState(this.chatId, this.branchId);
          this.snapshot = res.snapshot;
          this.render();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '修改失败', 'error');
        }
      });
    });

    this.container.querySelectorAll('.wm-del-plotline').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id || !confirm('确定要删除此剧情线吗？')) return;
        const updated = (story.plotlines || []).filter(p => p.id !== id);
        try {
          await backend.manualEditState({
            chatId: this.chatId,
            branchId: this.branchId,
            target: 'story',
            fieldPath: 'plotlines',
            value: updated
          });
          showToast('剧情线已删除', 'info');
          const res = await backend.getCurrentState(this.chatId, this.branchId);
          this.snapshot = res.snapshot;
          this.render();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '删除失败', 'error');
        }
      });
    });

    // 4. Plan events
    this.container.querySelector('#wm-add-plan-btn')?.addEventListener('click', async () => {
      const title = prompt('请输入新剧情安排标题：');
      if (!title?.trim()) return;
      const newPlan: PlotPlan = {
        id: `plan_${Date.now()}`,
        type: '明线',
        title: title.trim(),
        time: '今天',
        status: 'planned',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const updated = [...(story.plotPlans || []), newPlan];
      try {
        await backend.manualEditState({
          chatId: this.chatId,
          branchId: this.branchId,
          target: 'story',
          fieldPath: 'plotPlans',
          value: updated
        });
        showToast(`已创建剧情安排：${title.trim()}`, 'success');
        const res = await backend.getCurrentState(this.chatId, this.branchId);
        this.snapshot = res.snapshot;
        this.render();
      } catch (err) {
        showToast((err instanceof Error ? err.message : String(err)) || '创建失败', 'error');
      }
    });

    this.container.querySelectorAll('.wm-save-single-plan').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;
        const type = (this.container.querySelector(`.wm-plan-type[data-id="${CSS.escape(id)}"]`) as HTMLSelectElement)?.value as PlotPlan['type'];
        const time = (this.container.querySelector(`.wm-plan-time[data-id="${CSS.escape(id)}"]`) as HTMLSelectElement)?.value as PlotPlan['time'];
        const title = (this.container.querySelector(`.wm-plan-title[data-id="${CSS.escape(id)}"]`) as HTMLInputElement)?.value || '';
        const status = (this.container.querySelector(`.wm-plan-status[data-id="${CSS.escape(id)}"]`) as HTMLSelectElement)?.value as PlotPlan['status'];
        const desc = (this.container.querySelector(`.wm-plan-desc[data-id="${CSS.escape(id)}"]`) as HTMLTextAreaElement)?.value || '';

        const updated = (story.plotPlans || []).map(p => p.id === id ? { ...p, type, time, title, status, description: desc || undefined, updatedAt: new Date().toISOString(), relatedPlotlineIds: this.container.querySelector<HTMLInputElement>(`.wm-plan-plotlines[data-id="${CSS.escape(id)}"]`)!.value.split(/[,，]/).map(value => value.trim()).filter(Boolean) } : p);
        try {
          await backend.manualEditState({
            chatId: this.chatId,
            branchId: this.branchId,
            target: 'story',
            fieldPath: 'plotPlans',
            value: updated
          });
          showToast('剧情安排已保存！', 'success');
          const res = await backend.getCurrentState(this.chatId, this.branchId);
          this.snapshot = res.snapshot;
          this.render();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '保存失败', 'error');
        }
      });
    });

    this.container.querySelectorAll('.wm-toggle-pin-plan').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;
        const updated = (story.plotPlans || []).map(p => p.id === id ? { ...p, pinned: !p.pinned } : p);
        try {
          await backend.manualEditState({
            chatId: this.chatId,
            branchId: this.branchId,
            target: 'story',
            fieldPath: 'plotPlans',
            value: updated
          });
          const res = await backend.getCurrentState(this.chatId, this.branchId);
          this.snapshot = res.snapshot;
          this.render();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '修改失败', 'error');
        }
      });
    });

    this.container.querySelectorAll('.wm-del-plan').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id || !confirm('确定要删除此剧情安排吗？')) return;
        const updated = (story.plotPlans || []).filter(p => p.id !== id);
        try {
          await backend.manualEditState({
            chatId: this.chatId,
            branchId: this.branchId,
            target: 'story',
            fieldPath: 'plotPlans',
            value: updated
          });
          showToast('剧情安排已删除', 'info');
          const res = await backend.getCurrentState(this.chatId, this.branchId);
          this.snapshot = res.snapshot;
          this.render();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '删除失败', 'error');
        }
      });
    });
  }
}
