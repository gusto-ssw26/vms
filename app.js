// ================================================================
// APP CONTROLLER
// ================================================================

const App = {
  user: null,
  currentPage: 'dashboard',

  // Navigation config
  adminNav: [
    { section: 'หลัก', items: [
      { id: 'dashboard',     icon: '🏠', label: 'หน้าหลัก' },
      { id: 'announcements', icon: '📢', label: 'ประกาศข่าวสาร' },
      { id: 'projects',      icon: '🏆', label: 'ผลงานหมู่บ้าน' },
    ]},
    { section: 'จัดการลูกบ้าน', items: [
      { id: 'residents',  icon: '👥', label: 'ข้อมูลลูกบ้าน' },
      { id: 'vehicles',   icon: '🚗', label: 'ข้อมูลรถยนต์' },
    ]},
    { section: 'การเงิน', items: [
      { id: 'invoices',   icon: '📄', label: 'ใบแจ้งหนี้' },
      { id: 'payments',   icon: '💰', label: 'รับชำระเงิน' },
      { id: 'receipts',   icon: '🧾', label: 'ใบเสร็จรับเงิน' },
    ]},
    { section: 'รายงาน', items: [
      { id: 'reports',    icon: '📊', label: 'รายงานประจำเดือน' },
    ]},
  ],

  residentNav: [
    { section: 'ของฉัน', items: [
      { id: 'dashboard',     icon: '🏠', label: 'หน้าหลัก' },
      { id: 'my-invoices',   icon: '📄', label: 'ใบแจ้งหนี้ของฉัน' },
      { id: 'my-payments',   icon: '💰', label: 'ประวัติชำระเงิน' },
      { id: 'my-receipts',   icon: '🧾', label: 'ใบเสร็จของฉัน' },
      { id: 'my-vehicles',   icon: '🚗', label: 'รถของฉัน' },
    ]},
    { section: 'ข้อมูลหมู่บ้าน', items: [
      { id: 'announcements', icon: '📢', label: 'ประกาศข่าวสาร' },
      { id: 'projects',      icon: '🏆', label: 'ผลงานหมู่บ้าน' },
      { id: 'reports',       icon: '📊', label: 'รายงานประจำเดือน' },
    ]},
  ],

  bottomAdminTabs: [
    { id: 'dashboard',  icon: '🏠', label: 'หลัก' },
    { id: 'residents',  icon: '👥', label: 'ลูกบ้าน' },
    { id: 'invoices',   icon: '📄', label: 'แจ้งหนี้' },
    { id: 'payments',   icon: '💰', label: 'รับเงิน' },
    { id: 'projects',   icon: '🏆', label: 'ผลงาน' },
  ],

  bottomResidentTabs: [
    { id: 'dashboard',    icon: '🏠', label: 'หลัก' },
    { id: 'my-invoices',  icon: '📄', label: 'บิล' },
    { id: 'my-payments',  icon: '💰', label: 'ชำระ' },
    { id: 'announcements',icon: '📢', label: 'ข่าว' },
    { id: 'projects',     icon: '🏆', label: 'ผลงาน' },
  ],

  // ── Init ──────────────────────────────────────
  init() {
    // Check saved session
    const savedToken = localStorage.getItem('gasto_token');
    const savedUser  = localStorage.getItem('gasto_user');

    if (savedToken && savedUser) {
      this.user = JSON.parse(savedUser);
      API.token = savedToken;
      this.showApp();
    } else {
      setTimeout(() => this.showLogin(), 2000);
    }
  },

  showLogin() {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
  },

  showApp() {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    this.buildNav();
    this.navigate('dashboard');
  },

  // ── Auth ──────────────────────────────────────
  async login(username, password) {
    showLoading();
    const res = await API.login(username, password);
    hideLoading();

    if (res.success) {
      this.user = { role: res.role, name: res.name, houseId: res.houseId };
      API.token = res.token;
      localStorage.setItem('gasto_token', res.token);
      localStorage.setItem('gasto_user', JSON.stringify(this.user));
      this.showApp();
      showToast(`ยินดีต้อนรับ ${res.name}`, 'success');
    } else {
      document.getElementById('loginError').classList.remove('hidden');
      document.getElementById('loginError').textContent = res.error || 'เข้าสู่ระบบไม่สำเร็จ';
    }
  },

  logout() {
    localStorage.removeItem('gasto_token');
    localStorage.removeItem('gasto_user');
    API.token = null;
    this.user = null;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    showToast('ออกจากระบบแล้ว');
  },

  // ── Navigation ──────────────────────────────────
  buildNav() {
    const isAdmin = this.user.role === 'admin';
    const navConfig = isAdmin ? this.adminNav : this.residentNav;
    const bottomConfig = isAdmin ? this.bottomAdminTabs : this.bottomResidentTabs;

    // User info
    document.getElementById('sidebarUserName').textContent = this.user.name;
    document.getElementById('topbarUserName').textContent = this.user.name;
    document.getElementById('userAvatar').textContent = this.user.name.charAt(0).toUpperCase();

    // Sidebar nav
    const sidebarNav = document.getElementById('sidebarNav');
    sidebarNav.innerHTML = navConfig.map(section => `
      <div class="nav-section">
        <div class="nav-section-title">${section.section}</div>
        ${section.items.map(item => `
          <div class="nav-item" id="nav-${item.id}" onclick="App.navigate('${item.id}')">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
          </div>
        `).join('')}
      </div>
    `).join('');

    // Bottom nav
    const bottomNav = document.getElementById('bottomNav');
    bottomNav.innerHTML = bottomConfig.map(item => `
      <div class="bottom-nav-item" id="bnav-${item.id}" onclick="App.navigate('${item.id}')">
        <span class="bnav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </div>
    `).join('');
  },

  navigate(pageId) {
    this.currentPage = pageId;

    // Update active state
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById(`nav-${pageId}`);
    const bnavEl = document.getElementById(`bnav-${pageId}`);
    if (navEl) navEl.classList.add('active');
    if (bnavEl) bnavEl.classList.add('active');

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.remove();

    // Render page
    const titles = {
      'dashboard':     'หน้าหลัก',
      'residents':     'ข้อมูลลูกบ้าน',
      'vehicles':      'ข้อมูลรถยนต์',
      'invoices':      'ใบแจ้งหนี้',
      'payments':      'รับชำระเงิน',
      'receipts':      'ใบเสร็จรับเงิน',
      'announcements': 'ประกาศข่าวสาร',
      'projects':      'ผลงานหมู่บ้าน',
      'reports':       'รายงานประจำเดือน',
      'my-invoices':   'ใบแจ้งหนี้ของฉัน',
      'my-payments':   'ประวัติชำระเงิน',
      'my-receipts':   'ใบเสร็จของฉัน',
      'my-vehicles':   'รถของฉัน',
    };
    document.getElementById('pageTitle').textContent = titles[pageId] || pageId;
    this.renderPage(pageId);
  },

  renderPage(pageId) {
    const content = document.getElementById('pageContent');
    content.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;

    switch(pageId) {
      case 'dashboard':     Pages.dashboard(); break;
      case 'residents':     Pages.residents(); break;
      case 'vehicles':      Pages.vehicles(); break;
      case 'invoices':      Pages.invoices(); break;
      case 'my-invoices':   Pages.invoices(true); break;
      case 'payments':      Pages.payments(); break;
      case 'my-payments':   Pages.payments(true); break;
      case 'receipts':      Pages.receipts(); break;
      case 'my-receipts':   Pages.receipts(true); break;
      case 'announcements': Pages.announcements(); break;
      case 'projects':      Pages.projects(); break;
      case 'reports':       Pages.reports(); break;
      case 'my-vehicles':   Pages.vehicles(true); break;
      default: content.innerHTML = '<div class="empty-state"><div class="empty-icon">🚧</div><h3>กำลังพัฒนา</h3></div>';
    }
  },

  isAdmin() { return this.user && this.user.role === 'admin'; },
};

