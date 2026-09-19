import { mainModal } from './main-modal';

export function mountTrigger(): void {
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', mountTrigger, { once: true });
    return;
  }
  // 1. Add floating trigger button (FAB) or top-bar button
  if (!document.getElementById('wm-fab-button')) {
    const fab = document.createElement('button');
    fab.id = 'wm-fab-button';
    fab.className = 'wm-fab-btn';
    fab.title = 'WeaveMemory 织忆控制面板';
    const icon = document.createElement('i'); icon.className = 'fa-solid fa-scroll'; icon.style.fontSize = '16px'; fab.appendChild(icon);
    fab.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #6366f1;
      color: #fff;
      border: none;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease;
    `;
    fab.addEventListener('mouseenter', () => { fab.style.transform = 'scale(1.1)'; fab.style.background = '#4f46e5'; });
    fab.addEventListener('mouseleave', () => { fab.style.transform = 'scale(1.0)'; fab.style.background = '#6366f1'; });
    fab.addEventListener('click', () => mainModal.toggle());
    document.body.appendChild(fab);
  }

  const attachMenu = (): boolean => {
    const menu = document.querySelector<HTMLElement>('#extensionsMenu');
    if (!menu || document.getElementById('wm-extensions-menu-item')) return Boolean(menu);
    const item = document.createElement('div');
    item.id = 'wm-extensions-menu-item';
    item.className = 'list-group-item flex-container flexGap5 interactable';
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); mainModal.toggle(); } });
    const icon = document.createElement('i'); icon.className = 'fa-solid fa-scroll extensionsMenuExtensionButton'; item.appendChild(icon);
    const label = document.createElement('span'); label.textContent = '织忆 (WeaveMemory)'; item.appendChild(label);
    item.addEventListener('click', () => mainModal.toggle());
    menu.appendChild(item); return true;
  };
  if (!attachMenu()) {
    const observer = new MutationObserver(() => { if (attachMenu()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }
}
