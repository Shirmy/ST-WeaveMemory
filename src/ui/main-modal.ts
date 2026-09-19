import { backend } from '../api/backend-client';
import type { CurrentStateResponse } from '../types';
import { CharactersView } from './characters-view';
import { DebugView } from './debug-view';
import { MemoryView } from './memory-view';
import { SettingsView } from './settings-view';
import { StoryView } from './story-view';
import { showToast } from './toast';

export type MainTabType = 'characters' | 'story' | 'memory' | 'settings' | 'debug';

export class MainModal {
  private overlay: HTMLElement | null = null;
  private container: HTMLElement | null = null;
  private currentTab: MainTabType = 'characters';
  private chatId: string = '';
  private branchId: string = '';
  private currentState: CurrentStateResponse | null = null;
  private stateRequest = 0;

  // Sub-views
  private charactersView: CharactersView | null = null;
  private storyView: StoryView | null = null;
  private memoryView: MemoryView | null = null;
  private settingsView: SettingsView | null = null;
  private debugView: DebugView | null = null;

  init(): void {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'wm-drawer-overlay';
    this.overlay.id = 'wm-main-drawer';

    this.overlay.innerHTML = `
      <div class="wm-drawer-container">
        <!-- Header -->
        <div class="wm-drawer-header">
          <div class="wm-drawer-title-row">
            <span class="wm-drawer-title"><i class="fa-solid fa-scroll" style="color:var(--wm-accent);"></i> WeaveMemory 织忆</span>
            <span class="wm-status-badge synced" id="wm-top-sync-badge">READY</span>
          </div>
          <div class="wm-drawer-actions">
            <button class="wm-icon-btn" id="wm-drawer-refresh-btn" title="刷新"><i class="fa-solid fa-rotate"></i></button>
            <button class="wm-icon-btn" id="wm-drawer-close-btn" title="关闭"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="wm-nav-bar">
          <button class="wm-nav-tab wm-active" data-tab="characters"><i class="fa-solid fa-users"></i> 人物</button>
          <button class="wm-nav-tab" data-tab="story"><i class="fa-solid fa-book-bookmark"></i> 事</button>
          <button class="wm-nav-tab" data-tab="memory"><i class="fa-solid fa-memory"></i> 长期记忆</button>
          <button class="wm-nav-tab" data-tab="settings"><i class="fa-solid fa-sliders"></i> 设置</button>
          <button class="wm-nav-tab" data-tab="debug"><i class="fa-solid fa-bug"></i> 调试</button>
        </div>

        <!-- Body Content -->
        <div class="wm-drawer-body" id="wm-view-mount">
          <!-- Views mounted here -->
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this.bindGlobalEvents();

    const mount = this.overlay.querySelector<HTMLElement>('#wm-view-mount')!;
    this.charactersView = new CharactersView(mount);
    this.storyView = new StoryView(mount);
    this.memoryView = new MemoryView(mount);
    this.settingsView = new SettingsView(mount);
    this.debugView = new DebugView(mount);
  }

  async setChatContext(chatId: string, branchId?: string): Promise<void> {
    this.stateRequest++;
    this.currentState = null;
    this.chatId = chatId;
    this.branchId = branchId || '';
    this.overlay?.querySelector('#wm-view-mount')?.replaceChildren();
    if (this.isOpen()) {
      await this.refreshState();
      await this.renderActiveTab();
    }
  }

  async open(initialTab?: MainTabType): Promise<void> {
    this.init();
    if (initialTab) this.currentTab = initialTab;
    this.overlay?.classList.add('wm-open');
    await this.refreshState();
    await this.renderActiveTab();
  }

  close(): void {
    this.overlay?.classList.remove('wm-open');
  }

  toggle(): void {
    if (this.isOpen()) this.close();
    else void this.open();
  }

  isOpen(): boolean {
    return Boolean(this.overlay?.classList.contains('wm-open'));
  }

  private async refreshState(): Promise<void> {
    if (!this.chatId) return;
    const request = ++this.stateRequest;
    try {
      const state = await backend.getCurrentState(this.chatId, this.branchId);
      if (request !== this.stateRequest) return;
      this.currentState = state;
      const badge = this.overlay?.querySelector('#wm-top-sync-badge');
      if (badge && this.currentState) {
        badge.className = `wm-status-badge ${this.currentState.syncStatus === 'synced' ? 'synced' : this.currentState.syncStatus === 'failed' ? 'failed' : 'pending'}`;
        badge.textContent = this.currentState.syncStatus;
      }
    } catch (error) {
      if (request !== this.stateRequest) return;
      this.currentState = null;
      showToast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  private async renderActiveTab(): Promise<void> {
    const root = this.overlay?.querySelector<HTMLElement>('#wm-view-mount');
    if (!root) return;
    const mount = document.createElement('div');
    root.replaceChildren(mount);
    // Each view owns its mount: late responses can only update a detached view.
    this.charactersView = new CharactersView(mount);
    this.storyView = new StoryView(mount);
    this.memoryView = new MemoryView(mount);
    this.settingsView = new SettingsView(mount);
    this.debugView = new DebugView(mount);

    // Update tab bar UI
    this.overlay?.querySelectorAll('.wm-nav-tab').forEach(tab => {
      const t = (tab as HTMLElement).dataset.tab;
      if (t === this.currentTab) tab.classList.add('wm-active');
      else tab.classList.remove('wm-active');
    });

    switch (this.currentTab) {
      case 'characters':
        if (this.currentState) {
          this.charactersView?.setData(this.chatId, this.currentState.branchId, this.currentState.snapshot, this.currentState.syncStatus, this.currentState.relevantCharacterIds);
        } else {
          mount.innerHTML = '<div class="wm-card">正在连接状态引擎...</div>';
        }
        break;
      case 'story':
        if (this.currentState) {
          this.storyView?.setData(this.chatId, this.currentState.branchId, this.currentState.snapshot);
        } else {
          mount.innerHTML = '<div class="wm-card">正在连接状态引擎...</div>';
        }
        break;
      case 'memory':
        await this.memoryView?.setData(this.chatId, this.currentState?.branchId || this.branchId);
        break;
      case 'settings':
        await this.settingsView?.loadData();
        break;
      case 'debug':
        await this.debugView?.setData(this.chatId, this.currentState?.branchId || this.branchId);
        break;
    }
  }

  private bindGlobalEvents(): void {
    window.addEventListener('weavememory-settings-changed', () => this.settingsView?.syncLocalSettings());
    // Close on backdrop click
    this.overlay?.addEventListener('click', e => {
      if (e.target === this.overlay) this.close();
    });

    // Close button
    this.overlay?.querySelector('#wm-drawer-close-btn')?.addEventListener('click', () => this.close());

    // Refresh button
    this.overlay?.querySelector('#wm-drawer-refresh-btn')?.addEventListener('click', async () => {
      showToast('正在刷新...', 'info');
      await this.refreshState();
      await this.renderActiveTab();
      showToast('已刷新！', 'success');
    });

    // Navigation tab switching
    this.overlay?.querySelectorAll('.wm-nav-tab').forEach(tab => {
      tab.addEventListener('click', async () => {
        const t = (tab as HTMLElement).dataset.tab as MainTabType;
        if (t) {
          this.currentTab = t;
          if (t === 'characters' || t === 'story') await this.refreshState();
          await this.renderActiveTab();
        }
      });
    });

    // Escape key closes modal
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }
}

export const mainModal = new MainModal();
