// ============================================================
// Fees.gs
// ============================================================

var Fees = (function() {

  function getAll(body, user) {
    requireAdmin(user);
    let rows = sheetToObjects('FEES');
    if (body.status) rows = rows.filter(r => r.status === body.status);
    if (body.year)   rows = rows.filter(r => String(r.year) === String(body.year));
    return rows;
  }

  function getByHouse(body, user) {
    const hid = body.house_id || user.house_id;
    if (user.role !== 'admin' && user.house_id !== hid)
      throw new Error('ไม่มีสิทธิ์');
    let rows = sheetToObjects('FEES').filter(r => r.house_id === hid);
    if (body.year) rows = rows.filter(r => String(r.year) === String(body.year));
    return rows.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return a.period === 'H2' ? 1 : -1;
    });
  }

  function generate(body, user) {
    requireAdmin(user);
    const { year, period } = body;
    if (!year || !period) throw new Error('year และ period (H1/H2) จำเป็น');

    const houses = sheetToObjects('HOUSES');
    const existing = sheetToObjects('FEES').filter(
      r => String(r.year) === String(year) && r.period === period
    );
    const existingHids = existing.map(r => r.house_id);

    const created = [];
    houses.forEach(h => {
      if (existingHids.includes(h.house_id)) return; // skip ถ้ามีแล้ว

      // คำนวณยอดค้างจากงวดก่อน
      const allFees = sheetToObjects('FEES').filter(
        r => r.house_id === h.house_id && r.status === 'overdue'
      );
      const overdue_carry = allFees.reduce((s, r) => s + (Number(r.total) || 0), 0);

      const fee_amount   = Number(h.fee_per_year || 0) / 2;
      const parking_fee  = Number(h.parking_fee_year || 0) / 2;
      const trash_fee    = Number(h.trash_fee_period || 0);
      const total_raw    = fee_amount + parking_fee + trash_fee + overdue_carry;
      const due_date     = period === 'H1'
        ? year + '-03-31'
        : year + '-09-30';

      const row = {
        fee_id:           genId('FEE'),
        house_id:         h.house_id,
        year:             year,
        period:           period,
        fee_amount:       fee_amount,
        parking_fee:      parking_fee,
        trash_fee:        trash_fee,
        other_fee:        0,
        penalty_fee:      0,
        overdue_carry:    overdue_carry,
        penalty_10pct:    0,
        collection_fee:   0,
        discount:         0,
        total:            total_raw,
        status:           'pending',
        due_date:         due_date,
        slip_url:         '',
        slip_submitted_at:'',
        receipt_no:       '',
        issued_at:        now(),
        issued_by:        user.user_id,
        other_fee_note:   '',
        penalty_fee_note: ''
      };
      appendRow('FEES', row);
      created.push(row.fee_id);
    });
    return { success: true, created: created.length };
  }

  function submitSlip(body, user) {
    const { fee_id, slip_url, amount_paid } = body;
    if (!fee_id || !slip_url) throw new Error('fee_id และ slip_url จำเป็น');
    const fee = findRow('FEES', 'fee_id', fee_id);
    if (!fee) throw new Error('ไม่พบใบแจ้งหนี้');
    if (user.role !== 'admin' && fee.house_id !== user.house_id)
      throw new Error('ไม่มีสิทธิ์');

    updateRowById('FEES', 'fee_id', fee_id, {
      slip_url:          slip_url,
      slip_submitted_at: now(),
      status:            'slip_submitted'
    });
    return { success: true };
  }

  function approveSlip(body, user) {
    requireAdmin(user);
    const { fee_id } = body;
    const fee = findRow('FEES', 'fee_id', fee_id);
    if (!fee) throw new Error('ไม่พบใบแจ้งหนี้');

    // Create receipt
    const receipt = Receipts.create({
      fee_id:         fee_id,
      house_id:       fee.house_id,
      amount_paid:    fee.total,
      payment_method: body.payment_method || 'transfer',
      bank_name:      body.bank_name || '',
      slip_url:       fee.slip_url,
      paid_at:        now(),
      note:           body.note || ''
    }, user);

    updateRowById('FEES', 'fee_id', fee_id, {
      status:     'paid',
      receipt_no: receipt.receipt_id
    });

    // Update house status if was overdue
    const house = findRow('HOUSES', 'house_id', fee.house_id);
    if (house && house.status === 'overdue') {
      const remaining = sheetToObjects('FEES').filter(
        r => r.house_id === fee.house_id && r.status !== 'paid' && r.fee_id !== fee_id
      );
      if (remaining.length === 0) {
        updateRowById('HOUSES', 'house_id', fee.house_id, { status: 'normal', updated_at: now() });
      }
    }
    return { success: true, receipt_id: receipt.receipt_id };
  }

  function issueNewBill(body, user) {
    requireAdmin(user);
    const { fee_id } = body;
    const fee = findRow('FEES', 'fee_id', fee_id);
    if (!fee) throw new Error('ไม่พบใบแจ้งหนี้');

    const penalty_10 = Number(fee.total) * 0.1;
    const collection  = 200;
    const new_total   = Number(fee.total) + penalty_10 + collection;

    updateRowById('FEES', 'fee_id', fee_id, {
      penalty_10pct:  penalty_10,
      collection_fee: collection,
      total:          new_total,
      status:         'overdue',
      issued_at:      now()
    });

    // Update house status
    updateRowById('HOUSES', 'house_id', fee.house_id, { status: 'overdue', updated_at: now() });
    return { success: true, new_total };
  }

  return { getAll, getByHouse, generate, submitSlip, approveSlip, issueNewBill };
})();


