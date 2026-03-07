// ================================================================
// GASTO SUKSAWAT VILLAGE MANAGEMENT SYSTEM
// Google Apps Script Backend API
// ================================================================

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // ← ใส่ ID ของ Google Sheet ที่นี่
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'gasto@admin2024'; // เปลี่ยนรหัสผ่านตามต้องการ

// Sheet Names
const SHEETS = {
  RESIDENTS:      'Residents',
  VEHICLES:       'Vehicles',
  COMMON_FEES:    'CommonFees',
  PAYMENTS:       'Payments',
  RECEIPTS:       'Receipts',
  INVOICES:       'Invoices',
  ANNOUNCEMENTS:  'Announcements',
  MONTHLY_REPORTS:'MonthlyReports',
  PROJECTS:       'Projects',
  USERS:          'Users'
};

// ================================================================
// MAIN ENTRY POINTS
// ================================================================

function doGet(e) {
  const params = e.parameter;
  const action = params.action;
  const token  = params.token;

  // Public actions (no auth needed)
  const publicActions = ['login', 'getAnnouncements', 'getProjects', 'getMonthlyReports'];

  if (!publicActions.includes(action)) {
    const auth = verifyToken(token);
    if (!auth.valid) return jsonResponse({ success: false, error: 'Unauthorized' });
  }

  try {
    switch (action) {
      // Auth
      case 'login':           return handleLogin(params);

      // Residents
      case 'getResidents':    return handleGetResidents(params, verifyToken(token));
      case 'getResident':     return handleGetResident(params, verifyToken(token));

      // Vehicles
      case 'getVehicles':     return handleGetVehicles(params, verifyToken(token));

      // Payments & Fees
      case 'getPayments':     return handleGetPayments(params, verifyToken(token));
      case 'getInvoices':     return handleGetInvoices(params, verifyToken(token));
      case 'getReceipts':     return handleGetReceipts(params, verifyToken(token));
      case 'getCommonFees':   return handleGetCommonFees(params, verifyToken(token));

      // Public
      case 'getAnnouncements': return handleGetAnnouncements(params);
      case 'getProjects':      return handleGetProjects(params);
      case 'getMonthlyReports':return handleGetMonthlyReports(params);

      // Dashboard
      case 'getDashboardStats': return handleGetDashboardStats(params, verifyToken(token));

      default: return jsonResponse({ success: false, error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch(err) { return jsonResponse({ success: false, error: 'Invalid JSON' }); }

  const action = body.action;
  const token  = body.token;

  const publicActions = ['login'];
  if (!publicActions.includes(action)) {
    const auth = verifyToken(token);
    if (!auth.valid) return jsonResponse({ success: false, error: 'Unauthorized' });
    if (!auth.isAdmin && !['updateResident','getResidentSelf'].includes(action)) {
      // Residents can only read their own data
    }
  }

  const auth = verifyToken(token);

  try {
    switch (action) {
      // Residents CRUD
      case 'addResident':     return handleAddResident(body, auth);
      case 'updateResident':  return handleUpdateResident(body, auth);
      case 'deleteResident':  return handleDeleteResident(body, auth);

      // Vehicles CRUD
      case 'addVehicle':      return handleAddVehicle(body, auth);
      case 'updateVehicle':   return handleUpdateVehicle(body, auth);
      case 'deleteVehicle':   return handleDeleteVehicle(body, auth);

      // Payments
      case 'addPayment':      return handleAddPayment(body, auth);
      case 'updatePayment':   return handleUpdatePayment(body, auth);

      // Invoices
      case 'addInvoice':      return handleAddInvoice(body, auth);
      case 'generateInvoices':return handleGenerateInvoices(body, auth);

      // Receipts
      case 'addReceipt':      return handleAddReceipt(body, auth);

      // Announcements
      case 'addAnnouncement': return handleAddAnnouncement(body, auth);
      case 'updateAnnouncement': return handleUpdateAnnouncement(body, auth);
      case 'deleteAnnouncement': return handleDeleteAnnouncement(body, auth);

      // Projects
      case 'addProject':      return handleAddProject(body, auth);
      case 'updateProject':   return handleUpdateProject(body, auth);
      case 'deleteProject':   return handleDeleteProject(body, auth);

      // Monthly Reports
      case 'addMonthlyReport':    return handleAddMonthlyReport(body, auth);
      case 'updateMonthlyReport': return handleUpdateMonthlyReport(body, auth);

      default: return jsonResponse({ success: false, error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ================================================================
// AUTH
// ================================================================

function handleLogin(params) {
  const username = params.username;
  const password = params.password;

  // Admin login
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = generateToken({ role: 'admin', username: 'admin', houseId: null });
    return jsonResponse({ success: true, token, role: 'admin', name: 'นิติบุคคล กัสโต้สุขสวัสดิ์' });
  }

  // Resident login (houseId as username, password from Residents sheet)
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.RESIDENTS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] == username && row[14] == password) { // col A=houseId, col O=password
      const token = generateToken({ role: 'resident', username: row[0], houseId: row[0], name: row[1] });
      return jsonResponse({
        success: true, token, role: 'resident',
        houseId: row[0], name: row[1]
      });
    }
  }

  return jsonResponse({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
}

function generateToken(payload) {
  const data = JSON.stringify(payload) + '|' + new Date().getTime();
  return Utilities.base64Encode(data);
}

function verifyToken(token) {
  if (!token) return { valid: false };
  try {
    const decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    const parts = decoded.split('|');
    const payload = JSON.parse(parts[0]);
    return { valid: true, isAdmin: payload.role === 'admin', ...payload };
  } catch(e) {
    return { valid: false };
  }
}

// ================================================================
// RESIDENTS
// ================================================================

function handleGetResidents(params, auth) {
  if (!auth.valid || !auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const data = getSheetData(SHEETS.RESIDENTS);
  return jsonResponse({ success: true, data });
}

function handleGetResident(params, auth) {
  if (!auth.valid) return jsonResponse({ success: false, error: 'Unauthorized' });
  const houseId = auth.isAdmin ? params.houseId : auth.houseId;
  const data = getSheetData(SHEETS.RESIDENTS);
  const resident = data.find(r => r.houseId == houseId);
  return jsonResponse({ success: true, data: resident || null });
}

function handleAddResident(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.RESIDENTS);
  const r = body.data;
  const id = generateId('H');
  sheet.appendRow([
    r.houseId, r.ownerName, r.phone, r.email, r.lineId,
    r.residents, r.moveInDate, r.status, r.area, r.feeRate,
    r.feeType, r.parkingFee, r.outstandingBalance || 0,
    r.address, r.password, new Date().toISOString()
  ]);
  return jsonResponse({ success: true, message: 'เพิ่มข้อมูลลูกบ้านสำเร็จ' });
}

function handleUpdateResident(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.RESIDENTS);
  const data = sheet.getDataRange().getValues();
  const r = body.data;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == r.houseId) {
      sheet.getRange(i + 1, 1, 1, 16).setValues([[
        r.houseId, r.ownerName, r.phone, r.email, r.lineId,
        r.residents, r.moveInDate, r.status, r.area, r.feeRate,
        r.feeType, r.parkingFee, r.outstandingBalance,
        r.address, r.password, data[i][15]
      ]]);
      return jsonResponse({ success: true, message: 'อัปเดตข้อมูลสำเร็จ' });
    }
  }
  return jsonResponse({ success: false, error: 'ไม่พบข้อมูล' });
}

function handleDeleteResident(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  return deleteRowByField(SHEETS.RESIDENTS, 0, body.houseId);
}

// ================================================================
// VEHICLES
// ================================================================

function handleGetVehicles(params, auth) {
  if (!auth.valid) return jsonResponse({ success: false, error: 'Unauthorized' });
  const data = getSheetData(SHEETS.VEHICLES);
  if (auth.isAdmin) return jsonResponse({ success: true, data });
  const filtered = data.filter(v => v.houseId == auth.houseId);
  return jsonResponse({ success: true, data: filtered });
}

function handleAddVehicle(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.VEHICLES);
  const v = body.data;
  sheet.appendRow([
    v.houseId, v.licensePlate, v.brand, v.model, v.color,
    v.type, v.stickerNumber, v.stickerExpiry, v.monthlyFee,
    v.status || 'active', new Date().toISOString()
  ]);
  return jsonResponse({ success: true, message: 'เพิ่มข้อมูลรถสำเร็จ' });
}

function handleUpdateVehicle(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.VEHICLES);
  const data = sheet.getDataRange().getValues();
  const v = body.data;
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] == v.licensePlate && data[i][0] == v.houseId) {
      sheet.getRange(i + 1, 1, 1, 11).setValues([[
        v.houseId, v.licensePlate, v.brand, v.model, v.color,
        v.type, v.stickerNumber, v.stickerExpiry, v.monthlyFee,
        v.status, data[i][10]
      ]]);
      return jsonResponse({ success: true, message: 'อัปเดตข้อมูลรถสำเร็จ' });
    }
  }
  return jsonResponse({ success: false, error: 'ไม่พบข้อมูล' });
}

