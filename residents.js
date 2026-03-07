// ================================================================
// RESIDENTS PAGE
// ================================================================
Pages.residents = async function() {
  const content = document.getElementById('pageContent');
  const res = await API.getResidents();
  if (!res.success) { content.innerHTML = errorHtml(res.error); return; }

  const residents = res.data || [];
  let filtered = [...residents];

  const statusColor = { 'อยู่อาศัย':'badge-green','ปล่อยเช่า':'badge-blue','ว่าง':'badge-gray' };

  function render(list) {
    content.innerHTML = `
      <div class="flex-between mb-16">
        <div class="section-title" style="margin-bottom:0">👥 ข้อมูลลูกบ้าน (${list.length} หลัง)</div>
        <button class="btn-primary" onclick="showAddResidentModal()">➕ เพิ่มลูกบ้าน</button>
      </div>
      <div class="search-bar">
        <div class="search-input-wrap">
          <input type="text" placeholder="ค้นหาชื่อ, บ้านเลขที่, เบอร์โทร..." id="residentSearch" oninput="filterResidents(this.value)">
        </div>
        <select class="filter-select" id="residentStatus" onchange="filterResidents()">
          <option value="">สถานะทั้งหมด</option>
          <option value="อยู่อาศัย">อยู่อาศัย</option>
          <option value="ปล่อยเช่า">ปล่อยเช่า</option>
          <option value="ว่าง">ว่าง</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>บ้านเลขที่</th>
              <th>เจ้าของ</th>
              <th>เบอร์โทร</th>
              <th>สถานะ</th>
              <th>พื้นที่</th>
              <th>ค่าส่วนกลาง/เดือน</th>
              <th>ยอดค้างชำระ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody id="residentsTbody">
            ${list.length ? list.map(r => {
              const fee = r.feeType === 'per_sqm'
                ? (parseFloat(r.area)||0) * (parseFloat(r.feeRate)||0)
                : parseFloat(r.feeRate)||0;
              const outstanding = parseFloat(r.outstandingBalance)||0;
              return `
                <tr>
                  <td><strong>${r.houseId}</strong></td>
                  <td>
                    <div>${r.ownerName}</div>
                    <div class="td-secondary">${r.email||''}</div>
                  </td>
                  <td class="td-secondary">${r.phone||'-'}</td>
                  <td><span class="badge ${statusColor[r.status]||'badge-gray'}">${r.status||'-'}</span></td>
                  <td class="td-secondary">${r.area||0} ตร.ม.</td>
                  <td>฿${formatMoney(fee)}</td>
                  <td class="${outstanding > 0 ? 'text-danger fw-700' : 'text-success'}">฿${formatMoney(outstanding)}</td>
                  <td>
                    <div style="display:flex;gap:6px">
                      <button class="btn-secondary btn-sm" onclick='editResident(${JSON.stringify(r).replace(/'/g,"&#39;")})'>✏️</button>
                      <button class="btn-danger btn-sm" onclick="deleteResident('${r.houseId}','${r.ownerName}')">🗑</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-secondary)">ไม่พบข้อมูล</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }

  window.filterResidents = function(val) {
    const q = (val || document.getElementById('residentSearch')?.value || '').toLowerCase();
    const st = document.getElementById('residentStatus')?.value || '';
    filtered = residents.filter(r =>
      (!q || r.houseId?.toString().includes(q) || r.ownerName?.toLowerCase().includes(q) || r.phone?.includes(q)) &&
      (!st || r.status === st)
    );
    render(filtered);
  };

  render(residents);
};

