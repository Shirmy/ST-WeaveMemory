import { backend } from '../api/backend-client';
import type { LongMemoryRecord, RecallDebugResponse } from '../types';
import { showToast } from './toast';

export class MemoryView {
  private memories: LongMemoryRecord[] = [];
  private chatId: string = '';
  private branchId: string = '';
  private includeStale: boolean = false;
  private searchQuery: string = '';
  private filterCharacter: string = '';
  private isTestingRecall: boolean = false;
  private recallResult: RecallDebugResponse | null = null;

  constructor(private readonly container: HTMLElement) {}

  async setData(chatId: string, branchId: string): Promise<void> {
    this.chatId = chatId;
    this.branchId = branchId;
    await this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this.chatId) return;
    try {
      const res = await backend.listMemories(this.chatId, this.branchId, this.includeStale);
      this.memories = res.memories || [];
      this.render();
    } catch (err: any) {
      showToast(err.message || '获取长期记忆失败', 'error');
    }
  }

  render(): void {
    const characters = Array.from(new Set(this.memories.flatMap(m => m.characterIds || [])));
    const filtered = this.memories.filter(m => {
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchesSummary = m.summary?.toLowerCase().includes(q);
        const matchesTags = m.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchesSummary && !matchesTags) return false;
      }
      if (this.filterCharacter && !m.characterIds?.includes(this.filterCharacter)) {
        return false;
      }
      return true;
    });

    this.container.innerHTML = `
      <!-- Top Actions & Filter Bar -->
      <div class="wm-card" style="padding:12px; gap:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:260px;">
            <input type="text" class="wm-input" id="wm-mem-search" value="${this.searchQuery}" placeholder="搜索记忆摘要或标签..." style="flex:1;" />
            <select class="wm-select" id="wm-mem-filter-char" style="width:130px;">
              <option value="">全部人物</option>
              ${characters.map(c => `<option value="${c}" ${this.filterCharacter === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <label style="font-size:12px; display:flex; align-items:center; gap:6px; cursor:pointer; color:var(--wm-text-muted);">
              <input type="checkbox" id="wm-mem-include-stale" ${this.includeStale ? 'checked' : ''} /> 显示已禁用记忆
            </label>
            <button class="wm-btn wm-btn-secondary" id="wm-mem-rebuild-vec-btn" title="重建当前分支的向量索引"><i class="fa-solid fa-arrows-rotate"></i> 重建向量</button>
            <button class="wm-btn wm-btn-primary" id="wm-mem-refresh-btn"><i class="fa-solid fa-rotate"></i> 刷新</button>
          </div>
        </div>
      </div>

      <!-- Recall Debugger Section -->
      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-vial"></i> 记忆召回测试器 (Recall Debugger)</span>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="text" class="wm-input" id="wm-recall-query-input" placeholder="输入对话情境进行召回测试 (例如：我们昨晚在客栈聊到了谁？)..." style="flex:1;" />
          <button class="wm-btn wm-btn-primary" id="wm-run-recall-btn"><i class="fa-solid fa-magnifying-glass"></i> 测试召回</button>
        </div>
        <div id="wm-recall-result-area">
          ${this.renderRecallResult()}
        </div>
      </div>

      <!-- Memories List -->
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:13px; color:var(--wm-text-muted);">记忆列表 (${filtered.length} / ${this.memories.length})</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px;">
        ${filtered.length === 0 ? '<div class="wm-card" style="text-align:center; padding:32px; color:var(--wm-text-muted);">暂无符合条件的长期记忆</div>' : ''}
        ${filtered.map(m => {
          const isStale = Boolean(m.stale);
          return `
            <div class="wm-card" style="${isStale ? 'opacity:0.6; border-style:dashed;' : ''}">
              <div class="wm-card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="wm-status-badge synced" style="font-size:11px;">#${m.startFloor} ~ #${m.endFloor} 楼</span>
                  ${m.narrativeTime ? `<span style="font-size:12px; color:var(--wm-accent);"><i class="fa-solid fa-calendar-day"></i> ${m.narrativeTime}</span>` : ''}
                  ${m.title ? `<span style="font-weight:600; font-size:14px;">${m.title}</span>` : ''}
                  ${isStale ? '<span class="wm-status-badge failed" style="font-size:10px;">已禁用</span>' : ''}
                </div>
                <div class="wm-drawer-actions">
                  <span title="BM25索引状态" style="font-size:11px; color:${m.bm25Indexed ? '#4ade80' : 'var(--wm-text-muted)'};">
                    <i class="fa-solid fa-font"></i> BM25
                  </span>
                  <span title="向量索引状态" style="font-size:11px; color:${m.embeddingIndexed ? '#38bdf8' : 'var(--wm-text-muted)'};">
                    <i class="fa-solid fa-draw-polygon"></i> 向量
                  </span>
                  <button class="wm-btn wm-btn-secondary wm-toggle-mem-stale-btn" data-id="${m.memoryId}" data-stale="${isStale ? '1' : '0'}" style="padding:4px 8px; font-size:12px;">
                    ${isStale ? '<i class="fa-solid fa-eye"></i> 启用' : '<i class="fa-solid fa-eye-slash"></i> 禁用'}
                  </button>
                </div>
              </div>

              <div style="font-size:13px; line-height:1.6; color:var(--wm-text); white-space:pre-wrap;">${m.summary}</div>

              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; font-size:11px; color:var(--wm-text-muted); border-top:1px solid rgba(255,255,255,0.05); padding-top:8px;">
                <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                  ${(m.characterIds || []).map(c => `<span style="background:rgba(99,102,241,0.15); color:#a5b4fc; padding:2px 6px; border-radius:4px;"><i class="fa-solid fa-user"></i> ${c}</span>`).join('')}
                  ${(m.plotlineIds || []).map(p => `<span style="background:rgba(56,189,248,0.15); color:#7dd3fc; padding:2px 6px; border-radius:4px;"><i class="fa-solid fa-timeline"></i> ${p}</span>`).join('')}
                  ${(m.tags || []).map(t => `<span style="background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px;">#${t}</span>`).join('')}
                </div>
                <div>来源楼层: [${m.sourceFloorIds?.length || 0} 个]</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    this.bindEvents();
  }

  private renderRecallResult(): string {
    if (!this.recallResult) return '';
    const { candidates, final, pack, timings } = this.recallResult;

    return `
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:12px; background:var(--wm-bg-alt); padding:14px; border-radius:var(--wm-radius); border:1px solid var(--wm-border);">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--wm-text-muted);">
          <span>耗时分解: 总计 ${timings.totalMs}ms (BM25: ${timings.bm25Ms}ms | 向量: ${timings.embeddingMs}ms | RRF: ${timings.rrfMs}ms | Rerank: ${timings.rerankMs}ms)</span>
          <span style="color:var(--wm-accent); font-weight:600;">最终召回: ${final.length} 条 (占用 ${pack.tokens} Tokens)</span>
        </div>

        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; font-size:11px;">
          <div class="wm-card" style="padding:8px; background:var(--wm-bg);">
            <div style="font-weight:600; color:#4ade80;">BM25 候选 (${candidates.bm25?.length || 0})</div>
            ${(candidates.bm25 || []).slice(0, 3).map(c => `<div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.memoryId.slice(0, 8)}... (${c.score.toFixed(2)})</div>`).join('')}
          </div>
          <div class="wm-card" style="padding:8px; background:var(--wm-bg);">
            <div style="font-weight:600; color:#38bdf8;">向量 候选 (${candidates.embedding?.length || 0})</div>
            ${(candidates.embedding || []).slice(0, 3).map(c => `<div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.memoryId.slice(0, 8)}... (${c.score.toFixed(3)})</div>`).join('')}
          </div>
          <div class="wm-card" style="padding:8px; background:var(--wm-bg);">
            <div style="font-weight:600; color:#fbbf24;">RRF 融合 (${candidates.rrf?.length || 0})</div>
            ${(candidates.rrf || []).slice(0, 3).map(c => `<div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.memoryId.slice(0, 8)}... (${c.score.toFixed(4)})</div>`).join('')}
          </div>
          <div class="wm-card" style="padding:8px; background:var(--wm-bg);">
            <div style="font-weight:600; color:#f43f5e;">Rerank 重排 (${candidates.rerank?.length || 0})</div>
            ${(candidates.rerank || []).slice(0, 3).map(c => `<div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.memoryId.slice(0, 8)}... (${c.score.toFixed(3)})</div>`).join('')}
          </div>
        </div>

        <div style="font-size:12px; font-weight:600;">注入文本预览 (Packed Text):</div>
        <textarea class="wm-textarea" rows="4" readonly style="font-family:monospace; font-size:11px;">${pack.text}</textarea>
      </div>
    `;
  }

  private bindEvents(): void {
    // Search input
    const searchInput = this.container.querySelector<HTMLInputElement>('#wm-mem-search');
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      this.render();
    });

    // Character filter
    const charSelect = this.container.querySelector<HTMLSelectElement>('#wm-mem-filter-char');
    charSelect?.addEventListener('change', () => {
      this.filterCharacter = charSelect.value;
      this.render();
    });

    // Stale toggle
    const staleCheckbox = this.container.querySelector<HTMLInputElement>('#wm-mem-include-stale');
    staleCheckbox?.addEventListener('change', async () => {
      this.includeStale = staleCheckbox.checked;
      await this.refresh();
    });

    // Refresh btn
    this.container.querySelector('#wm-mem-refresh-btn')?.addEventListener('click', () => this.refresh());

    // Rebuild vectors btn
    this.container.querySelector('#wm-mem-rebuild-vec-btn')?.addEventListener('click', async () => {
      try {
        showToast('正在重建向量索引...', 'info');
        const res = await backend.rebuildVectors(this.chatId, this.branchId);
        showToast(`向量重建完成，处理了 ${res.processed} 条记忆`, 'success');
        await this.refresh();
      } catch (err: any) {
        showToast(err.message || '重建向量索引失败', 'error');
      }
    });

    // Single memory toggle stale (disable / enable)
    this.container.querySelectorAll('.wm-toggle-mem-stale-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        const currentStale = (btn as HTMLElement).dataset.stale === '1';
        if (!id) return;
        try {
          await backend.toggleMemoryActive(id, !currentStale);
          showToast(!currentStale ? '已禁用该条记忆' : '已恢复该条记忆', 'success');
          await this.refresh();
        } catch (err: any) {
          showToast(err.message || '操作失败', 'error');
        }
      });
    });

    // Run recall debug
    this.container.querySelector('#wm-run-recall-btn')?.addEventListener('click', async () => {
      const query = (this.container.querySelector('#wm-recall-query-input') as HTMLInputElement)?.value.trim();
      if (!query) {
        showToast('请输入召回测试情境词', 'warning');
        return;
      }
      try {
        showToast('正在执行召回测试...', 'info');
        this.recallResult = await backend.recallDebug({
          chatId: this.chatId,
          branchId: this.branchId,
          query
        });
        showToast('召回测试完成！', 'success');
        this.render();
      } catch (err: any) {
        showToast(err.message || '召回测试失败', 'error');
      }
    });
  }
}
