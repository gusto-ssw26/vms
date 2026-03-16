// ============================================================
// Auth.gs — JWT Authentication
// ============================================================

var Auth = (function() {

  function login(body) {
    const { username, password } = body;
    if (!username || !password) throw new Error('username/password required');

    const user = findRow('USERS', 'username', username.trim());
    if (!user) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    if (user.status !== 'active') throw new Error('บัญชีถูกระงับ กรุณาติดต่อ admin');

    const hash = hashPw(password);
    if (user.password_hash !== hash) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');

    // Update last_login
    updateRowById('USERS', 'user_id', user.user_id, { last_login: now() });

    // Log
    appendRow('LOGIN_LOGS', {
      log_id:     genId('LOG'),
      user_id:    user.user_id,
      username:   user.username,
      role:       user.role,
      login_at:   now(),
      status:     'success',
      fail_reason: ''
    });

    const token = _makeToken(user);
    return {
      token,
      user: {
        user_id:      user.user_id,
        username:     user.username,
        display_name: user.display_name,
        role:         user.role,
        house_id:     user.house_id,
        phone:        user.phone,
        email:        user.email
      }
    };
  }

  function verify(token) {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Utilities.newBlob(
        Utilities.base64Decode(parts[1])).getDataAsString());
      // Check expiry
      if (payload.exp < Date.now()) return null;
      // Verify signature
      const sig = _sign(parts[0] + '.' + parts[1]);
      if (sig !== parts[2]) return null;
      return payload;
    } catch(_) { return null; }
  }

  function changePassword(body, user) {
    const { old_password, new_password } = body;
    if (!old_password || !new_password) throw new Error('ระบุรหัสผ่านให้ครบ');
    if (new_password.length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');

    const u = findRow('USERS', 'user_id', user.user_id);
    if (!u) throw new Error('User not found');
    if (u.password_hash !== hashPw(old_password)) throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');

    updateRowById('USERS', 'user_id', user.user_id, {
      password_hash: hashPw(new_password)
    });
    return { success: true };
  }

  // ── Private ──────────────────────────────────────────────
  function _makeToken(user) {
    const header  = _b64({ alg: 'HS256', typ: 'JWT' });
    const payload = _b64({
      user_id:  user.user_id,
      username: user.username,
      role:     user.role,
      house_id: user.house_id,
      exp:      Date.now() + 8 * 3600 * 1000   // 8 hours
    });
    const sig = _sign(header + '.' + payload);
    return header + '.' + payload + '.' + sig;
  }

  function _b64(obj) {
    return Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
  }

  function _sign(data) {
    const bytes = Utilities.computeHmacSha256Signature(data, JWT_SECRET);
    return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
  }

  return { login, verify, changePassword };
})();