// ============================================================
// Receipts.gs
// ============================================================

var Receipts = (function() {

  function getByHouse(body, user) {
    const hid = body.house_id || user.house_id;
    if (user.role !== 'admin' && user.house_id !== hid) throw new Error('ไม่มีสิทธิ์');
    return sheetToObjects('RECEIPTS')
      .filter(r => r.house_id === hid)
      .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
  }

  function create(body, user) {
    const row = {
      receipt_id:     genId('RC'),
      fee_id:         body.fee_id,
      house_id:       body.house_id,
      amount_paid:    body.amount_paid,
      payment_method: body.payment_method || 'transfer',
      bank_name:      body.bank_name || '',
      slip_url:       body.slip_url || '',
      paid_at:        body.paid_at || now(),
      issued_by:      user.user_id,
      issued_at:      now(),
      note:           body.note || ''
    };
    appendRow('RECEIPTS', row);
    return row;
  }

  return { getByHouse, create };
})();


// ============================================================
// Issues.gs
// ============================================================

var Issues = (function() {

  function getAll(body, user) {
    requireAdmin(user);
    let rows = sheetToObjects('ISSUES');
    if (body.status) rows = rows.filter(r => r.status === body.status);
    return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function getMine(body, user) {
    return sheetToObjects('ISSUES')
      .filter(r => r.house_id === user.house_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function create(body, user) {
    const hid = body.house_id || user.house_id;
    const row = {
      issue_id:    genId('ISS'),
      house_id:    hid,
      reported_by: user.user_id,
      category:    body.category || 'other',
      title:       body.title || '',
      description: body.description || '',
      image_urls:  JSON.stringify(body.image_urls || []),
      status:      'pending',
      admin_note:  '',
      assigned_to: '',
      resolved_at: '',
      rating:      '',
      rating_comment: '',
      created_at:  now(),
      updated_at:  now()
    };
    appendRow('ISSUES', row);
    return row;
  }

  function updateStatus(body, user) {
    requireAdmin(user);
    const { issue_id, status, admin_note, assigned_to } = body;
    const updates = { status, updated_at: now() };
    if (admin_note)   updates.admin_note  = admin_note;
    if (assigned_to)  updates.assigned_to = assigned_to;
    if (status === 'resolved') updates.resolved_at = now();
    updateRowById('ISSUES', 'issue_id', issue_id, updates);
    return { success: true };
  }

  function rate(body, user) {
    const { issue_id, rating, rating_comment } = body;
    const issue = findRow('ISSUES', 'issue_id', issue_id);
    if (!issue) throw new Error('ไม่พบปัญหา');
    if (user.role !== 'admin' && issue.house_id !== user.house_id)
      throw new Error('ไม่มีสิทธิ์');
    updateRowById('ISSUES', 'issue_id', issue_id, {
      rating, rating_comment: rating_comment || '', updated_at: now()
    });
    return { success: true };
  }

  return { getAll, getMine, create, updateStatus, rate };
})();


// ============================================================
// Violations.gs
// ============================================================

var Violations = (function() {

  function getAll(body, user) {
    requireAdmin(user);
    let rows = sheetToObjects('VIOLATIONS');
    if (body.status)   rows = rows.filter(r => r.status === body.status);
    if (body.house_id) rows = rows.filter(r => r.house_id === body.house_id);
    return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function getMine(body, user) {
    return sheetToObjects('VIOLATIONS')
      .filter(r => r.house_id === user.house_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function create(body, user) {
    requireAdmin(user);
    const { house_id, title, description, deadline, penalty_amount } = body;
    if (!house_id || !title) throw new Error('house_id และ title จำเป็น');

    const row = {
      vio_id:          genId('VIO'),
      house_id:        house_id,
      notified_by:     user.user_id,
      vio_type:        body.vio_type || 'other',
      title:           title,
      description:     description || '',
      image_urls:      JSON.stringify(body.image_urls || []),
      deadline:        deadline || '',
      penalty_amount:  penalty_amount || 0,
      fee_id:          '',
      status:          'pending',
      resident_ack_at: '',
      resolved_at:     '',
      admin_note:      body.admin_note || '',
      created_at:      now()
    };
    appendRow('VIOLATIONS', row);

    // If penalty > 0, link to fee
    if (Number(penalty_amount) > 0) {
      _linkPenaltyToFee(house_id, row.vio_id, Number(penalty_amount), title, user);
    }
    return row;
  }

  function updateStatus(body, user) {
    requireAdmin(user);
    const { vio_id, status, admin_note } = body;
    const updates = { status, admin_note: admin_note || '' };
    if (status === 'resolved') updates.resolved_at = now();
    updateRowById('VIOLATIONS', 'vio_id', vio_id, updates);
    return { success: true };
  }

  function acknowledge(body, user) {
    const { vio_id } = body;
    const vio = findRow('VIOLATIONS', 'vio_id', vio_id);
    if (!vio) throw new Error('ไม่พบการแจ้งเตือน');
    if (user.role !== 'admin' && vio.house_id !== user.house_id) throw new Error('ไม่มีสิทธิ์');
    updateRowById('VIOLATIONS', 'vio_id', vio_id, {
      status: 'acknowledged', resident_ack_at: now()
    });
    return { success: true };
  }

  function _linkPenaltyToFee(house_id, vio_id, amount, note, user) {
    // Find pending fee for this house
    const fees = sheetToObjects('FEES').filter(
      r => r.house_id === house_id && (r.status === 'pending' || r.status === 'overdue')
    );
    if (fees.length > 0) {
      const fee = fees[0];
      const new_penalty  = Number(fee.penalty_fee || 0) + amount;
      const new_note     = fee.penalty_fee_note
        ? fee.penalty_fee_note + ',' + vio_id
        : vio_id;
      const new_total    = Number(fee.total) + amount;
      updateRowById('FEES', 'fee_id', fee.fee_id, {
        penalty_fee:      new_penalty,
        penalty_fee_note: new_note,
        total:            new_total
      });
      updateRowById('VIOLATIONS', 'vio_id', vio_id, { fee_id: fee.fee_id });
    }
  }

  return { getAll, getMine, create, updateStatus, acknowledge };
})();
