document.addEventListener('DOMContentLoaded', () => {
  Auth.seedAdmin();
  if (Auth.isLoggedIn()) { window.location.href = Auth.isAdmin() ? 'admin.html' : 'index.html'; return; }
  const err = document.getElementById('err');
  const btn = document.getElementById('btn');
  document.getElementById('form').addEventListener('submit', e => {
    e.preventDefault();
    err.classList.remove('show');
    const u = document.getElementById('u').value.trim();
    const p = document.getElementById('p').value;
    const c = document.getElementById('c').value;
    if (!u || !p || !c) { err.textContent = 'Fill in all fields.'; err.classList.add('show'); return; }
    if (p !== c) { err.textContent = 'Passwords do not match.'; err.classList.add('show'); return; }
    btn.disabled = true; btn.textContent = 'Creating…';
    setTimeout(() => {
      const r = Auth.signup(u, p);
      if (!r.ok) { err.textContent = r.error; err.classList.add('show'); btn.disabled = false; btn.textContent = 'Create account'; return; }
      window.location.href = 'index.html';
    }, 200);
  });
});