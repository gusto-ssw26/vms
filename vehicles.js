// ================================================================
// VEHICLES PAGE
// ================================================================
Pages.vehicles = async function(myOnly = false) {
  const content = document.getElementById('pageContent');
  const res = await API.getVehicles();
  if (!res.success) { content.innerHTML = errorHtml(res.error); return; }

  let vehicles = res.data || [];
  if (myOnly) vehicles = vehicles.filter(v => v.houseId == App.user.houseId);

  const typeIcon = { 'รถยนต์':'🚗','มอเตอร์ไซค์':'🏍️','รถกระบะ':'🛻','อื่นๆ':'🚙' };
  const expiredBadge = (d) => {
    if (!d) return '<span class="badge badge-gray">ไม่มี</span>';
    const diff = new Date(d) - new Date();
    if (diff < 0) return '<span class="badge badge-red">หมดอายุ</span>';
    if (diff < 30*86400000) return '<span class="badge badge-orange">ใกล้หมด</span>';
    return '<span class="badge badge-green">ปกติ</span>';
  };

  content.innerHTML = `
    <div class="flex-between mb-16">
      <div class="section-title" style="margin-bottom:0">🚗 ${myOnly?'รถของฉัน':'ข้อมูลรถยนต์'} (${vehicles.length} คัน)</div>
      ${App.isAdmin() ? `<button class="btn-primary" onclick="showAddVehicleModal()">➕ เพิ่มรถ</button>` : ''}
    </div>
    <div class="search-bar">
      <div class="search-input-wrap">
        <input type="text" placeholder="ค้นหาทะเบียน, ยี่ห้อ, บ้านเลขที่..." id="vehicleSearch" oninput="filterVehicles(this.value)">
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${!myOnly?'<th>บ้านเลขที่</th>':''}
            <th>ทะเบียน</th>
            <th>ยี่ห้อ/รุ่น</th>
            <th>สี</th>
            <th>ประเภท</th>
            <th>สติ๊กเกอร์</th>
            <th>หมดอายุ</th>
            <th>ค่าจอด/เดือน</th>
            ${App.isAdmin()?'<th>จัดการ</th>':''}
          </tr>
        </thead>
        <tbody id="vehiclesTbody">
          ${vehicles.length ? vehicles.map(v => `
            <tr>
              ${!myOnly?`<td><strong>${v.houseId}</strong></td>`:''}
              <td><strong class="font-mono">${v.licensePlate}</strong></td>
              <td>${v.brand||''} ${v.model||''}</td>
              <td><span style="display:inline-flex;align-items:center;gap:6px">
                <span style="width:12px;height:12px;border-radius:50%;background:${v.color||'#ccc'};border:1px solid var(--separator)"></span>
                ${v.color||'-'}
              </span></td>
              <td>${typeIcon[v.type]||'🚗'} ${v.type||'-'}</td>
              <td class="font-mono td-secondary">${v.stickerNumber||'-'}</td>
              <td>${expiredBadge(v.stickerExpiry)} <span class="td-secondary" style="font-size:12px">${formatDate(v.stickerExpiry)}</span></td>
              <td>฿${formatMoney(v.monthlyFee)}</td>
              ${App.isAdmin()?`<td><div style="display:flex;gap:6px">
                <button class="btn-secondary btn-sm" onclick='editVehicle(${JSON.stringify(v).replace(/'/g,"&#39;")})'>✏️</button>
                <button class="btn-danger btn-sm" onclick="deleteVehicle('${v.licensePlate}')">🗑</button>
              </div></td>`:''}
            </tr>
          `).join('') : `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-secondary)">ไม่พบข้อมูล</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
};

