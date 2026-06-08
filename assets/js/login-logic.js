document.addEventListener('DOMContentLoaded', () => {
  Auth.seedAdmin();
  if (Auth.isLoggedIn()) {
    window.location.href = Auth.isAdmin() ? 'admin.html' : 'index.html';
    return;
  }
  const err = document.getElementById('err');
  const btn = document.getElementById('btn');
  document.getElementById('form').addEventListener('submit', e => {
    e.preventDefault();
    err.classList.remove('show');
    const u = document.getElementById('u').value.trim();
    const p = document.getElementById('p').value;
    if (!u || !p) { err.textContent = 'Fill in all fields.'; err.classList.add('show'); return; }
    btn.disabled = true; btn.textContent = 'Signing in…';
    setTimeout(() => {
      const r = Auth.login(u, p);
      if (!r.ok) { err.textContent = r.error; err.classList.add('show'); btn.disabled = false; btn.textContent = 'Log in'; return; }
      window.location.href = r.user.role === 'admin' ? 'admin.html' : 'index.html';
    }, 200);
  });
});