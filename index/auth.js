const Auth = (() => {
  function getUser()    { return Storage.getSession(); }
  function isLoggedIn() { return !!getUser(); }
  function isAdmin()    { const u = getUser(); return u && u.role === 'admin'; }

  function requireLogin(to = 'login.html') {
    if (!isLoggedIn()) { window.location.href = to; return false; }
    return true;
  }
  function requireAdmin() {
    if (!isLoggedIn()) { window.location.href = 'login.html'; return false; }
    if (!isAdmin())    { window.location.href = 'index.html'; return false; }
    return true;
  }

  function login(username, password) {
    const user = Storage.getUserByUsername(username);
    if (!user)                         return { ok: false, error: 'Username not found.' };
    if (user.status === 'banned')      return { ok: false, error: 'Your account has been banned.' };
    if (user.status === 'deactivated') return { ok: false, error: 'Your account is deactivated.' };
    if (user.password !== password)    return { ok: false, error: 'Incorrect password.' };
    const s = { username: user.username, role: user.role };
    Storage.setSession(s);
    return { ok: true, user: s };
  }

  function signup(username, password) {
    if (!username || username.trim().length < 3)
      return { ok: false, error: 'Username must be at least 3 characters.' };
    if (/\s/.test(username))
      return { ok: false, error: 'Username cannot contain spaces.' };
    if (!password || password.length < 6)
      return { ok: false, error: 'Password must be at least 6 characters.' };
    if (Storage.getUserByUsername(username.trim()))
      return { ok: false, error: 'Username already taken.' };
    const u = { username: username.trim(), password, role: 'user', status: 'active', bio: '', createdAt: new Date().toISOString() };
    Storage.addUser(u);
    Storage.setSession({ username: u.username, role: u.role });
    return { ok: true, user: u };
  }

  function logout() { Storage.clearSession(); window.location.href = 'login.html'; }

  function seedAdmin() {
    if (!Storage.getUserByUsername('admin')) {
      Storage.addUser({ username: 'admin', password: 'admin123', role: 'admin', status: 'active', bio: 'Site administrator', createdAt: new Date().toISOString() });
    }
  }

  return { getUser, isLoggedIn, isAdmin, requireLogin, requireAdmin, login, signup, logout, seedAdmin };
})();