function handleDeleteVehicle(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.VEHICLES);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] == body.licensePlate) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: 'ลบข้อมูลรถสำเร็จ' });
    }
  }
  return jsonResponse({ success: false, error: 'ไม่พบข้อมูล' });
}

// ================================================================
// PAYMENTS
// ================================================================

function handleGetPayments(params, auth) {
  if (!auth.valid) return jsonResponse({ success: false, error: 'Unauthorized' });
  const data = getSheetData(SHEETS.PAYMENTS);
  if (auth.isAdmin) return jsonResponse({ success: true, data });
  const filtered = data.filter(p => p.houseId == auth.houseId);
  return jsonResponse({ success: true, data: filtered });
}

function handleAddPayment(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.PAYMENTS);
  const p = body.data;
  const payId = 'PAY-' + new Date().getTime();
  sheet.appendRow([
    payId, p.houseId, p.paymentDate, p.amount, p.type,
    p.period, p.method, p.note, p.receivedBy, new Date().toISOString()
  ]);

  // Update outstanding balance
  updateOutstandingBalance(p.houseId, -parseFloat(p.amount));

  // Auto-create receipt
  createReceiptAuto(payId, p);

  return jsonResponse({ success: true, message: 'บันทึกการชำระเงินสำเร็จ', payId });
}

