# 🏘️ The Greenfield — Village Management System v5.0

ระบบจัดการหมู่บ้าน | Frontend: GitHub Pages + Backend: Google Apps Script + Google Sheets

---

## 📁 โครงสร้าง Repository

```
greenfield-vms/               ← ชื่อ Repository บน GitHub
│
├── index.html                ← Frontend หลัก (GitHub Pages serve ไฟล์นี้)
│
├── gas/                      ← Google Apps Script (อัปโหลดขึ้น GAS แยกต่างหาก)
│   ├── Code.gs               ← Main Router + Helpers
│   ├── Auth.gs               ← JWT Authentication
│   ├── Houses_Vehicles_ChangeReq.gs
│   ├── Fees_Issues_Violations.gs
│   ├── Services.gs           ← Announcements, Reports, Contractors, Marketplace, Users, Dashboard
│   └── Setup.gs              ← Run once: สร้าง Sheets + Admin user
│
└── README.md
```

---

## 🚀 ขั้นตอน Deploy ทั้งหมด

### STEP 1 — สร้าง GitHub Repository

1. ไปที่ [github.com](https://github.com) → **New repository**
2. ตั้งชื่อ: **`greenfield-vms`** (หรือชื่ออื่นที่ต้องการ)
3. เลือก **Public** (GitHub Pages ใช้ฟรีกับ Public repo)
4. กด **Create repository**

### STEP 2 — อัปโหลดไฟล์ขึ้น GitHub

**วิธีที่ 1 — ผ่านเว็บ (ง่ายที่สุด)**
1. เข้า repo ที่สร้างไว้
2. กด **Add file** → **Upload files**
3. ลาก `index.html` ไปวาง
4. กด **Commit changes**

**วิธีที่ 2 — ผ่าน Git CLI**
```bash
git clone https://github.com/YOUR_USERNAME/greenfield-vms.git
cd greenfield-vms
# วาง index.html ลงในโฟลเดอร์นี้
git add index.html
git commit -m "initial: add frontend"
git push origin main
```

### STEP 3 — เปิด GitHub Pages

1. ใน repo → **Settings** → **Pages** (ซ้ายมือ)
2. **Source:** Deploy from a branch
3. **Branch:** `main` → folder: `/ (root)`
4. กด **Save**
5. รอ 1–2 นาที → URL จะปรากฏ:
   ```
   https://YOUR_USERNAME.github.io/greenfield-vms/
   ```

> **⚠️ URL สำคัญ** — นี่คือ URL ที่ลูกบ้านใช้เข้าระบบ

---

### STEP 4 — ตั้งค่า Google Apps Script

1. ไปที่ [script.google.com](https://script.google.com)
2. กด **New project**
3. ตั้งชื่อ project: **`Greenfield VMS Backend`**
4. สร้างไฟล์ทั้งหมด (กด **+** ด้านซ้าย → Script):

   | ชื่อไฟล์ใน GAS | คัดลอกโค้ดจาก |
   |----------------|--------------|
   | `Code`         | `gas/Code.gs` |
   | `Auth`         | `gas/Auth.gs` |
   | `Houses_Vehicles_ChangeReq` | `gas/Houses_Vehicles_ChangeReq.gs` |
   | `Fees_Issues_Violations` | `gas/Fees_Issues_Violations.gs` |
   | `Services`     | `gas/Services.gs` |
   | `Setup`        | `gas/Setup.gs` |

5. ใน `Code.gs` บรรทัดแรก ตรวจสอบ:
   ```javascript
   const SHEET_ID     = '1Tpk0jT8IUk1fXlEAHLboXiWkVDxlYn1TX8WS0o7kf0s';
   const DRIVE_FOLDER = '1nE-7nxq_n_Acw5dchGrByWpVXl3lRR-e';
   ```

### STEP 5 — Initialize Google Sheets

1. ใน GAS Editor → เลือก function: **`setupAllSheets`**
2. กด **▶ Run**
3. อนุญาต Permission ที่ขอ (Sheets + Drive)
4. ดู Logs → จะเห็น:
   ```
   First admin created.
   Username: admin
   Password: Admin@1234
   ```

### STEP 6 — Deploy GAS เป็น Web App

1. ใน GAS → **Deploy** → **New deployment**
2. เลือก Type: **Web app**
3. ตั้งค่า:
   - **Description:** `VMS v5.0`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. กด **Deploy** → คัดลอก **Web app URL**

5. ใน `index.html` บรรทัด:
   ```javascript
   const GAS_URL = 'https://script.google.com/macros/s/...';
   ```
   → แทนที่ด้วย URL ใหม่ที่ได้ (ถ้าเปลี่ยน deployment)

6. **Re-deploy ทุกครั้งที่แก้โค้ด GAS:**
   - **Deploy** → **Manage deployments** → **Edit (✏️)** → **Version: New version** → **Deploy**

---

## 🔐 บัญชีผู้ใช้เริ่มต้น

| Username | Password | Role |
|----------|----------|------|
| `admin` | `Admin@1234` | Administrator |

> ⚠️ **เปลี่ยน password ทันทีหลัง login ครั้งแรก**

### เพิ่ม Admin user เพิ่มเติม (ถ้าต้องการ)
รันใน GAS Console:
```javascript
addAdminUser('admin2', 'Password@123', 'ชื่อแสดง');
```

---

## 👤 เพิ่ม Resident User

ผ่าน Admin UI:
1. Login ด้วย admin
2. ไปที่ **สมาชิก** → **+ เพิ่มสมาชิก**
3. กรอก username, password, house_id, role = resident

หรือรันใน GAS:
```javascript
// ต้องสร้างบ้านก่อน แล้วจึงสร้าง user
// house_id คือ ID จาก Google Sheet ตาราง HOUSES
```

---

## ⚙️ การแก้ไขค่าต่างๆ

### เปลี่ยน Project Name
ใน `index.html` ค้นหา `The Greenfield` แล้วแทนที่ด้วยชื่อหมู่บ้าน

### เปลี่ยน GAS URL
ใน `index.html` แก้บรรทัด:
```javascript
const GAS_URL = 'https://script.google.com/macros/s/YOUR_URL/exec';
```

### แก้ไข GAS แล้วต้อง Deploy ใหม่
ทุกครั้งที่แก้ไขไฟล์ `.gs` ต้อง:
1. GAS → Deploy → Manage deployments
2. Edit → New version → Deploy

---

## 🔗 Links สำคัญ

| รายการ | URL |
|--------|-----|
| **GitHub Pages (Frontend)** | `https://YOUR_USERNAME.github.io/greenfield-vms/` |
| **Google Apps Script** | `https://script.google.com` |
| **Google Sheet** | `https://docs.google.com/spreadsheets/d/1Tpk0jT8IUk1fXlEAHLboXiWkVDxlYn1TX8WS0o7kf0s` |
| **Google Drive Folder** | `https://drive.google.com/drive/folders/1nE-7nxq_n_Acw5dchGrByWpVXl3lRR-e` |

---

## 📊 Google Sheets — 13 Sheets

`USERS` · `LOGIN_LOGS` · `HOUSES` · `VEHICLES` · `CHANGE_REQUESTS` · `FEES` · `RECEIPTS` · `ISSUES` · `VIOLATIONS` · `ANNOUNCEMENTS` · `MONTHLY_REPORTS` · `CONTRACTORS` · `MARKETPLACE`

---

## 🐛 แก้ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|-------|--------|
| Login แล้วขึ้น `Unauthorized` | ตรวจสอบ GAS URL ใน `index.html` |
| ข้อมูลไม่แสดง | Re-deploy GAS (New version) |
| `Sheet not found` | รัน `setupAllSheets()` ใน GAS |
| ลืม Admin password | รัน `resetAdminPassword()` ใน GAS |
| CORS error | ตรวจสอบ GAS deploy → `Who has access: Anyone` |
