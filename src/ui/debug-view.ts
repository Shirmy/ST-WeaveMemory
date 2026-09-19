import { backend } from '../api/backend-client';
import type { CurrentStateResponse, StateTaskRecord, DebugResponse } from '../types';
import { escapeHtml as esc } from './text';
import { showToast } from './toast';

export class DebugView {
  private chatId: string = '';
  private branchId: string = '';
  private stateInfo: CurrentStateResponse | null = null;
  private diagnostics: DebugResponse | null = null;
  private tasks: StateTaskRecord[] = [];

  constructor(private readonly container: HTMLElement) {}

  async setData(chatId: string, branchId: string): Promise<void> {
    this.chatId = chatId;
    this.branchId = branchId;
    await this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this.chatId) { this.stateInfo = null; this.diagnostics = null; this.tasks = []; this.render(); return; }
    try {
      const [stateRes, tasksRes, diagnostics] = await Promise.all([
        backend.getCurrentState(this.chatId, this.branchId),
        backend.listStateTasks({ chatId: this.chatId, branchId: this.branchId, limit: 10 }),
        backend.debugCurrent(this.chatId, this.branchId)
      ]);
      this.stateInfo = stateRes;
      this.diagnostics = diagnostics;
      this.tasks = tasksRes.tasks || [];
      this.render();
    } catch (err) {
      showToast((err instanceof Error ? err.message : String(err)) || '获取调试信息失败', 'error');
    }
  }

  render(): void {
    if (!this.stateInfo) {
      this.container.innerHTML = '<div class="wm-card">暂无调试信息</div>';
      return;
    }

    const s = this.stateInfo;
    const syncBadgeClass = s.syncStatus === 'synced' ? 'synced' : s.syncStatus === 'failed' ? 'failed' : 'pending';

    this.container.innerHTML = `
      <div class="wm-card">
        <h4>本轮最终注入（织忆准备结果，长期记忆 / 谱迹事分别注入）</h4>
        <pre>${esc(this.diagnostics?.generation ? this.diagnostics.generation.longMemory + '\n' + this.diagnostics.generation.currentState : '暂无数据')}</pre>
        <details><summary>本轮长期记忆</summary><pre>${esc(this.diagnostics?.generation?.longMemory ?? '暂无数据')}</pre></details>
        <details><summary>本轮谱 / 迹 / 事</summary><pre>${esc(this.diagnostics?.generation?.currentState ?? '暂无数据')}</pre></details>
        <p>预计 Token：${this.diagnostics?.generation?.estimatedTokens ?? '暂无数据'}</p>
        <p>上一状态任务耗时：${this.diagnostics?.stateTask?.durationMs ?? '暂无数据'} ms</p>
        <p>上一长期总结耗时：${this.diagnostics?.summary?.durationMs ?? '暂无数据'} ms</p>
        <h4>召回各阶段耗时</h4><pre>${esc(this.diagnostics?.recall ? JSON.stringify(this.diagnostics.recall, null, 2) : '暂无数据')}</pre>
        <h4>数据库状态</h4><pre>${esc(this.diagnostics ? JSON.stringify(this.diagnostics.database, null, 2) : '暂无数据')}</pre>
      </div>
      <!-- Top Chain Status -->
      <div class="wm-card">
        <div class="wm-card-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="wm-card-title"><i class="fa-solid fa-link"></i> 状态链实时诊断</span>
            <span class="wm-status-badge ${syncBadgeClass}">${esc(s.syncStatus)}</span>
          </div>
          <div style="display:flex; gap:8px;">
            <span>完整数据重建：Phase 17</span>
            <button class="wm-btn wm-btn-primary" id="wm-dbg-refresh-btn"><i class="fa-solid fa-rotate"></i> 刷新</button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; font-size:12px;">
          <div class="wm-card" style="padding:10px; background:var(--wm-bg);">
            <div style="color:var(--wm-text-muted);">活跃分支 ID</div>
            <div style="font-weight:600; font-family:monospace; margin-top:4px;">${esc(s.branchId)}</div>
          </div>
          <div class="wm-card" style="padding:10px; background:var(--wm-bg);">
            <div style="color:var(--wm-text-muted);">有效楼层 / 最新楼层</div>
            <div style="font-weight:600; margin-top:4px;">${s.headMessageIndex ?? '暂无数据'} / ${s.latestMessageIndex ?? '暂无数据'}</div>
          </div>
          <div class="wm-card" style="padding:10px; background:var(--wm-bg);">
            <div style="color:var(--wm-text-muted);">状态节点 ID</div>
            <div style="font-weight:600; font-family:monospace; font-size:11px; margin-top:4px; overflow:hidden; text-overflow:ellipsis;">${esc(s.stateNodeId ?? '暂无数据')}</div>
          </div>
          <div class="wm-card" style="padding:10px; background:var(--wm-bg);">
            <div style="color:var(--wm-text-muted);">节点指纹 (Fingerprint)</div>
            <div style="font-weight:600; font-family:monospace; font-size:11px; margin-top:4px; overflow:hidden; text-overflow:ellipsis;">${esc(s.stateFingerprint ? s.stateFingerprint.slice(0, 16) + '...' : '无')}</div>
          </div>
        </div>
      </div>

      <!-- Recent State Tasks Queue -->
      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-list-ol"></i> 最近状态分析任务队列 (${this.tasks.length})</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${this.tasks.length === 0 ? '<div style="color:var(--wm-text-muted); font-size:12px;">队列中暂无任务记录</div>' : ''}
          ${this.tasks.map(t => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--wm-bg); padding:8px 12px; border-radius:6px; font-size:12px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="wm-status-badge ${t.status === 'succeeded' ? 'synced' : t.status === 'failed' ? 'failed' : 'pending'}">${esc(t.status)}</span>
                <span style="font-family:monospace;">${esc(t.floorId)}</span>
                <span style="color:var(--wm-text-muted);">尝试次数: ${t.attempts}</span>
              </div>
              <div style="display:flex; align-items:center; gap:10px;">
                ${t.errorMessage ? `<span style="color:#f87171; max-width:280px; overflow:hidden; text-overflow:ellipsis;" title="${esc(t.errorMessage)}">${esc(t.errorMessage)}</span>` : ''}
                <button class="wm-btn wm-btn-secondary wm-retry-task-btn" data-floor="${esc(t.floorId)}" style="padding:2px 8px; font-size:11px;"><i class="fa-solid fa-arrow-rotate-right"></i> 重试</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Current Snapshot JSON Preview -->
      <div class="wm-card">
        <div class="wm-card-header">
          <span class="wm-card-title"><i class="fa-solid fa-code"></i> 当前状态快照 JSON (Snapshot)</span>
        </div>
        <textarea class="wm-textarea" rows="12" readonly style="font-family:monospace; font-size:11px; white-space:pre;">${esc(JSON.stringify(s.snapshot, null, 2))}</textarea>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.container.querySelector('#wm-dbg-refresh-btn')?.addEventListener('click', () => this.refresh());

    this.container.querySelectorAll('.wm-retry-task-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const floorId = (btn as HTMLElement).dataset.floor;
        if (!floorId) return;
        try {
          showToast('正在重新排队分析任务...', 'info');
          await backend.runStateTask(this.chatId, floorId);
          showToast('任务已重新排队！', 'success');
          await this.refresh();
        } catch (err) {
          showToast((err instanceof Error ? err.message : String(err)) || '重试失败', 'error');
        }
      });
    });
  }
}