function handleUpdatePayment(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.PAYMENTS);
  const data = sheet.getDataRange().getValues();
  const p = body.data;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == p.payId) {
      sheet.getRange(i + 1, 1, 1, 10).setValues([[
        p.payId, p.houseId, p.paymentDate, p.amount, p.type,
        p.period, p.method, p.note, p.receivedBy, data[i][9]
      ]]);
      return jsonResponse({ success: true, message: 'อัปเดตสำเร็จ' });
    }
  }
  return jsonResponse({ success: false, error: 'ไม่พบข้อมูล' });
}

// ================================================================
// INVOICES
// ================================================================

function handleGetInvoices(params, auth) {
  if (!auth.valid) return jsonResponse({ success: false, error: 'Unauthorized' });
  const data = getSheetData(SHEETS.INVOICES);
  if (auth.isAdmin) return jsonResponse({ success: true, data });
  const filtered = data.filter(inv => inv.houseId == auth.houseId);
  return jsonResponse({ success: true, data: filtered });
}

function handleAddInvoice(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.INVOICES);
  const inv = body.data;
  const invId = generateInvoiceNumber();
  sheet.appendRow([
    invId, inv.houseId, inv.issueDate, inv.dueDate,
    inv.commonFee, inv.parkingFee, inv.otherFee, inv.totalAmount,
    inv.period, inv.status || 'pending', inv.note, new Date().toISOString()
  ]);

  // Update outstanding balance
  updateOutstandingBalance(inv.houseId, parseFloat(inv.totalAmount));

  return jsonResponse({ success: true, message: 'ออกใบแจ้งหนี้สำเร็จ', invId });
}

