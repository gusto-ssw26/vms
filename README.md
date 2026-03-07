# 🏘️ ระบบบริหารจัดการหมู่บ้านกัสโต้สุขสวัสดิ์

ระบบบริหารจัดการหมู่บ้านจัดสรร ออกแบบตาม iOS/iPadOS Design System  
Deploy บน **GitHub Pages** + **Google Sheets** เป็นฐานข้อมูล

---

## 🚀 วิธี Deploy (ทำครั้งเดียว)

### ขั้นตอนที่ 1: สร้าง Google Sheet

1. ไปที่ [Google Sheets](https://sheets.google.com) → สร้าง Spreadsheet ใหม่
2. ตั้งชื่อว่า `Gasto Suksawat DB`
3. **คัดลอก Spreadsheet ID** จาก URL:  
   `https://docs.google.com/spreadsheets/d/**YOUR_ID_HERE**/edit`

---

### ขั้นตอนที่ 2: ตั้งค่า Google Apps Script

1. ใน Google Sheet → **Extensions → Apps Script**
2. ลบโค้ดเดิม → วางโค้ดจากไฟล์ `Code.gs`
3. แก้ไข `SPREADSHEET_ID` บรรทัดแรก:
   ```js
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   ```
4. แก้ไข `ADMIN_PASS` เป็นรหัสผ่านที่ต้องการ
5. **รัน function `setupSheets()`** (ครั้งแรกครั้งเดียว) เพื่อสร้าง Sheet ทั้งหมด
6. **Deploy → New Deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. **คัดลอก Web App URL**

---

### ขั้นตอนที่ 3: ตั้งค่า Frontend

แก้ไขไฟล์ `js/config.js`:
```js
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  ...
};
```

---

### ขั้นตอนที่ 4: Deploy บน GitHub Pages

```bash
# 1. สร้าง repository ใหม่บน GitHub (public)
# 2. Push โค้ดทั้งหมด

git init
git add .
git commit -m "Initial deployment - Gasto Suksawat Village System"
git remote add origin https://github.com/YOUR_USERNAME/gasto-village.git
git push -u origin main

# 3. ไปที่ GitHub → Settings → Pages
#    Source: Deploy from branch → main → / (root)
# 4. รอ 2-3 นาที → เข้าใช้งานได้ที่:
#    https://YOUR_USERNAME.github.io/gasto-village/
```

---

## 🔑 Default Login

| ผู้ใช้ | Username | Password |
|--------|----------|----------|
| นิติบุคคล | `admin` | `gasto@admin2024` |
| ลูกบ้าน (ตัวอย่าง) | `1/1` | `resident001` |

> ⚠️ **เปลี่ยนรหัสผ่านก่อนใช้งานจริง** ใน `Code.gs` บรรทัด `ADMIN_PASS`  
> และในข้อมูลลูกบ้านแต่ละหลัง (คอลัมน์ password ใน Residents sheet)

---

## 📊 โครงสร้าง Google Sheets (9 Sheets)

| Sheet | คอลัมน์สำคัญ |
|-------|------------|
| `Residents` | houseId, ownerName, phone, email, password, outstandingBalance |
| `Vehicles` | houseId, licensePlate, brand, stickerExpiry, monthlyFee |
| `CommonFees` | id, name, amount, type |
| `Payments` | payId, houseId, paymentDate, amount, method |
| `Receipts` | receiptId, houseId, payId, amount |
| `Invoices` | invoiceId, houseId, commonFee, parkingFee, totalAmount, status |
| `Announcements` | id, title, content, category, status |
| `MonthlyReports` | id, month, totalIncome, collectionRate |
| `Projects` | id, title, status, budget, beforeImageUrl, afterImageUrl, progress |

---

## 🎨 Features

- ✅ iOS/iPadOS Design Theme
- ✅ Light / Dark Mode
- ✅ Responsive (Mobile / Tablet / Desktop)
- ✅ Admin & Resident Role Separation
- ✅ ข้อมูลลูกบ้าน + รถยนต์
- ✅ ออกใบแจ้งหนี้ (รายบ้าน / รวมทั้งหมด)
- ✅ รับชำระเงิน + ออกใบเสร็จอัตโนมัติ
- ✅ พิมพ์ใบเสร็จ / ใบแจ้งหนี้
- ✅ ประกาศข่าวสาร
- ✅ บันทึกผลงานหมู่บ้าน (Before/After)
- ✅ รายงานประจำเดือน
- ✅ Dashboard สรุปข้อมูล
