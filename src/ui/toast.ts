export function showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  let wrap = document.getElementById('wm-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'wm-toast-wrap';
    wrap.className = 'wm-toast-wrap';
    document.body.appendChild(wrap);
  }

  const toast = document.createElement('div');
  toast.className = 'wm-toast';

  const icons: Record<string, string> = {
    info: '<i class="fa-solid fa-circle-info" style="color:#38bdf8"></i>',
    success: '<i class="fa-solid fa-circle-check" style="color:#22c55e"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b"></i>',
    error: '<i class="fa-solid fa-circle-exclamation" style="color:#ef4444"></i>'
  };

  toast.innerHTML = `${icons[type] ?? icons.info}<span>${message}</span>`;
  wrap.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.25s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}