function handleGenerateInvoices(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const residents = getSheetData(SHEETS.RESIDENTS);
  const vehicles  = getSheetData(SHEETS.VEHICLES);
  const period    = body.period;
  const issueDate = body.issueDate;
  const dueDate   = body.dueDate;
  const sheet     = getSheet(SHEETS.INVOICES);
  let count = 0;

  residents.forEach(r => {
    if (r.status === 'ว่าง') return;
    const area      = parseFloat(r.area) || 0;
    const feeRate   = parseFloat(r.feeRate) || 0;
    const commonFee = r.feeType === 'per_sqm' ? area * feeRate : feeRate;

    const resVehicles = vehicles.filter(v => v.houseId == r.houseId && v.status === 'active');
    const parkingFee  = resVehicles.reduce((sum, v) => sum + (parseFloat(v.monthlyFee) || 0), 0);
    const totalAmount = commonFee + parkingFee;
    const invId       = generateInvoiceNumber();

    sheet.appendRow([
      invId, r.houseId, issueDate, dueDate,
      commonFee, parkingFee, 0, totalAmount,
      period, 'pending', 'ออกอัตโนมัติ', new Date().toISOString()
    ]);
    updateOutstandingBalance(r.houseId, totalAmount);
    count++;
  });

  return jsonResponse({ success: true, message: `ออกใบแจ้งหนี้ ${count} ใบสำเร็จ`, count });
}

// ================================================================
// RECEIPTS
// ================================================================

function handleGetReceipts(params, auth) {
  if (!auth.valid) return jsonResponse({ success: false, error: 'Unauthorized' });
  const data = getSheetData(SHEETS.RECEIPTS);
  if (auth.isAdmin) return jsonResponse({ success: true, data });
  const filtered = data.filter(r => r.houseId == auth.houseId);
  return jsonResponse({ success: true, data: filtered });
}

function handleAddReceipt(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.RECEIPTS);
  const r = body.data;
  const recId = generateReceiptNumber();
  sheet.appendRow([
    recId, r.houseId, r.payId, r.receiptDate, r.amount,
    r.type, r.period, r.receivedBy, r.note, new Date().toISOString()
  ]);
  return jsonResponse({ success: true, message: 'ออกใบเสร็จสำเร็จ', recId });
}

function createReceiptAuto(payId, p) {
  const sheet = getSheet(SHEETS.RECEIPTS);
  const recId = generateReceiptNumber();
  sheet.appendRow([
    recId, p.houseId, payId, p.paymentDate, p.amount,
    p.type, p.period, p.receivedBy, p.note || 'ออกอัตโนมัติ', new Date().toISOString()
  ]);

  // Mark invoice as paid
  markInvoicePaid(p.houseId, p.period);
}

function markInvoicePaid(houseId, period) {
  const sheet = getSheet(SHEETS.INVOICES);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] == houseId && data[i][8] == period && data[i][9] == 'pending') {
      sheet.getRange(i + 1, 10).setValue('paid');
      break;
    }
  }
}

// ================================================================
// COMMON FEES
// ================================================================

function handleGetCommonFees(params, auth) {
  if (!auth.valid) return jsonResponse({ success: false, error: 'Unauthorized' });
  const data = getSheetData(SHEETS.COMMON_FEES);
  return jsonResponse({ success: true, data });
}

// ================================================================
// ANNOUNCEMENTS
// ================================================================

function handleGetAnnouncements(params) {
  const data = getSheetData(SHEETS.ANNOUNCEMENTS);
  const active = data.filter(a => a.status === 'active').sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt));
  return jsonResponse({ success: true, data: active });
}

