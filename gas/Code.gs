// ============================================================
// Code.gs — Main Router & Helpers
// Village Management System v5.0
// ============================================================

const SHEET_ID      = '1Tpk0jT8IUk1fXlEAHLboXiWkVDxlYn1TX8WS0o7kf0s';
const DRIVE_FOLDER  = '1nE-7nxq_n_Acw5dchGrByWpVXl3lRR-e';
const JWT_SECRET    = 'VMS5_SECRET_KEY_2568';
const APP_VERSION   = '5.0';

// ── doGet: Health Check ──────────────────────────────────────
function doGet() {
  return respond(200, { status: 'ok', version: APP_VERSION, time: now() });
}

// ── doPost: Main Router ──────────────────────────────────────
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const PUBLIC = ['login'];
    let user = null;
    if (!PUBLIC.includes(action)) {
      user = Auth.verify(body.token);
      if (!user) return respond(401, { error: 'Unauthorized' });
    }

    const R = {
      /* AUTH */
      'login':                 () => Auth.login(body),
      'changePassword':        () => Auth.changePassword(body, user),
      /* HOUSES */
      'getHouses':             () => Houses.getAll(body, user),
      'getHouseById':          () => Houses.getById(body, user),
      'getHouseByUser':        () => Houses.getByUser(body, user),
      'createHouse':           () => Houses.create(body, user),
      'updateHouse':           () => Houses.update(body, user),
      /* VEHICLES */
      'getVehiclesByHouse':    () => Vehicles.getByHouse(body, user),
      'createVehicle':         () => Vehicles.create(body, user),
      'updateVehicle':         () => Vehicles.update(body, user),
      /* CHANGE REQUESTS */
      'getChangeRequests':     () => ChangeReq.getAll(body, user),
      'getMyChangeRequests':   () => ChangeReq.getMine(body, user),
      'submitChangeReq':       () => ChangeReq.submit(body, user),
      'approveChangeReq':      () => ChangeReq.approve(body, user),
      'rejectChangeReq':       () => ChangeReq.reject(body, user),
      /* FEES */
      'getFees':               () => Fees.getAll(body, user),
      'getFeesByHouse':        () => Fees.getByHouse(body, user),
      'generateFees':          () => Fees.generate(body, user),
      'submitSlip':            () => Fees.submitSlip(body, user),
      'approveSlip':           () => Fees.approveSlip(body, user),
      'issueNewBill':          () => Fees.issueNewBill(body, user),
      /* RECEIPTS */
      'getReceiptsByHouse':    () => Receipts.getByHouse(body, user),
      'createReceipt':         () => Receipts.create(body, user),
      /* ISSUES */
      'getIssues':             () => Issues.getAll(body, user),
      'getMyIssues':           () => Issues.getMine(body, user),
      'createIssue':           () => Issues.create(body, user),
      'updateIssueStatus':     () => Issues.updateStatus(body, user),
      'rateIssue':             () => Issues.rate(body, user),
      /* VIOLATIONS */
      'getViolations':         () => Violations.getAll(body, user),
      'getMyViolations':       () => Violations.getMine(body, user),
      'createViolation':       () => Violations.create(body, user),
      'updateViolationStatus': () => Violations.updateStatus(body, user),
      'acknowledgeViolation':  () => Violations.acknowledge(body, user),
      /* ANNOUNCEMENTS */
      'getAnnouncements':      () => Announcements.getAll(body, user),
      'createAnnouncement':    () => Announcements.create(body, user),
      'updateAnnouncement':    () => Announcements.update(body, user),
      'toggleAnnouncement':    () => Announcements.toggle(body, user),
      /* REPORTS */
      'getReports':            () => Reports.getAll(body, user),
      'createReport':          () => Reports.create(body, user),
      /* CONTRACTORS */
      'getContractors':        () => Contractors.getAll(body, user),
      'suggestContractor':     () => Contractors.suggest(body, user),
      'createContractor':      () => Contractors.create(body, user),
      'approveContractor':     () => Contractors.approve(body, user),
      'rejectContractor':      () => Contractors.reject(body, user),
      /* MARKETPLACE */
      'getMarketplace':        () => Marketplace.getAll(body, user),
      'postListing':           () => Marketplace.post(body, user),
      'approveListing':        () => Marketplace.approve(body, user),
      'rejectListing':         () => Marketplace.reject(body, user),
      'closeListing':          () => Marketplace.close(body, user),
      /* USERS */
      'getUsers':              () => Users.getAll(body, user),
      'createUser':            () => Users.create(body, user),
      'updateUser':            () => Users.update(body, user),
      'suspendUser':           () => Users.suspend(body, user),
      /* LOGS */
      'getLoginLogs':          () => LoginLogs.getAll(body, user),
      /* UPLOAD */
      'uploadImage':           () => Upload.base64(body, user),
      /* DASHBOARD */
      'getDashboard':          () => Dashboard.summary(body, user),
    };

    if (!R[action]) return respond(400, { error: 'Unknown action: ' + action });
    return respond(200, R[action]());

  } catch (err) {
    Logger.log('ERROR ' + err.message);
    return respond(err.httpCode || 500, { error: err.message });
  }
}

// ── respond ──────────────────────────────────────────────────
function respond(code, data) {
  const out = ContentService.createTextOutput(JSON.stringify({ code, data }));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

// ── getSheet ─────────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Sheet not found: ' + name);
  return sh;
}

// ── sheetToObjects ───────────────────────────────────────────
function sheetToObjects(name) {
  const sh   = getSheet(name);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const hdrs = data[0];
  return data.slice(1)
    .filter(r => r[0] !== '')           // skip empty rows
    .map(r => {
      const o = {};
      hdrs.forEach((h, i) => { o[h] = r[i] === '' ? '' : r[i]; });
      return o;
    });
}

// ── appendRow ────────────────────────────────────────────────
function appendRow(name, obj) {
  const sh   = getSheet(name);
  const hdrs = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(hdrs.map(h => obj[h] !== undefined ? obj[h] : ''));
}

// ── updateRowById ────────────────────────────────────────────
function updateRowById(name, idField, idValue, updates) {
  const sh   = getSheet(name);
  const data = sh.getDataRange().getValues();
  const hdrs = data[0];
  const iCol = hdrs.indexOf(idField);
  if (iCol < 0) throw new Error('Field not found: ' + idField);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][iCol]) === String(idValue)) {
      Object.keys(updates).forEach(k => {
        const c = hdrs.indexOf(k);
        if (c >= 0) sh.getRange(i + 1, c + 1).setValue(updates[k]);
      });
      return true;
    }
  }
  return false;
}

// ── findRow ──────────────────────────────────────────────────
function findRow(name, field, value) {
  return sheetToObjects(name).find(r => String(r[field]) === String(value)) || null;
}

// ── genId ────────────────────────────────────────────────────
function genId(prefix) {
  const t = new Date().getTime().toString(36).toUpperCase();
  const r = Math.random().toString(36).substr(2, 4).toUpperCase();
  return prefix + '-' + t + r;
}

// ── now ──────────────────────────────────────────────────────
function now() { return new Date().toISOString(); }

// ── requireAdmin ─────────────────────────────────────────────
function requireAdmin(user) {
  if (user.role !== 'admin') { const e = new Error('Admin only'); e.httpCode = 403; throw e; }
}

// ── parseJSON ────────────────────────────────────────────────
function parseJSON(s) {
  if (!s || s === '') return [];
  try { return JSON.parse(s); } catch(_) { return []; }
}

// ── hashPassword (simple SHA256 via Utilities) ────────────────
function hashPw(pw) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    pw + JWT_SECRET, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}
