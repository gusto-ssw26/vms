// ================================================================
// DASHBOARD PAGE
// ================================================================

Pages = window.Pages || {};

Pages.dashboard = async function() {
  const content = document.getElementById('pageContent');
  const isAdmin = App.isAdmin();

  const res = await API.getDashboardStats();
  if (!res.success) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>ไม่สามารถโหลดข้อมูลได้</h3><p>${res.error||''}</p></div>`;
    return;
  }

  const d = res.data;

  if (isAdmin) {
    content.innerHTML = `
      <div class="section-title">👋 ยินดีต้อนรับ, นิติบุคคล</div>

      <div class="stats-grid">
        <div class="stat-card accent">
          <span class="stat-bg">💰</span>
          <span class="stat-icon">💰</span>
          <div class="stat-value">฿${formatMoney(d.totalIncome)}</div>
          <div class="stat-label">รายรับเดือนนี้</div>
        </div>
        <div class="stat-card green">
          <span class="stat-bg">🏠</span>
          <span class="stat-icon">🏠</span>
          <div class="stat-value">${d.totalHouses}</div>
          <div class="stat-label">จำนวนบ้านทั้งหมด</div>
        </div>
        <div class="stat-card orange">
          <span class="stat-bg">📄</span>
          <span class="stat-icon">📄</span>
          <div class="stat-value">${d.pendingInvoices}</div>
          <div class="stat-label">ใบแจ้งหนี้ค้างชำระ</div>
        </div>
        <div class="stat-card red">
          <span class="stat-bg">🏆</span>
          <span class="stat-icon">🏆</span>
          <div class="stat-value">${d.activeProjects}</div>
          <div class="stat-label">โครงการดำเนินการอยู่</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;margin-bottom:24px">

        <!-- Income Chart -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">📈 รายรับย้อนหลัง 12 เดือน</span>
          </div>
          <div class="card-body">
            ${buildChart(d.monthlyIncomeChart||[])}
          </div>
        </div>

        <!-- Pending list -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">⏰ ค้างชำระล่าสุด</span>
            <button class="btn-secondary btn-sm" onclick="App.navigate('invoices')">ดูทั้งหมด</button>
          </div>
          <div class="card-body" style="padding:0">
            ${d.pendingList && d.pendingList.length ? `
              <div class="list-group" style="border:none;border-radius:0">
                ${d.pendingList.slice(0,6).map(p=>`
                  <div class="list-item">
                    <div class="item-icon" style="background:rgba(255,149,0,0.12)">🏠</div>
                    <div class="item-info">
                      <div class="item-title">บ้าน ${p.houseId} · ${p.name}</div>
                      <div class="item-sub">${p.period}</div>
                    </div>
                    <div class="item-right"><span class="badge badge-orange">฿${formatMoney(p.amount)}</span></div>
                  </div>
                `).join('')}
              </div>
            ` : `<div class="empty-state" style="padding:30px"><div class="empty-icon" style="font-size:40px">✅</div><p>ไม่มียอดค้างชำระ</p></div>`}
          </div>
        </div>
      </div>

      <!-- Recent Announcements -->
      <div class="flex-between mb-16">
        <div class="section-title" style="margin-bottom:0">📢 ประกาศล่าสุด</div>
        <button class="btn-secondary btn-sm" onclick="App.navigate('announcements')">ดูทั้งหมด</button>
      </div>
      ${buildAnnouncementsMini(d.recentAnnouncements||[])}
    `;
  } else {
    // Resident dashboard
    const outstanding = parseFloat(d.outstandingBalance || 0);
    const r = d.resident || {};

    content.innerHTML = `
      <!-- Resident welcome card -->
      <div class="card mb-24" style="background:linear-gradient(135deg,#007AFF,#5856D6);border:none">
        <div class="card-body" style="display:flex;align-items:center;gap:16px">
          <div style="font-size:48px">🏠</div>
          <div style="color:white">
            <div style="font-size:12px;opacity:0.8;margin-bottom:4px">บ้านเลขที่ ${r.houseId||'-'}</div>
            <div style="font-size:20px;font-weight:700">${r.ownerName||App.user.name}</div>
            <div style="font-size:13px;opacity:0.8;margin-top:2px">หมู่บ้านกัสโต้สุขสวัสดิ์</div>
          </div>
          <div style="margin-left:auto;text-align:right;color:white">
            <div style="font-size:12px;opacity:0.8">ยอดค้างชำระ</div>
            <div style="font-size:24px;font-weight:700;color:${outstanding>0?'#FFD60A':'#30D158'}">฿${formatMoney(outstanding)}</div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-bottom:24px">
        <!-- Pending Invoices -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">📄 ใบแจ้งหนี้ค้างชำระ</span>
            <button class="btn-secondary btn-sm" onclick="App.navigate('my-invoices')">ดูทั้งหมด</button>
          </div>
          <div class="card-body" style="padding:0">
            ${d.pendingInvoices && d.pendingInvoices.length ? `
              <div class="list-group" style="border:none;border-radius:0">
                ${d.pendingInvoices.map(inv=>`
                  <div class="list-item">
                    <div class="item-icon" style="background:rgba(255,149,0,0.12)">📄</div>
                    <div class="item-info">
                      <div class="item-title">${inv.invoiceId}</div>
                      <div class="item-sub">ครบกำหนด ${formatDate(inv.dueDate)}</div>
                    </div>
                    <div class="item-right"><span class="badge badge-orange">฿${formatMoney(inv.totalAmount)}</span></div>
                  </div>
                `).join('')}
              </div>
            ` : `<div class="empty-state" style="padding:30px"><div class="empty-icon" style="font-size:40px">✅</div><p>ชำระครบแล้ว!</p></div>`}
          </div>
        </div>

        <!-- Recent Payments -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">💰 ประวัติชำระล่าสุด</span>
            <button class="btn-secondary btn-sm" onclick="App.navigate('my-payments')">ดูทั้งหมด</button>
          </div>
          <div class="card-body" style="padding:0">
            ${d.recentPayments && d.recentPayments.length ? `
              <div class="list-group" style="border:none;border-radius:0">
                ${d.recentPayments.map(p=>`
                  <div class="list-item">
                    <div class="item-icon" style="background:rgba(52,199,89,0.12)">✅</div>
                    <div class="item-info">
                      <div class="item-title">฿${formatMoney(p.amount)}</div>
                      <div class="item-sub">${formatDate(p.paymentDate)} · ${p.period}</div>
                    </div>
                    <span class="badge badge-green">ชำระแล้ว</span>
                  </div>
                `).join('')}
              </div>
            ` : `<div class="empty-state" style="padding:30px"><div class="empty-icon" style="font-size:40px">📭</div><p>ยังไม่มีประวัติ</p></div>`}
          </div>
        </div>
      </div>

      <!-- Announcements -->
      <div class="flex-between mb-16">
        <div class="section-title" style="margin-bottom:0">📢 ประกาศล่าสุด</div>
        <button class="btn-secondary btn-sm" onclick="App.navigate('announcements')">ดูทั้งหมด</button>
      </div>
      ${buildAnnouncementsMini(d.recentAnnouncements||[])}

      <!-- Recent Projects -->
      <div class="flex-between mb-16" style="margin-top:24px">
        <div class="section-title" style="margin-bottom:0">🏆 ผลงานล่าสุด</div>
        <button class="btn-secondary btn-sm" onclick="App.navigate('projects')">ดูทั้งหมด</button>
      </div>
      ${buildProjectsMini(d.recentProjects||[])}
    `;
  }
};

function buildChart(data) {
  if (!data || data.length === 0) return '<div class="empty-state" style="padding:30px"><div class="empty-icon" style="font-size:36px">📊</div><p>ยังไม่มีข้อมูล</p></div>';

  const max = Math.max(...data.map(d => parseFloat(d[1]) || 0), 1);
  return `
    <div class="chart-wrap">
      ${data.map(([month, val]) => {
        const pct = Math.max(((parseFloat(val)||0) / max) * 100, 2);
        const label = month.slice(5); // MM
        return `
          <div class="chart-bar-wrap">
            <div class="chart-bar" style="height:${pct}%" data-value="฿${formatMoney(val)}"></div>
            <div class="chart-label">${label}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function buildAnnouncementsMini(items) {
  if (!items || items.length === 0) return `<div class="empty-state"><div class="empty-icon">📭</div><p>ยังไม่มีประกาศ</p></div>`;
  const catColors = { 'ด่วน':'badge-red','ทั่วไป':'badge-blue','กิจกรรม':'badge-green','ซ่อมบำรุง':'badge-orange' };
  return `
    <div class="list-group">
      ${items.map(a=>`
        <div class="list-item">
          <div class="item-icon" style="background:rgba(0,122,255,0.1);font-size:24px">
            ${a.category==='ด่วน'?'🚨':a.category==='กิจกรรม'?'🎉':a.category==='ซ่อมบำรุง'?'🔧':'📢'}
          </div>
          <div class="item-info">
            <div class="item-title">${a.title} ${a.isPinned==='TRUE'||a.isPinned===true?'📌':''}</div>
            <div class="item-sub">${formatDate(a.createdAt)}</div>
          </div>
          <span class="badge ${catColors[a.category]||'badge-gray'}">${a.category}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function buildProjectsMini(items) {
  if (!items || items.length === 0) return `<div class="empty-state"><div class="empty-icon">🏗️</div><p>ยังไม่มีผลงาน</p></div>`;
  const statusColor = { 'เสร็จสิ้น':'badge-green','กำลังดำเนินการ':'badge-blue','แผนงาน':'badge-gray' };
  return `
    <div class="list-group">
      ${items.map(p=>`
        <div class="list-item">
          <div class="item-icon" style="background:rgba(88,86,214,0.1)">
            ${p.category==='ซ่อมบำรุง'?'🔧':p.category==='ปรับปรุง'?'🏗️':p.category==='กิจกรรม'?'🎉':'🏆'}
          </div>
          <div class="item-info">
            <div class="item-title">${p.title}</div>
            <div class="item-sub">${formatDate(p.startDate)} · งบ ฿${formatMoney(p.budget)}</div>
          </div>
          <span class="badge ${statusColor[p.status]||'badge-gray'}">${p.status}</span>
        </div>
      `).join('')}
    </div>
  `;
}