function handleAddAnnouncement(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.ANNOUNCEMENTS);
  const a = body.data;
  const id = 'ANN-' + new Date().getTime();
  sheet.appendRow([
    id, a.title, a.content, a.category, a.imageUrl || '',
    a.status || 'active', a.isPinned || false, new Date().toISOString(), auth.username
  ]);
  return jsonResponse({ success: true, message: 'เพิ่มประกาศสำเร็จ', id });
}

function handleUpdateAnnouncement(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.ANNOUNCEMENTS);
  const data  = sheet.getDataRange().getValues();
  const a = body.data;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == a.id) {
      sheet.getRange(i + 1, 1, 1, 9).setValues([[
        a.id, a.title, a.content, a.category, a.imageUrl || '',
        a.status, a.isPinned || false, data[i][7], auth.username
      ]]);
      return jsonResponse({ success: true, message: 'อัปเดตประกาศสำเร็จ' });
    }
  }
  return jsonResponse({ success: false, error: 'ไม่พบข้อมูล' });
}

function handleDeleteAnnouncement(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  return deleteRowByField(SHEETS.ANNOUNCEMENTS, 0, body.id);
}

// ================================================================
// PROJECTS (Village Achievements)
// ================================================================

function handleGetProjects(params) {
  const data = getSheetData(SHEETS.PROJECTS);
  return jsonResponse({ success: true, data: data.sort((a, b) =>
    new Date(b.startDate) - new Date(a.startDate)) });
}

function handleAddProject(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.PROJECTS);
  const p = body.data;
  const id = 'PROJ-' + new Date().getTime();
  sheet.appendRow([
    id, p.title, p.description, p.category, p.startDate,
    p.endDate || '', p.budget, p.actualCost || 0, p.status,
    p.beforeImageUrl || '', p.afterImageUrl || '', p.progress || 0,
    p.contractor || '', p.note || '', new Date().toISOString()
  ]);
  return jsonResponse({ success: true, message: 'เพิ่มโครงการสำเร็จ', id });
}

function handleUpdateProject(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.PROJECTS);
  const data  = sheet.getDataRange().getValues();
  const p = body.data;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == p.id) {
      sheet.getRange(i + 1, 1, 1, 15).setValues([[
        p.id, p.title, p.description, p.category, p.startDate,
        p.endDate || '', p.budget, p.actualCost || 0, p.status,
        p.beforeImageUrl || '', p.afterImageUrl || '', p.progress || 0,
        p.contractor || '', p.note || '', data[i][14]
      ]]);
      return jsonResponse({ success: true, message: 'อัปเดตโครงการสำเร็จ' });
    }
  }
  return jsonResponse({ success: false, error: 'ไม่พบข้อมูล' });
}

function handleDeleteProject(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  return deleteRowByField(SHEETS.PROJECTS, 0, body.id);
}

// ================================================================
// MONTHLY REPORTS
// ================================================================

function handleGetMonthlyReports(params) {
  const data = getSheetData(SHEETS.MONTHLY_REPORTS);
  return jsonResponse({ success: true, data: data.sort((a, b) =>
    new Date(b.month) - new Date(a.month)) });
}

function handleAddMonthlyReport(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.MONTHLY_REPORTS);
  const r = body.data;
  const id = 'RPT-' + new Date().getTime();
  sheet.appendRow([
    id, r.month, r.totalIncome, r.commonFeeIncome, r.parkingIncome,
    r.otherIncome, r.totalExpense, r.netBalance, r.totalHouses,
    r.paidHouses, r.pendingHouses, r.collectionRate,
    r.highlight || '', r.note || '', new Date().toISOString()
  ]);
  return jsonResponse({ success: true, message: 'บันทึกรายงานสำเร็จ', id });
}

