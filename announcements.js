// ================================================================
// ANNOUNCEMENTS PAGE
// ================================================================
Pages.announcements = async function() {
  const content = document.getElementById('pageContent');
  const res = await API.getAnnouncements();
  if (!res.success) { content.innerHTML = errorHtml(res.error); return; }

  const items = res.data || [];
  const catColors = { 'ด่วน':'badge-red','ทั่วไป':'badge-blue','กิจกรรม':'badge-green','ซ่อมบำรุง':'badge-orange' };
  const catIcons  = { 'ด่วน':'🚨','ทั่วไป':'📢','กิจกรรม':'🎉','ซ่อมบำรุง':'🔧' };

  content.innerHTML = `
    <div class="flex-between mb-16">
      <div class="section-title" style="margin-bottom:0">📢 ประกาศข่าวสาร (${items.length} รายการ)</div>
      ${App.isAdmin() ? `<button class="btn-primary" onclick="showAddAnnouncementModal()">➕ โพสต์ประกาศ</button>` : ''}
    </div>
    <div class="tabs">
      <button class="tab active" onclick="filterAnn('all',this)">ทั้งหมด</button>
      <button class="tab" onclick="filterAnn('ด่วน',this)">🚨 ด่วน</button>
      <button class="tab" onclick="filterAnn('ทั่วไป',this)">📢 ทั่วไป</button>
      <button class="tab" onclick="filterAnn('กิจกรรม',this)">🎉 กิจกรรม</button>
      <button class="tab" onclick="filterAnn('ซ่อมบำรุง',this)">🔧 ซ่อมบำรุง</button>
    </div>
    <div id="annGrid" class="ann-grid">
      ${items.length ? items.map(a => buildAnnCard(a, catColors, catIcons)).join('') :
        `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📭</div><h3>ยังไม่มีประกาศ</h3></div>`}
    </div>
  `;

  window._allAnn = items;
  window.filterAnn = function(cat, btn) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const filtered = cat === 'all' ? items : items.filter(a => a.category === cat);
    document.getElementById('annGrid').innerHTML = filtered.length
      ? filtered.map(a => buildAnnCard(a, catColors, catIcons)).join('')
      : `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📭</div><h3>ไม่พบประกาศ</h3></div>`;
  };
};

function buildAnnCard(a, catColors, catIcons) {
  const icon = catIcons[a.category]||'📢';
  return `
    <div class="ann-card" onclick='viewAnnouncement(${JSON.stringify(a).replace(/'/g,"&#39;")})'>
      <div class="ann-card-img" style="${a.imageUrl?`background:url('${a.imageUrl}') center/cover`:'background:var(--fill)'}">
        ${!a.imageUrl ? `<span style="font-size:48px">${icon}</span>` : ''}
      </div>
      <div class="ann-card-body">
        <span class="ann-cat badge ${catColors[a.category]||'badge-gray'}">${icon} ${a.category}</span>
        ${a.isPinned==='TRUE'||a.isPinned===true ? '<span style="font-size:12px">📌 ปักหมุด</span>' : ''}
        <div class="ann-title">${a.title}</div>
        <div class="ann-preview">${a.content}</div>
        <div class="ann-date">${formatDate(a.createdAt)}</div>
        ${App.isAdmin() ? `<div style="display:flex;gap:6px;margin-top:10px" onclick="event.stopPropagation()">
          <button class="btn-secondary btn-sm" onclick='editAnnouncement(${JSON.stringify(a).replace(/'/g,"&#39;")})'>✏️ แก้ไข</button>
          <button class="btn-danger btn-sm" onclick="deleteAnnouncement('${a.id}')">🗑 ลบ</button>
        </div>` : ''}
      </div>
    </div>
  `;
}

window.viewAnnouncement = function(a) {
  const catColors = { 'ด่วน':'badge-red','ทั่วไป':'badge-blue','กิจกรรม':'badge-green','ซ่อมบำรุง':'badge-orange' };
  openModal(`📢 ${a.title}`, `
    ${a.imageUrl ? `<img src="${a.imageUrl}" style="width:100%;border-radius:var(--radius-md);margin-bottom:16px;object-fit:cover;max-height:240px">` : ''}
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span class="badge ${catColors[a.category]||'badge-gray'}">${a.category}</span>
      <span class="td-secondary">${formatDate(a.createdAt)}</span>
    </div>
    <p style="line-height:1.8;color:var(--text-primary);font-size:15px">${(a.content||'').replace(/\n/g,'<br>')}</p>
  `);
};

