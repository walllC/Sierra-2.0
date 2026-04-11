const Utils = (() => {
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function timeAgo(isoString) {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 10)    return 'Just now';
    if (diff < 60)    return `${diff}s`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800)return `${Math.floor(diff / 86400)}d`;
    return new Date(isoString).toLocaleDateString();
  }

  function isToday(isoString) {
    const d = new Date(isoString), n = new Date();
    return d.getDate()===n.getDate() && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function showToast(message, type = 'info') {
    const old = document.getElementById('rb-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = 'rb-toast';
    t.className = `rb-toast rb-toast--${type}`;
    t.textContent = message;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('rb-toast--show'));
    setTimeout(() => { t.classList.remove('rb-toast--show'); setTimeout(() => t.remove(), 300); }, 2800);
  }

  const COLORS = ['#f97316','#8b5cf6','#06b6d4','#10b981','#f43f5e','#3b82f6','#a855f7','#14b8a6','#e11d48','#0ea5e9'];
  function getAvatarColor(username) {
    let h = 0;
    for (let i = 0; i < username.length; i++) h += username.charCodeAt(i);
    return COLORS[h % COLORS.length];
  }
  function getInitials(username) { return username.slice(0, 2).toUpperCase(); }

  function avatar(username, size = '') {
    const el = document.createElement('div');
    el.className = `av ${size}`;
    el.style.background = getAvatarColor(username);
    el.textContent = getInitials(username);
    return el;
  }

  return { generateId, timeAgo, isToday, escapeHtml, showToast, getAvatarColor, getInitials, avatar };
})();