function handleUpdateMonthlyReport(body, auth) {
  if (!auth.isAdmin) return jsonResponse({ success: false, error: 'Admin only' });
  const sheet = getSheet(SHEETS.MONTHLY_REPORTS);
  const data  = sheet.getDataRange().getValues();
  const r = body.data;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == r.id) {
      sheet.getRange(i + 1, 1, 1, 15).setValues([[
        r.id, r.month, r.totalIncome, r.commonFeeIncome, r.parkingIncome,
        r.otherIncome, r.totalExpense, r.netBalance, r.totalHouses,
        r.paidHouses, r.pendingHouses, r.collectionRate,
        r.highlight || '', r.note || '', data[i][14]
      ]]);
      return jsonResponse({ success: true, message: 'อัปเดตรายงานสำเร็จ' });
    }
  }
  return jsonResponse({ success: false, error: 'ไม่พบข้อมูล' });
}

// ================================================================
// DASHBOARD STATS
// ================================================================

function handleGetDashboardStats(params, auth) {
  if (!auth.valid) return jsonResponse({ success: false, error: 'Unauthorized' });

  if (auth.isAdmin) {
    const residents  = getSheetData(SHEETS.RESIDENTS);
    const payments   = getSheetData(SHEETS.PAYMENTS);
    const invoices   = getSheetData(SHEETS.INVOICES);
    const projects   = getSheetData(SHEETS.PROJECTS);
    const announcements = getSheetData(SHEETS.ANNOUNCEMENTS);

    const now     = new Date();
    const month   = now.getMonth();
    const year    = now.getFullYear();

    const monthPayments = payments.filter(p => {
      const d = new Date(p.paymentDate);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const totalIncome    = monthPayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const totalHouses    = residents.length;
    const pendingInvoices = invoices.filter(i => i.status === 'pending').length;
    const activeProjects  = projects.filter(p => p.status === 'กำลังดำเนินการ').length;
    const recentAnn       = announcements.filter(a => a.status === 'active').slice(0, 5);

    const pendingList = invoices
      .filter(i => i.status === 'pending')
      .map(i => {
        const res = residents.find(r => r.houseId == i.houseId);
        return { houseId: i.houseId, name: res ? res.ownerName : '-', amount: i.totalAmount, period: i.period };
      }).slice(0, 10);

    return jsonResponse({
      success: true,
      data: {
        totalIncome, totalHouses, pendingInvoices, activeProjects,
        recentAnnouncements: recentAnn,
        pendingList,
        monthlyIncomeChart: getMonthlyIncomeData(payments)
      }
    });
  } else {
    // Resident dashboard
    const resident  = getSheetData(SHEETS.RESIDENTS).find(r => r.houseId == auth.houseId);
    const payments  = getSheetData(SHEETS.PAYMENTS).filter(p => p.houseId == auth.houseId);
    const invoices  = getSheetData(SHEETS.INVOICES).filter(i => i.houseId == auth.houseId);
    const vehicles  = getSheetData(SHEETS.VEHICLES).filter(v => v.houseId == auth.houseId);
    const announcements = getSheetData(SHEETS.ANNOUNCEMENTS).filter(a => a.status === 'active').slice(0, 5);
    const projects  = getSheetData(SHEETS.PROJECTS).slice(0, 5);

    return jsonResponse({
      success: true,
      data: {
        resident,
        outstandingBalance: resident ? resident.outstandingBalance : 0,
        recentPayments: payments.slice(-5).reverse(),
        pendingInvoices: invoices.filter(i => i.status === 'pending'),
        vehicles,
        recentAnnouncements: announcements,
        recentProjects: projects
      }
    });
  }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function getSheetData(name) {
  const sheet = getSheet(name);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(h => toCamelCase(h.toString()));
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function toCamelCase(str) {
  return str.replace(/[_\s](.)/g, (m, c) => c.toUpperCase()).replace(/^(.)/, c => c.toLowerCase());
}

function deleteRowByField(sheetName, colIndex, value) {
  const sheet = getSheet(sheetName);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][colIndex] == value) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    }
  }
  return jsonResponse({ success: false, error: 'ไม่พบข้อมูล' });
}