// ── Globals ──────────────────────────────────────

function doLogin() {
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value;
  if (!u || !p) { showToast('กรุณากรอกข้อมูลให้ครบ', 'error'); return; }
  App.login(u, p);
}

function doLogout() { App.logout(); }

function togglePassword() {
  const inp = document.getElementById('loginPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    sidebar.classList.remove('open');
    document.querySelector('.sidebar-overlay')?.remove();
  } else {
    sidebar.classList.add('open');
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = () => {
      sidebar.classList.remove('open');
      overlay.remove();
    };
    document.body.appendChild(overlay);
  }
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙';
  document.getElementById('themeLabel').textContent = isDark ? 'Light Mode' : 'Dark Mode';
  document.getElementById('themeIconTop').textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('gasto_theme', isDark ? 'dark' : 'light');
}

// ── Modal Helpers ─────────────────────────────────

function openModal(title, content, footer = '') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalContent').innerHTML = content;
  document.getElementById('modalFooter').innerHTML = footer;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.add('hidden');
}

// ── Toast ─────────────────────────────────────────

function showToast(msg, type = 'default', duration = 3000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const icons = { success: '✅', error: '❌', warning: '⚠️', default: 'ℹ️' };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]||icons.default}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

let loadingEl = null;
function showLoading() {
  if (loadingEl) return;
  loadingEl = document.createElement('div');
  loadingEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
  loadingEl.innerHTML = '<div class="spinner" style="width:44px;height:44px;border-width:4px"></div>';
  document.body.appendChild(loadingEl);
}
function hideLoading() {
  if (loadingEl) { loadingEl.remove(); loadingEl = null; }
}

// ── Number Formatters ──────────────────────────────

function formatMoney(n) {
  const num = parseFloat(n) || 0;
  return new Intl.NumberFormat('th-TH').format(num);
}
function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatMonth(d) {
  if (!d) return '-';
  const date = new Date(d + '-01');
  if (isNaN(date)) return d;
  return date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
}

// ── Enter key on login ────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('loginScreen').classList.contains('hidden')) {
    doLogin();
  }
});

// ── Boot ──────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  // Restore theme
  if (localStorage.getItem('gasto_theme') === 'dark') {
    document.body.classList.add('dark-mode');
    ['themeIcon','themeIconTop'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '☀️';
    });
    const tl = document.getElementById('themeLabel');
    if (tl) tl.textContent = 'Light Mode';
  }
  App.init();
});