function showAddResidentModal(data = null) {
  const isEdit = !!data;
  const d = data || {};
  openModal(isEdit ? '✏️ แก้ไขข้อมูลลูกบ้าน' : '➕ เพิ่มลูกบ้านใหม่', `
    <div class="form-grid">
      <div class="form-group">
        <label>บ้านเลขที่ *</label>
        <input id="f_houseId" value="${d.houseId||''}" placeholder="เช่น 1/1" ${isEdit?'readonly':''}>
      </div>
      <div class="form-group">
        <label>ชื่อเจ้าของ *</label>
        <input id="f_ownerName" value="${d.ownerName||''}" placeholder="ชื่อ-นามสกุล">
      </div>
      <div class="form-group">
        <label>เบอร์โทรศัพท์</label>
        <input id="f_phone" value="${d.phone||''}" placeholder="08X-XXX-XXXX">
      </div>
      <div class="form-group">
        <label>อีเมล</label>
        <input id="f_email" value="${d.email||''}" placeholder="email@example.com">
      </div>
      <div class="form-group">
        <label>LINE ID</label>
        <input id="f_lineId" value="${d.lineId||''}" placeholder="@lineid">
      </div>
      <div class="form-group">
        <label>จำนวนผู้อาศัย</label>
        <input id="f_residents" type="number" value="${d.residents||1}" min="0">
      </div>
      <div class="form-group">
        <label>วันที่เข้าอยู่</label>
        <input id="f_moveInDate" type="date" value="${d.moveInDate||''}">
      </div>
      <div class="form-group">
        <label>สถานะบ้าน</label>
        <select id="f_status">
          ${['อยู่อาศัย','ปล่อยเช่า','ว่าง'].map(s=>`<option ${d.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>พื้นที่บ้าน (ตร.ม.)</label>
        <input id="f_area" type="number" value="${d.area||0}">
      </div>
      <div class="form-group">
        <label>ประเภทค่าส่วนกลาง</label>
        <select id="f_feeType">
          <option value="per_sqm" ${d.feeType==='per_sqm'?'selected':''}>คิดตาม ตร.ม.</option>
          <option value="fixed" ${d.feeType==='fixed'?'selected':''}>เหมาจ่ายรายเดือน</option>
        </select>
      </div>
      <div class="form-group">
        <label>อัตราค่าส่วนกลาง (บาท)</label>
        <input id="f_feeRate" type="number" value="${d.feeRate||0}">
      </div>
      <div class="form-group">
        <label>ค่าจอดรถรายเดือน</label>
        <input id="f_parkingFee" type="number" value="${d.parkingFee||0}">
      </div>
      <div class="form-group">
        <label>ที่อยู่ในหมู่บ้าน</label>
        <input id="f_address" value="${d.address||''}" placeholder="บ้านเลขที่ X หมู่บ้านกัสโต้สุขสวัสดิ์">
      </div>
      <div class="form-group">
        <label>รหัสผ่าน (สำหรับ Login)</label>
        <input id="f_password" value="${d.password||''}" placeholder="ตั้งรหัสผ่านให้ลูกบ้าน">
      </div>
      ${isEdit ? `<div class="form-group">
        <label>ยอดค้างชำระสะสม</label>
        <input id="f_outstandingBalance" type="number" value="${d.outstandingBalance||0}">
      </div>` : ''}
    </div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">ยกเลิก</button>
    <button class="btn-primary" onclick="saveResident(${isEdit})">💾 ${isEdit?'บันทึก':'เพิ่มลูกบ้าน'}</button>
  `);
}

window.editResident = function(data) { showAddResidentModal(data); };

window.saveResident = async function(isEdit) {
  const data = {
    houseId: document.getElementById('f_houseId').value.trim(),
    ownerName: document.getElementById('f_ownerName').value.trim(),
    phone: document.getElementById('f_phone').value.trim(),
    email: document.getElementById('f_email').value.trim(),
    lineId: document.getElementById('f_lineId').value.trim(),
    residents: document.getElementById('f_residents').value,
    moveInDate: document.getElementById('f_moveInDate').value,
    status: document.getElementById('f_status').value,
    area: document.getElementById('f_area').value,
    feeRate: document.getElementById('f_feeRate').value,
    feeType: document.getElementById('f_feeType').value,
    parkingFee: document.getElementById('f_parkingFee').value,
    address: document.getElementById('f_address').value.trim(),
    password: document.getElementById('f_password').value.trim(),
    outstandingBalance: isEdit ? document.getElementById('f_outstandingBalance')?.value || 0 : 0,
  };
  if (!data.houseId || !data.ownerName) { showToast('กรุณากรอกบ้านเลขที่และชื่อเจ้าของ', 'error'); return; }

  showLoading();
  const res = isEdit ? await API.updateResident(data) : await API.addResident(data);
  hideLoading();

  if (res.success) {
    closeModal();
    showToast(res.message, 'success');
    Pages.residents();
  } else {
    showToast(res.error || 'เกิดข้อผิดพลาด', 'error');
  }
};

window.deleteResident = async function(houseId, name) {
  if (!confirm(`ยืนยันการลบบ้านเลขที่ ${houseId} (${name})?`)) return;
  showLoading();
  const res = await API.deleteResident(houseId);
  hideLoading();
  if (res.success) { showToast(res.message, 'success'); Pages.residents(); }
  else showToast(res.error, 'error');
};

function errorHtml(msg) {
  return `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>เกิดข้อผิดพลาด</h3><p>${msg||''}</p></div>`;
}