window.showAddVehicleModal = function(data = null) {
  const isEdit = !!data;
  const d = data || {};
  openModal(isEdit ? '✏️ แก้ไขข้อมูลรถ' : '➕ เพิ่มรถใหม่', `
    <div class="form-grid">
      <div class="form-group"><label>บ้านเลขที่ *</label><input id="v_houseId" value="${d.houseId||''}" placeholder="1/1"></div>
      <div class="form-group"><label>ทะเบียนรถ *</label><input id="v_licensePlate" value="${d.licensePlate||''}" placeholder="กข 1234"></div>
      <div class="form-group"><label>ยี่ห้อ</label><input id="v_brand" value="${d.brand||''}" placeholder="Toyota"></div>
      <div class="form-group"><label>รุ่น</label><input id="v_model" value="${d.model||''}" placeholder="Camry"></div>
      <div class="form-group"><label>สี</label><input id="v_color" value="${d.color||''}" placeholder="สีขาว"></div>
      <div class="form-group"><label>ประเภทรถ</label>
        <select id="v_type">${['รถยนต์','มอเตอร์ไซค์','รถกระบะ','อื่นๆ'].map(t=>`<option ${d.type===t?'selected':''}>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>หมายเลขสติ๊กเกอร์</label><input id="v_stickerNumber" value="${d.stickerNumber||''}"></div>
      <div class="form-group"><label>วันหมดอายุสติ๊กเกอร์</label><input id="v_stickerExpiry" type="date" value="${d.stickerExpiry||''}"></div>
      <div class="form-group"><label>ค่าจอดรถ/เดือน (บาท)</label><input id="v_monthlyFee" type="number" value="${d.monthlyFee||0}"></div>
      <div class="form-group"><label>สถานะ</label>
        <select id="v_status"><option value="active" ${d.status!='inactive'?'selected':''}>ใช้งาน</option><option value="inactive" ${d.status=='inactive'?'selected':''}>ไม่ใช้งาน</option></select>
      </div>
    </div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">ยกเลิก</button>
    <button class="btn-primary" onclick="saveVehicle(${isEdit})">💾 ${isEdit?'บันทึก':'เพิ่มรถ'}</button>
  `);
};

window.editVehicle = function(data) { showAddVehicleModal(data); };

window.saveVehicle = async function(isEdit) {
  const data = {
    houseId: document.getElementById('v_houseId').value.trim(),
    licensePlate: document.getElementById('v_licensePlate').value.trim(),
    brand: document.getElementById('v_brand').value.trim(),
    model: document.getElementById('v_model').value.trim(),
    color: document.getElementById('v_color').value.trim(),
    type: document.getElementById('v_type').value,
    stickerNumber: document.getElementById('v_stickerNumber').value.trim(),
    stickerExpiry: document.getElementById('v_stickerExpiry').value,
    monthlyFee: document.getElementById('v_monthlyFee').value,
    status: document.getElementById('v_status').value,
  };
  if (!data.houseId || !data.licensePlate) { showToast('กรุณากรอกบ้านเลขที่และทะเบียนรถ','error'); return; }
  showLoading();
  const res = isEdit ? await API.updateVehicle(data) : await API.addVehicle(data);
  hideLoading();
  if (res.success) { closeModal(); showToast(res.message,'success'); Pages.vehicles(); }
  else showToast(res.error,'error');
};

window.deleteVehicle = async function(plate) {
  if (!confirm(`ลบทะเบียน ${plate}?`)) return;
  showLoading();
  const res = await API.deleteVehicle(plate);
  hideLoading();
  if (res.success) { showToast(res.message,'success'); Pages.vehicles(); }
  else showToast(res.error,'error');
};

window.filterVehicles = function(q) { Pages.vehicles(); }; // re-render with filter

// ================================================================
// PAYMENTS PAGE
// ================================================================
Pages.payments = async function(myOnly = false) {
  const content = document.getElementById('pageContent');
  const [payRes, resRes] = await Promise.all([API.getPayments(), App.isAdmin() ? API.getResidents() : Promise.resolve({success:true,data:[]})]);
  if (!payRes.success) { content.innerHTML = errorHtml(payRes.error); return; }

  let payments = payRes.data || [];
  const residents = resRes.data || [];
  if (myOnly) payments = payments.filter(p => p.houseId == App.user.houseId);

  const methodBadge = { 'โอนเงิน':'badge-blue','เงินสด':'badge-green','อื่นๆ':'badge-gray' };

  content.innerHTML = `
    <div class="flex-between mb-16">
      <div class="section-title" style="margin-bottom:0">💰 ${myOnly?'ประวัติชำระเงินของฉัน':'รับชำระเงิน'} (${payments.length} รายการ)</div>
      ${App.isAdmin() ? `<button class="btn-primary" onclick="showAddPaymentModal()">➕ บันทึกรับเงิน</button>` : ''}
    </div>
    <div class="search-bar">
      <div class="search-input-wrap">
        <input type="text" placeholder="ค้นหาบ้านเลขที่, งวด..." id="paySearch">
      </div>
      <select class="filter-select" id="payMethod">
        <option value="">วิธีชำระทั้งหมด</option>
        <option>โอนเงิน</option><option>เงินสด</option><option>อื่นๆ</option>
      </select>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>วันที่ชำระ</th>
            ${!myOnly?'<th>บ้านเลขที่</th>':''}
            <th>จำนวนเงิน</th>
            <th>งวด</th>
            <th>ประเภท</th>
            <th>วิธีชำระ</th>
            <th>ผู้รับ</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          ${payments.length ? payments.slice().reverse().map(p => `
            <tr>
              <td>${formatDate(p.paymentDate)}</td>
              ${!myOnly?`<td><strong>${p.houseId}</strong></td>`:''}
              <td><strong class="text-success">฿${formatMoney(p.amount)}</strong></td>
              <td class="td-secondary">${p.period||'-'}</td>
              <td class="td-secondary">${p.type||'-'}</td>
              <td><span class="badge ${methodBadge[p.method]||'badge-gray'}">${p.method||'-'}</span></td>
              <td class="td-secondary">${p.receivedBy||'-'}</td>
              <td class="td-secondary">${p.note||'-'}</td>
            </tr>
          `).join('') : `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-secondary)">ไม่พบข้อมูล</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
};

window.showAddPaymentModal = async function() {
  const resRes = await API.getResidents();
  const residents = resRes.data || [];
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0,7);

  openModal('➕ บันทึกรับชำระเงิน', `
    <div class="form-grid">
      <div class="form-group"><label>บ้านเลขที่ *</label>
        <select id="p_houseId">
          <option value="">-- เลือกบ้าน --</option>
          ${residents.map(r=>`<option value="${r.houseId}">${r.houseId} - ${r.ownerName}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>วันที่ชำระ *</label><input id="p_date" type="date" value="${today}"></div>
      <div class="form-group"><label>จำนวนเงิน (บาท) *</label><input id="p_amount" type="number" placeholder="0.00"></div>
      <div class="form-group"><label>ประเภท</label>
        <select id="p_type"><option>ค่าส่วนกลาง</option><option>ค่าจอดรถ</option><option>ค่าส่วนกลาง+ค่าจอดรถ</option><option>อื่นๆ</option></select>
      </div>
      <div class="form-group"><label>งวดที่ชำระ</label><input id="p_period" type="month" value="${thisMonth}"></div>
      <div class="form-group"><label>วิธีชำระ</label>
        <select id="p_method"><option>โอนเงิน</option><option>เงินสด</option><option>อื่นๆ</option></select>
      </div>
      <div class="form-group"><label>ผู้รับชำระ</label><input id="p_received" value="นิติบุคคล" placeholder="ชื่อผู้รับ"></div>
      <div class="form-group"><label>หมายเหตุ</label><input id="p_note" placeholder="หมายเหตุเพิ่มเติม"></div>
    </div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">ยกเลิก</button>
    <button class="btn-primary" onclick="savePayment()">💾 บันทึกรับเงิน</button>
  `);
};

window.savePayment = async function() {
  const data = {
    houseId: document.getElementById('p_houseId').value,
    paymentDate: document.getElementById('p_date').value,
    amount: document.getElementById('p_amount').value,
    type: document.getElementById('p_type').value,
    period: document.getElementById('p_period').value,
    method: document.getElementById('p_method').value,
    receivedBy: document.getElementById('p_received').value,
    note: document.getElementById('p_note').value,
  };
  if (!data.houseId || !data.amount) { showToast('กรุณากรอกข้อมูลให้ครบ','error'); return; }
  showLoading();
  const res = await API.addPayment(data);
  hideLoading();
  if (res.success) { closeModal(); showToast(res.message,'success'); Pages.payments(); }
  else showToast(res.error,'error');
};

// ================================================================
// INVOICES PAGE
// ================================================================
Pages.invoices = async function(myOnly = false) {
  const content = document.getElementById('pageContent');
  const res = await API.getInvoices();
  if (!res.success) { content.innerHTML = errorHtml(res.error); return; }

  let invoices = res.data || [];
  if (myOnly) invoices = invoices.filter(i => i.houseId == App.user.houseId);

  const statusBadge = { 'paid':'badge-green','pending':'badge-orange','overdue':'badge-red' };
  const statusLabel = { 'paid':'ชำระแล้ว','pending':'ค้างชำระ','overdue':'เกินกำหนด' };

  content.innerHTML = `
    <div class="flex-between mb-16">
      <div class="section-title" style="margin-bottom:0">📄 ${myOnly?'ใบแจ้งหนี้ของฉัน':'จัดการใบแจ้งหนี้'} (${invoices.length} ใบ)</div>
      ${App.isAdmin() ? `<div style="display:flex;gap:8px">
        <button class="btn-secondary" onclick="showGenerateInvoicesModal()">⚡ ออกบิลรวม</button>
        <button class="btn-primary" onclick="showAddInvoiceModal()">➕ ออกใบแจ้งหนี้</button>
      </div>` : ''}
    </div>
    <div class="search-bar">
      <div class="search-input-wrap">
        <input type="text" placeholder="ค้นหาเลขที่ใบแจ้งหนี้, บ้านเลขที่...">
      </div>
      <select class="filter-select">
        <option value="">สถานะทั้งหมด</option>
        <option value="pending">ค้างชำระ</option>
        <option value="paid">ชำระแล้ว</option>
        <option value="overdue">เกินกำหนด</option>
      </select>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>เลขที่ใบแจ้งหนี้</th>
            ${!myOnly?'<th>บ้านเลขที่</th>':''}
            <th>งวด</th>
            <th>ค่าส่วนกลาง</th>
            <th>ค่าจอดรถ</th>
            <th>รวม</th>
            <th>ครบกำหนด</th>
            <th>สถานะ</th>
            <th>พิมพ์</th>
          </tr>
        </thead>
        <tbody>
          ${invoices.length ? invoices.slice().reverse().map(inv => `
            <tr>
              <td class="font-mono" style="font-size:13px">${inv.invoiceId||'-'}</td>
              ${!myOnly?`<td><strong>${inv.houseId}</strong></td>`:''}
              <td>${inv.period||'-'}</td>
              <td>฿${formatMoney(inv.commonFee)}</td>
              <td>฿${formatMoney(inv.parkingFee)}</td>
              <td><strong>฿${formatMoney(inv.totalAmount)}</strong></td>
              <td class="${new Date(inv.dueDate) < new Date() && inv.status!=='paid' ? 'text-danger' : 'td-secondary'}">${formatDate(inv.dueDate)}</td>
              <td><span class="badge ${statusBadge[inv.status]||'badge-gray'}">${statusLabel[inv.status]||inv.status}</span></td>
              <td><button class="btn-secondary btn-sm" onclick='printInvoice(${JSON.stringify(inv).replace(/'/g,"&#39;")})'>🖨️</button></td>
            </tr>
          `).join('') : `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-secondary)">ไม่พบข้อมูล</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
};

