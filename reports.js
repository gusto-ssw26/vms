// ================================================================
// MONTHLY REPORTS PAGE
// ================================================================
Pages.reports = async function() {
  const content = document.getElementById('pageContent');
  const res = await API.getMonthlyReports();
  if (!res.success) { content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>${res.error}</h3></div>`; return; }

  const reports = res.data || [];
  const isAdmin = App.isAdmin();

  content.innerHTML = `
    <div class="flex-between mb-16">
      <div class="section-title" style="margin-bottom:0">📊 รายงานผลงานประจำเดือน</div>
      ${isAdmin ? `<button class="btn-primary" onclick="showAddReportModal()">➕ บันทึกรายงาน</button>` : ''}
    </div>

    ${reports.length === 0 ? `
      <div class="empty-state"><div class="empty-icon">📊</div><h3>ยังไม่มีรายงาน</h3>
      ${isAdmin ? `<button class="btn-primary" style="margin-top:16px" onclick="showAddReportModal()">➕ บันทึกรายงานแรก</button>` : ''}</div>
    ` : reports.map(r => buildReportCard(r, isAdmin)).join('')}
  `;
};

function buildReportCard(r, isAdmin) {
  const rate = parseFloat(r.collectionRate)||0;
  const rateColor = rate >= 90 ? 'var(--ios-green)' : rate >= 70 ? 'var(--ios-orange)' : 'var(--ios-red)';

  return `
    <div class="card mb-24">
      <div class="card-header">
        <span class="card-title">📅 ${formatMonth(r.month)}</span>
        ${isAdmin ? `<div style="display:flex;gap:6px">
          <button class="btn-secondary btn-sm" onclick='editReport(${JSON.stringify(r).replace(/'/g,"&#39;")})'>✏️</button>
        </div>` : ''}
      </div>
      <div class="card-body">
        <!-- KPI Row -->
        <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:20px">
          <div class="stat-card green">
            <span class="stat-icon">💰</span>
            <div class="stat-value" style="font-size:22px">฿${formatMoney(r.totalIncome)}</div>
            <div class="stat-label">รายรับรวม</div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">📤</span>
            <div class="stat-value" style="font-size:22px">฿${formatMoney(r.totalExpense)}</div>
            <div class="stat-label">รายจ่ายรวม</div>
          </div>
          <div class="stat-card ${parseFloat(r.netBalance)>=0?'accent':'red'}">
            <span class="stat-icon">${parseFloat(r.netBalance)>=0?'📈':'📉'}</span>
            <div class="stat-value" style="font-size:22px">฿${formatMoney(Math.abs(r.netBalance))}</div>
            <div class="stat-label">${parseFloat(r.netBalance)>=0?'กำไรสุทธิ':'ขาดทุน'}</div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🏠</span>
            <div class="stat-value" style="font-size:22px">${r.paidHouses}/${r.totalHouses}</div>
            <div class="stat-label">หลังที่ชำระแล้ว</div>
          </div>
        </div>

        <!-- Collection Rate -->
        <div class="card" style="margin-bottom:16px">
          <div class="card-body" style="padding:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <span style="font-weight:600">อัตราการเก็บเงิน</span>
              <span style="font-size:20px;font-weight:700;color:${rateColor}">${rate.toFixed(1)}%</span>
            </div>
            <div class="progress-bar" style="height:10px">
              <div class="progress-fill" style="width:${rate}%;background:${rateColor}"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);margin-top:6px">
              <span>ชำระแล้ว ${r.paidHouses} หลัง</span>
              <span>ค้างชำระ ${r.pendingHouses} หลัง</span>
            </div>
          </div>
        </div>

        <!-- Income Breakdown -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px">
          <div style="background:var(--fill);border-radius:var(--radius-md);padding:14px">
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px">ค่าส่วนกลาง</div>
            <div style="font-size:18px;font-weight:700;color:var(--ios-blue)">฿${formatMoney(r.commonFeeIncome)}</div>
          </div>
          <div style="background:var(--fill);border-radius:var(--radius-md);padding:14px">
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px">ค่าจอดรถ</div>
            <div style="font-size:18px;font-weight:700;color:var(--ios-purple)">฿${formatMoney(r.parkingIncome)}</div>
          </div>
          <div style="background:var(--fill);border-radius:var(--radius-md);padding:14px">
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px">รายการอื่นๆ</div>
            <div style="font-size:18px;font-weight:700;color:var(--ios-teal)">฿${formatMoney(r.otherIncome)}</div>
          </div>
        </div>

        ${r.highlight ? `
          <div style="background:rgba(0,122,255,0.08);border-left:4px solid var(--ios-blue);border-radius:0 var(--radius-sm) var(--radius-sm) 0;padding:14px;margin-bottom:12px">
            <div style="font-size:12px;color:var(--ios-blue);font-weight:600;margin-bottom:4px">⭐ ผลงานเด่นประจำเดือน</div>
            <div style="font-size:14px;color:var(--text-primary)">${r.highlight}</div>
          </div>
        ` : ''}
        ${r.note ? `<div style="font-size:13px;color:var(--text-secondary)">📝 ${r.note}</div>` : ''}
      </div>
    </div>
  `;
}

window.showAddReportModal = function(data = null) {
  const isEdit = !!data;
  const d = data || {};
  const thisMonth = new Date().toISOString().slice(0,7);

  openModal(isEdit ? '✏️ แก้ไขรายงาน' : '➕ บันทึกรายงานประจำเดือน', `
    <div class="form-grid">
      <div class="form-group"><label>เดือน *</label><input id="rp_month" type="month" value="${d.month||thisMonth}"></div>
      <div class="form-group"><label>รายรับ - ค่าส่วนกลาง</label><input id="rp_common" type="number" value="${d.commonFeeIncome||0}"></div>
      <div class="form-group"><label>รายรับ - ค่าจอดรถ</label><input id="rp_parking" type="number" value="${d.parkingIncome||0}"></div>
      <div class="form-group"><label>รายรับอื่นๆ</label><input id="rp_other" type="number" value="${d.otherIncome||0}"></div>
      <div class="form-group"><label>รายจ่ายรวม</label><input id="rp_expense" type="number" value="${d.totalExpense||0}"></div>
      <div class="form-group"><label>จำนวนบ้านทั้งหมด</label><input id="rp_total" type="number" value="${d.totalHouses||0}"></div>
      <div class="form-group"><label>บ้านที่ชำระแล้ว</label><input id="rp_paid" type="number" value="${d.paidHouses||0}"></div>
      <div class="form-group"><label>บ้านที่ยังค้างชำระ</label><input id="rp_pending" type="number" value="${d.pendingHouses||0}"></div>
      <div class="form-group" style="grid-column:1/-1"><label>ผลงานเด่นประจำเดือน</label>
        <textarea id="rp_highlight" rows="3" placeholder="สรุปผลงานสำคัญ...">${d.highlight||''}</textarea>
      </div>
      <div class="form-group" style="grid-column:1/-1"><label>หมายเหตุ</label>
        <textarea id="rp_note" rows="2">${d.note||''}</textarea>
      </div>
    </div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">ยกเลิก</button>
    <button class="btn-primary" onclick="saveReport(${isEdit ? `'${d.id}'` : 'null'})">💾 บันทึกรายงาน</button>
  `);
};

window.editReport = function(data) { showAddReportModal(data); };

window.saveReport = async function(id) {
  const common  = parseFloat(document.getElementById('rp_common').value)||0;
  const parking = parseFloat(document.getElementById('rp_parking').value)||0;
  const other   = parseFloat(document.getElementById('rp_other').value)||0;
  const expense = parseFloat(document.getElementById('rp_expense').value)||0;
  const total   = common + parking + other;
  const paid    = parseInt(document.getElementById('rp_paid').value)||0;
  const totalH  = parseInt(document.getElementById('rp_total').value)||1;

  const data = {
    id: id || undefined,
    month: document.getElementById('rp_month').value,
    totalIncome: total, commonFeeIncome: common,
    parkingIncome: parking, otherIncome: other,
    totalExpense: expense, netBalance: total - expense,
    totalHouses: totalH,
    paidHouses: paid,
    pendingHouses: parseInt(document.getElementById('rp_pending').value)||0,
    collectionRate: ((paid/totalH)*100).toFixed(1),
    highlight: document.getElementById('rp_highlight').value.trim(),
    note: document.getElementById('rp_note').value.trim(),
  };
  if (!data.month) { showToast('กรุณาเลือกเดือน','error'); return; }
  showLoading();
  const res = id ? await API.updateMonthlyReport(data) : await API.addMonthlyReport(data);
  hideLoading();
  if (res.success) { closeModal(); showToast(res.message,'success'); Pages.reports(); }
  else showToast(res.error,'error');
};