window.showAddAnnouncementModal = function(data = null) {
  const isEdit = !!data;
  const d = data || {};
  openModal(isEdit ? '✏️ แก้ไขประกาศ' : '➕ โพสต์ประกาศใหม่', `
    <div class="form-grid">
      <div class="form-group" style="grid-column:1/-1"><label>หัวข้อ *</label><input id="a_title" value="${d.title||''}" placeholder="หัวข้อประกาศ"></div>
      <div class="form-group"><label>หมวดหมู่</label>
        <select id="a_category">${['ทั่วไป','ด่วน','กิจกรรม','ซ่อมบำรุง'].map(c=>`<option ${d.category===c?'selected':''}>${c}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>ปักหมุด</label>
        <select id="a_pinned"><option value="false" ${!d.isPinned||d.isPinned==='FALSE'?'selected':''}>ไม่ปักหมุด</option><option value="true" ${d.isPinned==='TRUE'||d.isPinned===true?'selected':''}>ปักหมุด</option></select>
      </div>
      <div class="form-group" style="grid-column:1/-1"><label>URL รูปภาพ</label><input id="a_image" value="${d.imageUrl||''}" placeholder="https://..."></div>
      <div class="form-group" style="grid-column:1/-1"><label>เนื้อหา *</label>
        <textarea id="a_content" rows="6" placeholder="เนื้อหาประกาศ...">${d.content||''}</textarea>
      </div>
    </div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">ยกเลิก</button>
    <button class="btn-primary" onclick="saveAnnouncement(${isEdit ? `'${d.id}'` : 'null'})">📢 ${isEdit?'บันทึก':'โพสต์ประกาศ'}</button>
  `);
};

window.editAnnouncement = function(data) { showAddAnnouncementModal(data); };

window.saveAnnouncement = async function(id) {
  const data = {
    id: id || undefined,
    title: document.getElementById('a_title').value.trim(),
    content: document.getElementById('a_content').value.trim(),
    category: document.getElementById('a_category').value,
    imageUrl: document.getElementById('a_image').value.trim(),
    isPinned: document.getElementById('a_pinned').value === 'true',
    status: 'active',
  };
  if (!data.title || !data.content) { showToast('กรุณากรอกหัวข้อและเนื้อหา','error'); return; }
  showLoading();
  const res = id ? await API.updateAnnouncement(data) : await API.addAnnouncement(data);
  hideLoading();
  if (res.success) { closeModal(); showToast(res.message,'success'); Pages.announcements(); }
  else showToast(res.error,'error');
};

window.deleteAnnouncement = async function(id) {
  if (!confirm('ยืนยันการลบประกาศนี้?')) return;
  showLoading();
  const res = await API.deleteAnnouncement(id);
  hideLoading();
  if (res.success) { showToast(res.message,'success'); Pages.announcements(); }
  else showToast(res.error,'error');
};

// ================================================================
// PROJECTS PAGE
// ================================================================
Pages.projects = async function() {
  const content = document.getElementById('pageContent');
  const res = await API.getProjects();
  if (!res.success) { content.innerHTML = errorHtml(res.error); return; }

  const projects = res.data || [];
  const statusColor = { 'เสร็จสิ้น':'badge-green','กำลังดำเนินการ':'badge-blue','แผนงาน':'badge-gray' };
  const catIcon = { 'ซ่อมบำรุง':'🔧','ปรับปรุง':'🏗️','กิจกรรม':'🎉','สาธารณูปโภค':'💡','อื่นๆ':'📋' };

  // Summary stats
  const total = projects.length;
  const done = projects.filter(p => p.status === 'เสร็จสิ้น').length;
  const inProgress = projects.filter(p => p.status === 'กำลังดำเนินการ').length;
  const totalBudget = projects.reduce((s, p) => s + (parseFloat(p.budget)||0), 0);

  content.innerHTML = `
    <div class="flex-between mb-16">
      <div class="section-title" style="margin-bottom:0">🏆 ผลงานหมู่บ้านกัสโต้สุขสวัสดิ์</div>
      ${App.isAdmin() ? `<button class="btn-primary" onclick="showAddProjectModal()">➕ บันทึกผลงาน</button>` : ''}
    </div>

    <!-- Summary Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:24px">
      <div class="stat-card">
        <span class="stat-icon">🏆</span>
        <div class="stat-value">${total}</div>
        <div class="stat-label">โครงการทั้งหมด</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">✅</span>
        <div class="stat-value">${done}</div>
        <div class="stat-label">เสร็จสิ้นแล้ว</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">⚙️</span>
        <div class="stat-value">${inProgress}</div>
        <div class="stat-label">กำลังดำเนินการ</div>
      </div>
      <div class="stat-card accent">
        <span class="stat-bg">💰</span>
        <span class="stat-icon">💰</span>
        <div class="stat-value" style="font-size:22px">฿${formatMoney(totalBudget)}</div>
        <div class="stat-label">งบประมาณรวม</div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab active" onclick="filterProjects('all',this)">ทั้งหมด</button>
      <button class="tab" onclick="filterProjects('กำลังดำเนินการ',this)">⚙️ กำลังดำเนินการ</button>
      <button class="tab" onclick="filterProjects('เสร็จสิ้น',this)">✅ เสร็จสิ้น</button>
      <button class="tab" onclick="filterProjects('แผนงาน',this)">📋 แผนงาน</button>
    </div>

    <div id="projGrid" class="proj-grid">
      ${projects.length ? projects.map(p => buildProjCard(p, statusColor, catIcon)).join('') :
        `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🏗️</div><h3>ยังไม่มีผลงาน</h3><p>เพิ่มผลงานและโครงการของหมู่บ้านได้เลย</p></div>`}
    </div>
  `;

  window._allProjects = projects;
  window.filterProjects = function(status, btn) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const filtered = status === 'all' ? projects : projects.filter(p => p.status === status);
    document.getElementById('projGrid').innerHTML = filtered.length
      ? filtered.map(p => buildProjCard(p, statusColor, catIcon)).join('')
      : `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📭</div><h3>ไม่พบโครงการ</h3></div>`;
  };
};

function buildProjCard(p, statusColor, catIcon) {
  const progress = parseInt(p.progress)||0;
  return `
    <div class="proj-card">
      <div class="proj-images">
        <div class="proj-img-wrap">
          ${p.beforeImageUrl
            ? `<img src="${p.beforeImageUrl}" style="width:100%;height:140px;object-fit:cover">`
            : `<div class="proj-img">${catIcon[p.category]||'🏗️'}</div>`}
          <span class="proj-img-label">ก่อน</span>
        </div>
        <div class="proj-img-wrap">
          ${p.afterImageUrl
            ? `<img src="${p.afterImageUrl}" style="width:100%;height:140px;object-fit:cover">`
            : `<div class="proj-img" style="background:var(--fill-secondary)">📸</div>`}
          <span class="proj-img-label">หลัง</span>
        </div>
      </div>
      <div class="proj-body">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <span class="badge badge-purple" style="font-size:11px">${catIcon[p.category]||'📋'} ${p.category||'อื่นๆ'}</span>
          <span class="badge ${statusColor[p.status]||'badge-gray'}" style="font-size:11px">${p.status}</span>
        </div>
        <div class="proj-title">${p.title}</div>
        <div class="proj-desc">${p.description||''}</div>
        ${p.status === 'กำลังดำเนินการ' ? `
          <div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);margin-bottom:4px">
              <span>ความคืบหน้า</span><span>${progress}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
          </div>
        ` : ''}
        <div class="proj-meta">
          <span>📅 ${formatDate(p.startDate)}</span>
          <span>💰 ฿${formatMoney(p.budget)}</span>
        </div>
        ${App.isAdmin() ? `<div style="display:flex;gap:6px;margin-top:12px">
          <button class="btn-secondary btn-sm" style="flex:1" onclick='editProject(${JSON.stringify(p).replace(/'/g,"&#39;")})'>✏️ แก้ไข</button>
          <button class="btn-danger btn-sm" onclick="deleteProject('${p.id}')">🗑</button>
        </div>` : ''}
      </div>
    </div>
  `;
}

window.showAddProjectModal = function(data = null) {
  const isEdit = !!data;
  const d = data || {};
  const today = new Date().toISOString().split('T')[0];
  openModal(isEdit ? '✏️ แก้ไขผลงาน' : '➕ บันทึกผลงานใหม่', `
    <div class="form-grid">
      <div class="form-group" style="grid-column:1/-1"><label>ชื่อโครงการ/ผลงาน *</label><input id="pr_title" value="${d.title||''}" placeholder="เช่น ปรับปรุงสระว่ายน้ำ"></div>
      <div class="form-group"><label>หมวดหมู่</label>
        <select id="pr_category">${['ซ่อมบำรุง','ปรับปรุง','กิจกรรม','สาธารณูปโภค','อื่นๆ'].map(c=>`<option ${d.category===c?'selected':''}>${c}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>สถานะ</label>
        <select id="pr_status">${['กำลังดำเนินการ','เสร็จสิ้น','แผนงาน'].map(s=>`<option ${d.status===s?'selected':''}>${s}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>วันที่เริ่ม</label><input id="pr_start" type="date" value="${d.startDate||today}"></div>
      <div class="form-group"><label>วันที่เสร็จสิ้น</label><input id="pr_end" type="date" value="${d.endDate||''}"></div>
      <div class="form-group"><label>งบประมาณ (บาท)</label><input id="pr_budget" type="number" value="${d.budget||0}"></div>
      <div class="form-group"><label>ค่าใช้จ่ายจริง (บาท)</label><input id="pr_actual" type="number" value="${d.actualCost||0}"></div>
      <div class="form-group"><label>ความคืบหน้า (%)</label><input id="pr_progress" type="number" min="0" max="100" value="${d.progress||0}"></div>
      <div class="form-group"><label>ผู้รับเหมา/ผู้ดำเนินการ</label><input id="pr_contractor" value="${d.contractor||''}"></div>
      <div class="form-group" style="grid-column:1/-1"><label>URL รูปภาพก่อนดำเนินการ</label><input id="pr_before" value="${d.beforeImageUrl||''}" placeholder="https://..."></div>
      <div class="form-group" style="grid-column:1/-1"><label>URL รูปภาพหลังดำเนินการ</label><input id="pr_after" value="${d.afterImageUrl||''}" placeholder="https://..."></div>
      <div class="form-group" style="grid-column:1/-1"><label>รายละเอียด *</label>
        <textarea id="pr_desc" rows="4" placeholder="อธิบายรายละเอียดโครงการ...">${d.description||''}</textarea>
      </div>
      <div class="form-group" style="grid-column:1/-1"><label>หมายเหตุ</label><input id="pr_note" value="${d.note||''}"></div>
    </div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">ยกเลิก</button>
    <button class="btn-primary" onclick="saveProject(${isEdit ? `'${d.id}'` : 'null'})">💾 ${isEdit?'บันทึก':'เพิ่มผลงาน'}</button>
  `);
};

window.editProject = function(data) { showAddProjectModal(data); };

window.saveProject = async function(id) {
  const data = {
    id: id || undefined,
    title: document.getElementById('pr_title').value.trim(),
    description: document.getElementById('pr_desc').value.trim(),
    category: document.getElementById('pr_category').value,
    startDate: document.getElementById('pr_start').value,
    endDate: document.getElementById('pr_end').value,
    budget: document.getElementById('pr_budget').value,
    actualCost: document.getElementById('pr_actual').value,
    status: document.getElementById('pr_status').value,
    beforeImageUrl: document.getElementById('pr_before').value.trim(),
    afterImageUrl: document.getElementById('pr_after').value.trim(),
    progress: document.getElementById('pr_progress').value,
    contractor: document.getElementById('pr_contractor').value.trim(),
    note: document.getElementById('pr_note').value.trim(),
  };
  if (!data.title) { showToast('กรุณากรอกชื่อโครงการ','error'); return; }
  showLoading();
  const res = id ? await API.updateProject(data) : await API.addProject(data);
  hideLoading();
  if (res.success) { closeModal(); showToast(res.message,'success'); Pages.projects(); }
  else showToast(res.error,'error');
};

window.deleteProject = async function(id) {
  if (!confirm('ยืนยันการลบผลงานนี้?')) return;
  showLoading();
  const res = await API.deleteProject(id);
  hideLoading();
  if (res.success) { showToast(res.message,'success'); Pages.projects(); }
  else showToast(res.error,'error');
};

function errorHtml(msg) {
  return `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>เกิดข้อผิดพลาด</h3><p>${msg||''}</p></div>`;
}