window.showGenerateInvoicesModal = function() {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0,7);
  const nextMonth = new Date(new Date().setMonth(new Date().getMonth()+1));
  const dueDate = nextMonth.toISOString().split('T')[0];

  openModal('⚡ ออกใบแจ้งหนี้รวมทุกหลัง', `
    <div style="background:rgba(0,122,255,0.08);border-radius:var(--radius-md);padding:14px;margin-bottom:20px;font-size:14px;color:var(--ios-blue)">
      ⚡ ระบบจะออกใบแจ้งหนี้ให้ทุกหลังที่ไม่ใช่สถานะ "ว่าง" โดยอัตโนมัติ
    </div>
    <div class="form-grid">
      <div class="form-group"><label>งวดที่ออก (เดือน-ปี) *</label><input id="gi_period" type="month" value="${thisMonth}"></div>
      <div class="form-group"><label>วันที่ออกใบแจ้งหนี้</label><input id="gi_issue" type="date" value="${today}"></div>
      <div class="form-group"><label>วันครบกำหนดชำระ *</label><input id="gi_due" type="date" value="${dueDate}"></div>
    </div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">ยกเลิก</button>
    <button class="btn-primary" onclick="generateInvoices()">⚡ ออกใบแจ้งหนี้ทั้งหมด</button>
  `);
};

