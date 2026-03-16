// ============================================================
// Announcements.gs
// ============================================================

var Announcements = (function() {

  function getAll(body, user) {
    let rows = sheetToObjects('ANNOUNCEMENTS');
    if (user.role !== 'admin') rows = rows.filter(r => r.is_active === true || r.is_active === 'TRUE');
    if (body.category) rows = rows.filter(r => r.category === body.category);
    return rows.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  function create(body, user) {
    requireAdmin(user);
    const { title, content } = body;
    if (!title) throw new Error('title จำเป็น');
    const row = {
      ann_id:     genId('ANN'),
      title:      title,
      content:    content || '',
      category:   body.category || 'general',
      image_urls: JSON.stringify(body.image_urls || []),
      created_by: user.user_id,
      created_at: now(),
      updated_at: now(),
      is_active:  true,
      pinned:     body.pinned || false
    };
    appendRow('ANNOUNCEMENTS', row);
    return row;
  }

  function update(body, user) {
    requireAdmin(user);
    const { ann_id, ...updates } = body;
    updates.updated_at = now();
    updateRowById('ANNOUNCEMENTS', 'ann_id', ann_id, updates);
    return { success: true };
  }

  function toggle(body, user) {
    requireAdmin(user);
    const { ann_id } = body;
    const ann = findRow('ANNOUNCEMENTS', 'ann_id', ann_id);
    if (!ann) throw new Error('ไม่พบประกาศ');
    const newVal = !(ann.is_active === true || ann.is_active === 'TRUE');
    updateRowById('ANNOUNCEMENTS', 'ann_id', ann_id, { is_active: newVal, updated_at: now() });
    return { success: true, is_active: newVal };
  }

  return { getAll, create, update, toggle };
})();


// ============================================================
// Reports.gs (Monthly Reports)
// ============================================================

var Reports = (function() {

  function getAll(body, user) {
    let rows = sheetToObjects('MONTHLY_REPORTS');
    if (body.year)  rows = rows.filter(r => String(r.year) === String(body.year));
    if (body.month) rows = rows.filter(r => String(r.month) === String(body.month));
    return rows.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }

  function create(body, user) {
    requireAdmin(user);
    const { month, year, title, summary } = body;
    if (!month || !year || !title) throw new Error('month, year, title จำเป็น');
    const row = {
      report_id:  genId('RPT'),
      month:      month,
      year:       year,
      category:   body.category || 'general',
      title:      title,
      summary:    summary || '',
      budget:     body.budget || 0,
      image_urls: JSON.stringify(body.image_urls || []),
      created_by: user.user_id,
      created_at: now()
    };
    appendRow('MONTHLY_REPORTS', row);
    return row;
  }

  return { getAll, create };
})();


// ============================================================
// Contractors.gs
// ============================================================

var Contractors = (function() {

  function getAll(body, user) {
    let rows = sheetToObjects('CONTRACTORS');
    if (user.role !== 'admin') rows = rows.filter(r => r.status === 'approved');
    if (body.skill) {
      rows = rows.filter(r => {
        const skills = parseJSON(r.skills);
        return skills.some(s => s.toLowerCase().includes(body.skill.toLowerCase()));
      });
    }
    if (body.search) {
      const q = body.search.toLowerCase();
      rows = rows.filter(r =>
        String(r.name).toLowerCase().includes(q) ||
        String(r.area).toLowerCase().includes(q) ||
        parseJSON(r.skills).some(s => s.toLowerCase().includes(q))
      );
    }
    return rows;
  }

  function suggest(body, user) {
    const { name, phone, skills, bio } = body;
    if (!name || !phone) throw new Error('name และ phone จำเป็น');
    const row = {
      contractor_id: genId('CON'),
      name:          name,
      phone:         phone,
      line_id:       body.line_id || '',
      area:          body.area || '',
      skills:        JSON.stringify(skills || []),
      bio:           bio || '',
      rating_avg:    0,
      rating_count:  0,
      image_url:     body.image_url || '',
      suggested_by:  user.user_id,
      approved_by:   '',
      status:        'pending',
      created_at:    now()
    };
    appendRow('CONTRACTORS', row);
    return row;
  }

  function create(body, user) {
    requireAdmin(user);
    const { name, phone, skills } = body;
    if (!name || !phone) throw new Error('name และ phone จำเป็น');
    const row = {
      contractor_id: genId('CON'),
      name:          name,
      phone:         phone,
      line_id:       body.line_id || '',
      area:          body.area || '',
      skills:        JSON.stringify(skills || []),
      bio:           body.bio || '',
      rating_avg:    0,
      rating_count:  0,
      image_url:     body.image_url || '',
      suggested_by:  '',
      approved_by:   user.user_id,
      status:        'approved',
      created_at:    now()
    };
    appendRow('CONTRACTORS', row);
    return row;
  }

  function approve(body, user) {
    requireAdmin(user);
    updateRowById('CONTRACTORS', 'contractor_id', body.contractor_id, {
      status: 'approved', approved_by: user.user_id
    });
    return { success: true };
  }

  function reject(body, user) {
    requireAdmin(user);
    updateRowById('CONTRACTORS', 'contractor_id', body.contractor_id, {
      status: 'rejected', approved_by: user.user_id
    });
    return { success: true };
  }

  return { getAll, suggest, create, approve, reject };
})();


// ============================================================
// Marketplace.gs
// ============================================================

var Marketplace = (function() {

  function getAll(body, user) {
    let rows = sheetToObjects('MARKETPLACE');
    if (user.role !== 'admin') rows = rows.filter(r => r.status === 'active');
    if (body.listing_type) rows = rows.filter(r => r.listing_type === body.listing_type);
    if (body.category)     rows = rows.filter(r => r.category === body.category);
    if (body.search) {
      const q = body.search.toLowerCase();
      rows = rows.filter(r =>
        String(r.title).toLowerCase().includes(q) ||
        String(r.description).toLowerCase().includes(q)
      );
    }
    return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function post(body, user) {
    const { title, listing_type, category, price } = body;
    if (!title) throw new Error('title จำเป็น');
    const row = {
      item_id:         genId('MKT'),
      house_id:        body.house_id || user.house_id,
      posted_by:       user.user_id,
      listing_type:    listing_type || 'sell',
      category:        category || 'other',
      title:           title,
      description:     body.description || '',
      price:           price || 0,
      contact_phone:   body.contact_phone || '',
      image_urls:      JSON.stringify(body.image_urls || []),
      status:          user.role === 'admin' ? 'active' : 'pending',
      approved_by:     user.role === 'admin' ? user.user_id : '',
      approved_at:     user.role === 'admin' ? now() : '',
      closed_by_owner: false,
      created_at:      now(),
      updated_at:      now()
    };
    appendRow('MARKETPLACE', row);
    return row;
  }

  function approve(body, user) {
    requireAdmin(user);
    updateRowById('MARKETPLACE', 'item_id', body.item_id, {
      status: 'active', approved_by: user.user_id, approved_at: now(), updated_at: now()
    });
    return { success: true };
  }

  function reject(body, user) {
    requireAdmin(user);
    updateRowById('MARKETPLACE', 'item_id', body.item_id, {
      status: 'rejected', approved_by: user.user_id, updated_at: now()
    });
    return { success: true };
  }

  function close(body, user) {
    const item = findRow('MARKETPLACE', 'item_id', body.item_id);
    if (!item) throw new Error('ไม่พบรายการ');
    if (user.role !== 'admin' && item.posted_by !== user.user_id)
      throw new Error('ไม่มีสิทธิ์');
    updateRowById('MARKETPLACE', 'item_id', body.item_id, {
      status: body.status || 'closed', closed_by_owner: true, updated_at: now()
    });
    return { success: true };
  }

  return { getAll, post, approve, reject, close };
})();


// ============================================================
// Users.gs
// ============================================================

var Users = (function() {

  function getAll(body, user) {
    requireAdmin(user);
    return sheetToObjects('USERS').map(u => {
      const { password_hash, ...safe } = u;
      return safe;
    });
  }

  function create(body, user) {
    requireAdmin(user);
    const { username, password, role, house_id, display_name } = body;
    if (!username || !password) throw new Error('username/password จำเป็น');
    if (findRow('USERS', 'username', username)) throw new Error('username นี้ถูกใช้แล้ว');

    const row = {
      user_id:      genId('USR'),
      username:     username.trim(),
      password_hash: hashPw(password),
      role:         role || 'resident',
      house_id:     house_id || '',
      display_name: display_name || username,
      phone:        body.phone || '',
      email:        body.email || '',
      avatar_url:   '',
      status:       'active',
      last_login:   '',
      created_at:   now()
    };
    appendRow('USERS', row);
    const { password_hash, ...safe } = row;
    return safe;
  }

  function update(body, user) {
    const allowed_self  = ['display_name','phone','email','avatar_url'];
    const allowed_admin = [...allowed_self, 'role', 'house_id', 'status'];
    const { user_id, ...updates } = body;
    const targetId = user_id || user.user_id;

    // Only admin can update other users
    if (targetId !== user.user_id && user.role !== 'admin') throw new Error('ไม่มีสิทธิ์');

    const allowed = user.role === 'admin' ? allowed_admin : allowed_self;
    const safe = {};
    allowed.forEach(k => { if (updates[k] !== undefined) safe[k] = updates[k]; });

    updateRowById('USERS', 'user_id', targetId, safe);
    return { success: true };
  }

  function suspend(body, user) {
    requireAdmin(user);
    const { user_id, status } = body;
    updateRowById('USERS', 'user_id', user_id, { status: status || 'suspended' });
    return { success: true };
  }

  return { getAll, create, update, suspend };
})();


// ============================================================
// LoginLogs.gs
// ============================================================

var LoginLogs = (function() {
  function getAll(body, user) {
    requireAdmin(user);
    let rows = sheetToObjects('LOGIN_LOGS');
    if (body.limit) rows = rows.slice(-Number(body.limit));
    return rows.reverse();
  }
  return { getAll };
})();


// ============================================================
// Upload.gs
// ============================================================

var Upload = (function() {
  function base64(body, user) {
    const { base64data, filename, mime_type } = body;
    if (!base64data) throw new Error('base64data required');

    const folder  = DriveApp.getFolderById(DRIVE_FOLDER);
    const bytes   = Utilities.base64Decode(base64data);
    const blob    = Utilities.newBlob(bytes, mime_type || 'image/jpeg', filename || 'upload.jpg');
    const file    = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId  = file.getId();
    const url     = 'https://drive.google.com/uc?export=view&id=' + fileId;
    return { url, file_id: fileId };
  }
  return { base64 };
})();


// ============================================================
// Dashboard.gs
// ============================================================

var Dashboard = (function() {
  function summary(body, user) {
    requireAdmin(user);
    const houses     = sheetToObjects('HOUSES');
    const fees       = sheetToObjects('FEES');
    const issues     = sheetToObjects('ISSUES');
    const violations = sheetToObjects('VIOLATIONS');
    const requests   = sheetToObjects('CHANGE_REQUESTS');
    const market     = sheetToObjects('MARKETPLACE');
    const contractors = sheetToObjects('CONTRACTORS');

    const pendingFees = fees.filter(f => f.status === 'pending' || f.status === 'overdue');
    const overdueAmt  = pendingFees.reduce((s, f) => s + (Number(f.total) || 0), 0);
    const slipPending = fees.filter(f => f.status === 'slip_submitted').length;

    return {
      houses_total:      houses.length,
      houses_overdue:    houses.filter(h => h.status === 'overdue').length,
      houses_suspended:  houses.filter(h => h.status === 'suspended').length,
      houses_legal:      houses.filter(h => h.status === 'legal').length,
      fees_pending_count: pendingFees.length,
      fees_overdue_amount: overdueAmt,
      slips_pending:     slipPending,
      issues_pending:    issues.filter(i => i.status === 'pending').length,
      issues_inprogress: issues.filter(i => i.status === 'in_progress').length,
      violations_pending: violations.filter(v => v.status === 'pending').length,
      change_req_pending: requests.filter(r => r.status === 'pending').length,
      market_pending:    market.filter(m => m.status === 'pending').length,
      contractor_pending: contractors.filter(c => c.status === 'pending').length,
    };
  }
  return { summary };
})();