function updateOutstandingBalance(houseId, delta) {
  const sheet = getSheet(SHEETS.RESIDENTS);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == houseId) {
      const current = parseFloat(data[i][12]) || 0;
      sheet.getRange(i + 1, 13).setValue(current + delta);
      break;
    }
  }
}

function generateId(prefix) {
  return prefix + '-' + new Date().getTime();
}

let receiptCounter = 0;
function generateReceiptNumber() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const sheet = getSheet(SHEETS.RECEIPTS);
  const count = sheet ? sheet.getLastRow() : 0;
  return `REC-${y}${m}-${String(count + 1).padStart(4, '0')}`;
}

function generateInvoiceNumber() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const sheet = getSheet(SHEETS.INVOICES);
  const count = sheet ? sheet.getLastRow() : 0;
  return `INV-${y}${m}-${String(count + 1).padStart(4, '0')}`;
}

function getMonthlyIncomeData(payments) {
  const months = {};
  payments.forEach(p => {
    const d = new Date(p.paymentDate);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = (months[key] || 0) + parseFloat(p.amount || 0);
  });
  return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================================================================
// SETUP - Run this ONCE to create all sheets
// ================================================================

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const configs = [
    { name: SHEETS.RESIDENTS, headers: [
      'houseId','ownerName','phone','email','lineId','residents',
      'moveInDate','status','area','feeRate','feeType','parkingFee',
      'outstandingBalance','address','password','createdAt'
    ]},
    { name: SHEETS.VEHICLES, headers: [
      'houseId','licensePlate','brand','model','color','type',
      'stickerNumber','stickerExpiry','monthlyFee','status','createdAt'
    ]},
    { name: SHEETS.COMMON_FEES, headers: [
      'id','name','amount','type','description','effectiveDate','createdAt'
    ]},
    { name: SHEETS.PAYMENTS, headers: [
      'payId','houseId','paymentDate','amount','type','period',
      'method','note','receivedBy','createdAt'
    ]},
    { name: SHEETS.RECEIPTS, headers: [
      'receiptId','houseId','payId','receiptDate','amount',
      'type','period','receivedBy','note','createdAt'
    ]},
    { name: SHEETS.INVOICES, headers: [
      'invoiceId','houseId','issueDate','dueDate','commonFee',
      'parkingFee','otherFee','totalAmount','period','status','note','createdAt'
    ]},
    { name: SHEETS.ANNOUNCEMENTS, headers: [
      'id','title','content','category','imageUrl',
      'status','isPinned','createdAt','createdBy'
    ]},
    { name: SHEETS.MONTHLY_REPORTS, headers: [
      'id','month','totalIncome','commonFeeIncome','parkingIncome',
      'otherIncome','totalExpense','netBalance','totalHouses',
      'paidHouses','pendingHouses','collectionRate','highlight','note','createdAt'
    ]},
    { name: SHEETS.PROJECTS, headers: [
      'id','title','description','category','startDate','endDate',
      'budget','actualCost','status','beforeImageUrl','afterImageUrl',
      'progress','contractor','note','createdAt'
    ]}
  ];

  configs.forEach(cfg => {
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(cfg.headers);
      sheet.getRange(1, 1, 1, cfg.headers.length)
        .setBackground('#1a73e8').setFontColor('white').setFontWeight('bold');
    }
  });

  // Add sample admin resident
  const resSheet = ss.getSheetByName(SHEETS.RESIDENTS);
  if (resSheet.getLastRow() === 1) {
    resSheet.appendRow([
      '1/1','ตัวอย่าง เจ้าบ้าน','081-234-5678','sample@email.com','@sample',
      2,'2024-01-01','อยู่อาศัย',120,35,'per_sqm',500,0,
      '1/1 หมู่บ้านกัสโต้สุขสวัสดิ์','resident001',new Date().toISOString()
    ]);
  }

  Logger.log('✅ Setup complete! All sheets created.');
  Logger.log('📋 Spreadsheet ID: ' + SPREADSHEET_ID);
}
