// ============================================================
// Houses.gs
// ============================================================

var Houses = (function() {

  function getAll(body, user) {
    requireAdmin(user);
    let rows = sheetToObjects('HOUSES');
    if (body.status) rows = rows.filter(r => r.status === body.status);
    if (body.search) {
      const q = body.search.toLowerCase();
      rows = rows.filter(r =>
        String(r.house_no).toLowerCase().includes(q) ||
        String(r.owner_name).toLowerCase().includes(q) ||
        String(r.phone).toLowerCase().includes(q)
      );
    }
    return rows;
  }

  function getById(body, user) {
    const h = findRow('HOUSES', 'house_id', body.house_id);
    if (!h) throw new Error('ไม่พบข้อมูลบ้าน');
    if (user.role !== 'admin' && user.house_id !== h.house_id)
      throw new Error('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
    return h;
  }

  function getByUser(body, user) {
    if (!user.house_id) return null;
    return findRow('HOUSES', 'house_id', user.house_id);
  }

  function create(body, user) {
    requireAdmin(user);
    const { house_no, soi, owner_name, phone, email, area_sqm,
            fee_per_year, parking_fee_year, trash_fee_period } = body;
    if (!house_no || !owner_name) throw new Error('house_no และ owner_name จำเป็น');

    const existing = sheetToObjects('HOUSES').find(r => r.house_no === house_no);
    if (existing) throw new Error('บ้านเลขที่นี้มีอยู่แล้ว');

    const row = {
      house_id:          genId('HSE'),
      house_no:          house_no,
      soi:               soi || '',
      address:           body.address || '',
      owner_name:        owner_name,
      renter_name:       body.renter_name || '',
      contact_person:    body.contact_person || owner_name,
      phone:             phone || '',
      email:             email || '',
      area_sqm:          area_sqm || 0,
      house_type:        body.house_type || 'single_house',
      usage_type:        body.usage_type || 'owner',
      fee_per_year:      fee_per_year || 0,
      parking_fee_year:  parking_fee_year || 0,
      trash_fee_period:  trash_fee_period || 0,
      status:            'normal',
      status_note:       '',
      created_at:        now(),
      updated_at:        now()
    };
    appendRow('HOUSES', row);
    return row;
  }

  function update(body, user) {
    requireAdmin(user);
    const { house_id, ...updates } = body;
    if (!house_id) throw new Error('house_id required');
    updates.updated_at = now();
    const ok = updateRowById('HOUSES', 'house_id', house_id, updates);
    if (!ok) throw new Error('ไม่พบบ้านที่ต้องการแก้ไข');
    return { success: true };
  }

  return { getAll, getById, getByUser, create, update };
})();


// ============================================================
// Vehicles.gs
// ============================================================

var Vehicles = (function() {

  function getByHouse(body, user) {
    const hid = body.house_id || user.house_id;
    if (user.role !== 'admin' && user.house_id !== hid)
      throw new Error('ไม่มีสิทธิ์');
    return sheetToObjects('VEHICLES').filter(r => r.house_id === hid);
  }

  function create(body, user) {
    const hid = body.house_id || user.house_id;
    if (user.role !== 'admin' && user.house_id !== hid)
      throw new Error('ไม่มีสิทธิ์');

    const row = {
      vehicle_id:       genId('VEH'),
      house_id:         hid,
      requested_by:     user.user_id,
      type:             body.type || 'car',
      plate_number:     body.plate_number || '',
      brand:            body.brand || '',
      model:            body.model || '',
      color:            body.color || '',
      province:         body.province || '',
      parking_location: body.parking_location || 'front',
      fee_required:     body.fee_required || false,
      fee_amount:       body.fee_amount || 0,
      image_urls:       JSON.stringify(body.image_urls || []),
      status:           user.role === 'admin' ? 'active' : 'pending',
      approved_by:      user.role === 'admin' ? user.user_id : '',
      approved_at:      user.role === 'admin' ? now() : '',
      created_at:       now()
    };
    appendRow('VEHICLES', row);

    // If resident, auto-create change request
    if (user.role !== 'admin') {
      appendRow('CHANGE_REQUESTS', {
        req_id:          genId('REQ'),
        house_id:        hid,
        target_type:     'vehicle_add',
        target_id:       row.vehicle_id,
        field_changes:   JSON.stringify({ vehicle: body }),
        admin_overrides: '',
        requested_by:    user.user_id,
        status:          'pending',
        approved_by:     '',
        reject_reason:   '',
        note:            body.note || '',
        created_at:      now(),
        resolved_at:     ''
      });
    }
    return row;
  }

  function update(body, user) {
    const { vehicle_id, ...updates } = body;
    const veh = findRow('VEHICLES', 'vehicle_id', vehicle_id);
    if (!veh) throw new Error('ไม่พบยานพาหนะ');
    if (user.role !== 'admin' && veh.house_id !== user.house_id)
      throw new Error('ไม่มีสิทธิ์');

    if (user.role !== 'admin') {
      // Resident → create change request
      appendRow('CHANGE_REQUESTS', {
        req_id:          genId('REQ'),
        house_id:        veh.house_id,
        target_type:     'vehicle_edit',
        target_id:       vehicle_id,
        field_changes:   JSON.stringify(updates),
        admin_overrides: '',
        requested_by:    user.user_id,
        status:          'pending',
        approved_by:     '',
        reject_reason:   '',
        note:            body.note || '',
        created_at:      now(),
        resolved_at:     ''
      });
      return { success: true, pending: true };
    }

    updateRowById('VEHICLES', 'vehicle_id', vehicle_id, updates);
    return { success: true };
  }

  return { getByHouse, create, update };
})();


// ============================================================
// ChangeReq.gs
// ============================================================

var ChangeReq = (function() {

  function getAll(body, user) {
    requireAdmin(user);
    let rows = sheetToObjects('CHANGE_REQUESTS');
    if (body.status) rows = rows.filter(r => r.status === body.status);
    return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function getMine(body, user) {
    return sheetToObjects('CHANGE_REQUESTS')
      .filter(r => r.requested_by === user.user_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function submit(body, user) {
    const { house_id, target_type, field_changes, note } = body;
    if (!field_changes) throw new Error('field_changes required');

    const hid = house_id || user.house_id;
    const row = {
      req_id:          genId('REQ'),
      house_id:        hid,
      target_type:     target_type || 'house_info',
      target_id:       body.target_id || hid,
      field_changes:   typeof field_changes === 'string'
                         ? field_changes : JSON.stringify(field_changes),
      admin_overrides: '',
      requested_by:    user.user_id,
      status:          'pending',
      approved_by:     '',
      reject_reason:   '',
      note:            note || '',
      created_at:      now(),
      resolved_at:     ''
    };
    appendRow('CHANGE_REQUESTS', row);
    return row;
  }

  function approve(body, user) {
    requireAdmin(user);
    const { req_id, admin_overrides } = body;
    const req = findRow('CHANGE_REQUESTS', 'req_id', req_id);
    if (!req) throw new Error('ไม่พบคำขอ');
    if (req.status !== 'pending') throw new Error('คำขอนี้ดำเนินการแล้ว');

    // Get final values (admin_overrides wins over field_changes)
    const changes   = parseJSON(req.field_changes);
    const overrides = admin_overrides ? parseJSON(admin_overrides) : {};
    const final     = Object.assign({}, changes, overrides);

    // Apply changes
    if (req.target_type === 'house_info') {
      const allowed = ['phone','email','renter_name','usage_type','contact_person'];
      const safe = {};
      allowed.forEach(k => { if (final[k] !== undefined) safe[k] = final[k]; });
      safe.updated_at = now();
      updateRowById('HOUSES', 'house_id', req.house_id, safe);
    } else if (req.target_type === 'vehicle_add') {
      updateRowById('VEHICLES', 'vehicle_id', req.target_id, {
        status: 'active', approved_by: user.user_id, approved_at: now()
      });
    } else if (req.target_type === 'vehicle_edit') {
      const allowedV = ['plate_number','color','province','parking_location'];
      const safeV = {};
      allowedV.forEach(k => { if (final[k] !== undefined) safeV[k] = final[k]; });
      updateRowById('VEHICLES', 'vehicle_id', req.target_id, safeV);
    }

    updateRowById('CHANGE_REQUESTS', 'req_id', req_id, {
      status:          'approved',
      approved_by:     user.user_id,
      admin_overrides: admin_overrides ? JSON.stringify(admin_overrides) : '',
      resolved_at:     now()
    });
    return { success: true };
  }

  function reject(body, user) {
    requireAdmin(user);
    const { req_id, reject_reason } = body;
    if (!reject_reason) throw new Error('ต้องระบุเหตุผล');
    const req = findRow('CHANGE_REQUESTS', 'req_id', req_id);
    if (!req) throw new Error('ไม่พบคำขอ');

    updateRowById('CHANGE_REQUESTS', 'req_id', req_id, {
      status:        'rejected',
      reject_reason: reject_reason,
      approved_by:   user.user_id,
      resolved_at:   now()
    });
    return { success: true };
  }

  return { getAll, getMine, submit, approve, reject };
})();
