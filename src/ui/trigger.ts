import { mainModal } from './main-modal';

export function mountTrigger(): void {
  // 1. Add floating trigger button (FAB) or top-bar button
  if (!document.getElementById('wm-fab-button')) {
    const fab = document.createElement('button');
    fab.id = 'wm-fab-button';
    fab.className = 'wm-fab-btn';
    fab.title = 'WeaveMemory 织忆控制面板';
    fab.innerHTML = '<i class="fa-solid fa-scroll" style="font-size:16px;"></i>';
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

  // 2. Add Wand menu item if available
  const wand = document.querySelector('#wand, #wand-button, #extensions_wand');
  if (wand && !document.getElementById('wm-wand-item')) {
    const item = document.createElement('div');
    item.id = 'wm-wand-item';
    item.className = 'list-group-item flex-container flexGap5 interactable';
    item.innerHTML = '<i class="fa-solid fa-scroll"></i> <span>织忆 (WeaveMemory)</span>';
    item.addEventListener('click', () => mainModal.toggle());
    wand.appendChild(item);
  }
}