window.generateInvoices = async function() {
  const period = document.getElementById('gi_period').value;
  const issueDate = document.getElementById('gi_issue').value;
  const dueDate = document.getElementById('gi_due').value;
  if (!period || !dueDate) { showToast('กรุณากรอกข้อมูลให้ครบ','error'); return; }
  showLoading();
  const res = await API.generateInvoices({ period, issueDate, dueDate });
  hideLoading();
  if (res.success) { closeModal(); showToast(res.message,'success'); Pages.invoices(); }
  else showToast(res.error,'error');
};

window.showAddInvoiceModal = async function() {
  const resRes = await API.getResidents();
  const residents = resRes.data || [];
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0,7);

  openModal('➕ ออกใบแจ้งหนี้', `
    <div class="form-grid">
      <div class="form-group"><label>บ้านเลขที่ *</label>
        <select id="inv_house">
          <option value="">-- เลือกบ้าน --</option>
          ${residents.map(r=>`<option value="${r.houseId}">${r.houseId} - ${r.ownerName}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>งวด *</label><input id="inv_period" type="month" value="${thisMonth}"></div>
      <div class="form-group"><label>วันที่ออก</label><input id="inv_issue" type="date" value="${today}"></div>
      <div class="form-group"><label>วันครบกำหนด</label><input id="inv_due" type="date"></div>
      <div class="form-group"><label>ค่าส่วนกลาง</label><input id="inv_common" type="number" value="0"></div>
      <div class="form-group"><label>ค่าจอดรถ</label><input id="inv_parking" type="number" value="0"></div>
      <div class="form-group"><label>รายการอื่นๆ</label><input id="inv_other" type="number" value="0"></div>
      <div class="form-group"><label>หมายเหตุ</label><input id="inv_note"></div>
    </div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">ยกเลิก</button>
    <button class="btn-primary" onclick="saveInvoice()">💾 ออกใบแจ้งหนี้</button>
  `);
};

window.saveInvoice = async function() {
  const c = parseFloat(document.getElementById('inv_common').value)||0;
  const p = parseFloat(document.getElementById('inv_parking').value)||0;
  const o = parseFloat(document.getElementById('inv_other').value)||0;
  const data = {
    houseId: document.getElementById('inv_house').value,
    period: document.getElementById('inv_period').value,
    issueDate: document.getElementById('inv_issue').value,
    dueDate: document.getElementById('inv_due').value,
    commonFee: c, parkingFee: p, otherFee: o,
    totalAmount: c+p+o,
    note: document.getElementById('inv_note').value,
  };
  if (!data.houseId) { showToast('กรุณาเลือกบ้าน','error'); return; }
  showLoading();
  const res = await API.addInvoice(data);
  hideLoading();
  if (res.success) { closeModal(); showToast(res.message,'success'); Pages.invoices(); }
  else showToast(res.error,'error');
};

window.printInvoice = function(inv) {
  openModal('🖨️ ใบแจ้งหนี้', `
    <div class="receipt-box">
      <div class="receipt-logo">
        <div style="font-size:40px">🏘️</div>
        <h2>หมู่บ้านกัสโต้สุขสวัสดิ์</h2>
        <p>ใบแจ้งหนี้ค่าส่วนกลาง</p>
      </div>
      <hr class="receipt-divider">
      <div class="receipt-row"><span class="receipt-num">เลขที่</span><strong>${inv.invoiceId}</strong></div>
      <div class="receipt-row"><span>บ้านเลขที่</span><strong>${inv.houseId}</strong></div>
      <div class="receipt-row"><span>งวด</span><span>${inv.period}</span></div>
      <div class="receipt-row"><span>วันที่ออก</span><span>${formatDate(inv.issueDate)}</span></div>
      <div class="receipt-row"><span>ครบกำหนด</span><span>${formatDate(inv.dueDate)}</span></div>
      <hr class="receipt-divider">
      <div class="receipt-row"><span>ค่าส่วนกลาง</span><span>฿${formatMoney(inv.commonFee)}</span></div>
      <div class="receipt-row"><span>ค่าจอดรถ</span><span>฿${formatMoney(inv.parkingFee)}</span></div>
      ${parseFloat(inv.otherFee)>0?`<div class="receipt-row"><span>รายการอื่น</span><span>฿${formatMoney(inv.otherFee)}</span></div>`:''}
      <hr class="receipt-divider">
      <div class="receipt-row receipt-total"><span>ยอดรวม</span><strong>฿${formatMoney(inv.totalAmount)}</strong></div>
      ${inv.note?`<div style="font-size:12px;color:#6C6C70;margin-top:12px">หมายเหตุ: ${inv.note}</div>`:''}
    </div>
  `, `<button class="btn-secondary" onclick="closeModal()">ปิด</button><button class="btn-primary" onclick="window.print()">🖨️ พิมพ์</button>`);
};

// ================================================================
// RECEIPTS PAGE
// ================================================================
Pages.receipts = async function(myOnly = false) {
  const content = document.getElementById('pageContent');
  const res = await API.getReceipts();
  if (!res.success) { content.innerHTML = errorHtml(res.error); return; }

  let receipts = res.data || [];
  if (myOnly) receipts = receipts.filter(r => r.houseId == App.user.houseId);

  content.innerHTML = `
    <div class="flex-between mb-16">
      <div class="section-title" style="margin-bottom:0">🧾 ${myOnly?'ใบเสร็จของฉัน':'ใบเสร็จรับเงิน'} (${receipts.length} ใบ)</div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>เลขที่ใบเสร็จ</th>
            ${!myOnly?'<th>บ้านเลขที่</th>':''}
            <th>วันที่</th>
            <th>จำนวนเงิน</th>
            <th>งวด</th>
            <th>ประเภท</th>
            <th>ผู้รับ</th>
            <th>พิมพ์</th>
          </tr>
        </thead>
        <tbody>
          ${receipts.length ? receipts.slice().reverse().map(r => `
            <tr>
              <td class="font-mono" style="font-size:13px">${r.receiptId||'-'}</td>
              ${!myOnly?`<td><strong>${r.houseId}</strong></td>`:''}
              <td>${formatDate(r.receiptDate)}</td>
              <td><strong class="text-success">฿${formatMoney(r.amount)}</strong></td>
              <td class="td-secondary">${r.period||'-'}</td>
              <td class="td-secondary">${r.type||'-'}</td>
              <td class="td-secondary">${r.receivedBy||'-'}</td>
              <td><button class="btn-secondary btn-sm" onclick='printReceipt(${JSON.stringify(r).replace(/'/g,"&#39;")})'>🖨️</button></td>
            </tr>
          `).join('') : `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-secondary)">ไม่พบข้อมูล</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
};

window.printReceipt = function(r) {
  openModal('🖨️ ใบเสร็จรับเงิน', `
    <div class="receipt-box">
      <div class="receipt-logo">
        <div style="font-size:40px">🏘️</div>
        <h2>หมู่บ้านกัสโต้สุขสวัสดิ์</h2>
        <p>ใบเสร็จรับเงิน</p>
      </div>
      <hr class="receipt-divider">
      <div class="receipt-row"><span class="receipt-num">เลขที่ใบเสร็จ</span><strong>${r.receiptId}</strong></div>
      <div class="receipt-row"><span>บ้านเลขที่</span><strong>${r.houseId}</strong></div>
      <div class="receipt-row"><span>วันที่รับเงิน</span><span>${formatDate(r.receiptDate)}</span></div>
      <div class="receipt-row"><span>งวด</span><span>${r.period||'-'}</span></div>
      <div class="receipt-row"><span>ประเภท</span><span>${r.type||'-'}</span></div>
      <hr class="receipt-divider">
      <div class="receipt-row receipt-total"><span>ยอดรับชำระ</span><strong class="text-success">฿${formatMoney(r.amount)}</strong></div>
      <hr class="receipt-divider">
      <div class="receipt-row" style="font-size:13px;color:#6C6C70"><span>ผู้รับเงิน</span><span>${r.receivedBy||'-'}</span></div>
      <div style="text-align:center;margin-top:20px;font-size:12px;color:#6C6C70">ขอบคุณที่ชำระค่าส่วนกลาง</div>
    </div>
  `, `<button class="btn-secondary" onclick="closeModal()">ปิด</button><button class="btn-primary" onclick="window.print()">🖨️ พิมพ์</button>`);
};
