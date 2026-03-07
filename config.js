// ================================================================
// CONFIG - แก้ไข API_URL ให้ตรงกับ Google Apps Script Web App URL
// ================================================================

const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  VILLAGE_NAME: 'กัสโต้สุขสวัสดิ์',
  VERSION: '1.0.0'
};

// ================================================================
// API MODULE
// ================================================================

const API = {
  token: null,

  // GET request
  async get(action, params = {}) {
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);
    if (this.token) url.searchParams.set('token', this.token);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    try {
      const res = await fetch(url.toString());
      return await res.json();
    } catch (e) {
      console.error('API GET error:', e);
      return { success: false, error: e.message };
    }
  },

  // POST request
  async post(action, data = {}) {
    try {
      const res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, token: this.token, ...data })
      });
      return await res.json();
    } catch (e) {
      console.error('API POST error:', e);
      return { success: false, error: e.message };
    }
  },

  // Auth
  async login(username, password) {
    return this.get('login', { username, password });
  },

  // Residents
  async getResidents()           { return this.get('getResidents'); },
  async getResident(houseId)     { return this.get('getResident', { houseId }); },
  async addResident(data)        { return this.post('addResident', { data }); },
  async updateResident(data)     { return this.post('updateResident', { data }); },
  async deleteResident(houseId)  { return this.post('deleteResident', { houseId }); },

  // Vehicles
  async getVehicles()                 { return this.get('getVehicles'); },
  async addVehicle(data)              { return this.post('addVehicle', { data }); },
  async updateVehicle(data)           { return this.post('updateVehicle', { data }); },
  async deleteVehicle(licensePlate)   { return this.post('deleteVehicle', { licensePlate }); },

  // Payments
  async getPayments()            { return this.get('getPayments'); },
  async addPayment(data)         { return this.post('addPayment', { data }); },

  // Invoices
  async getInvoices()            { return this.get('getInvoices'); },
  async addInvoice(data)         { return this.post('addInvoice', { data }); },
  async generateInvoices(d)      { return this.post('generateInvoices', d); },

  // Receipts
  async getReceipts()            { return this.get('getReceipts'); },

  // Announcements
  async getAnnouncements()       { return this.get('getAnnouncements'); },
  async addAnnouncement(data)    { return this.post('addAnnouncement', { data }); },
  async updateAnnouncement(data) { return this.post('updateAnnouncement', { data }); },
  async deleteAnnouncement(id)   { return this.post('deleteAnnouncement', { id }); },

  // Projects
  async getProjects()            { return this.get('getProjects'); },
  async addProject(data)         { return this.post('addProject', { data }); },
  async updateProject(data)      { return this.post('updateProject', { data }); },
  async deleteProject(id)        { return this.post('deleteProject', { id }); },

  // Reports
  async getMonthlyReports()          { return this.get('getMonthlyReports'); },
  async addMonthlyReport(data)       { return this.post('addMonthlyReport', { data }); },
  async updateMonthlyReport(data)    { return this.post('updateMonthlyReport', { data }); },

  // Dashboard
  async getDashboardStats()      { return this.get('getDashboardStats'); },
};
