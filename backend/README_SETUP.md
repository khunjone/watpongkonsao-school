# คู่มือการติดตั้งและใช้งานระบบหลังบ้าน (Google Apps Script + Sheets + Drive)
### โรงเรียนตัวอย่างวิทยา (School of Excellence)

ระบบหลังบ้านนี้ออกแบบมาเพื่อให้ผู้ดูแลโรงเรียนสามารถจัดการข้อมูลทุกส่วนของเว็บไซต์ได้ 100% ผ่าน **Google Sheets** และจัดเก็บรูปภาพผ่าน **Google Drive** โดยมี **Google Apps Script (GAS)** ทำหน้าที่เป็น API Web App ที่มีความเร็วสูงระดับ CDN

---

## สารบัญ
1. [ขั้นตอนการติดตั้งระบบ (Setup ใน 3 นาที)](#1-ขั้นตอนการติดตั้งระบบ-setup-ใน-3-นาที)
2. [โครงสร้างตารางข้อมูลใน Google Sheets (10 ตาราง)](#2-โครงสร้างตารางข้อมูลใน-google-sheets-10-ตาราง)
3. [โครงสร้างโฟลเดอร์ Google Drive สำหรับจัดเก็บไฟล์](#3-โครงสร้างโฟลเดอร์-google-drive-สำหรับจัดเก็บไฟล์)
4. [API Endpoints และการเชื่อมต่อ](#4-api-endpoints-และการเชื่อมต่อ)
5. [การดึงรูปภาพจาก Drive ให้โหลดเร็วแบบ CDN](#5-การดึงรูปภาพจาก-drive-ให้โหลดเร็วแบบ-cdn)
6. [ระบบซิงค์ข่าวสารจาก Facebook อัตโนมัติ (Facebook Auto-Sync Engine)](#6-ระบบซิงค์ข่าวสารจาก-facebook-อัตโนมัติ-facebook-auto-sync-engine)

---

## 1. ขั้นตอนการติดตั้งระบบ (Setup ใน 3 นาที)

### ขั้นตอนที่ 1: สร้าง Google Spreadsheet
1. ไปที่ [Google Sheets](https://sheets.new) แล้วสร้างชีตใหม่
2. ตั้งชื่อไฟล์ว่า **`DB_SchoolWebsite`**

### ขั้นตอนที่ 2: ติดตั้งโค้ดใน Apps Script
1. ที่เมนูด้านบนของ Google Sheets คลิกที่ **ส่วนขยาย (Extensions)** -> **Apps Script**
2. ลบโค้ดเริ่มต้นในไฟล์ `Code.gs` ออกทั้งหมด
3. คัดลอกโค้ดจากไฟล์ [`backend/Code.gs`](file:///c:/Users/khunjone/Desktop/school-website/backend/Code.gs) ไปวางทั้งหมด
4. กดบันทึก (Ctrl + S)

### ขั้นตอนที่ 3: สั่งรันฟังก์ชันสร้างฐานข้อมูลอัตโนมัติ
1. ที่แถบเครื่องมือด้านบน เลือกฟังก์ชัน **`setupDatabase`**
2. กดปุ่ม **เรียกใช้ (Run)** ▶️
3. ในการรันครั้งแรก Google จะขออนุญาตเข้าถึง Spreadsheet และ Drive -> ให้กด **ตรวจสอบสิทธิ์ (Review Permissions)** -> เลือกบัญชี Google -> กด **ขั้นสูง (Advanced)** -> กด **ไปที่... (Go to... unsafe)** -> กด **อนุญาต (Allow)**
4. เมื่อระบบทำงานเสร็จ (ใช้เวลาประมาณ 3–5 วินาที) ให้กลับไปดูที่หน้า Google Sheets จะพบว่า **ทั้ง 10 ตารางถูกสร้างขึ้นพร้อมจัดรูปแบบและมีข้อมูลตั้งต้นครบถ้วนตรงตามหน้าเว็บทันที!**

### ขั้นตอนที่ 4: เผยแพร่เป็น Web App (Deploy)
1. ที่มุมขวาบนของ Apps Script คลิกปุ่มสีน้ำเงิน **การทำให้ใช้งานได้ (Deploy)** -> **การทำให้ใช้งานได้ใหม่ (New deployment)**
2. คลิกรูปฟันเฟือง ⚙️ ด้านซ้าย เลือกประเภทเป็น **เว็บแอป (Web app)**
3. ตั้งค่าดังนี้:
   - **คำอธิบาย (Description):** `School Website API v1`
   - **เรียกใช้ในฐานะ (Execute as):** `ฉัน (Me - บัญชีของคุณ)`
   - **ผู้ที่มีสิทธิ์เข้าถึง (Who has access):** **`ทุกคน (Anyone)`** *(สำคัญมาก เพื่อให้หน้าเว็บดึงข้อมูลได้)*
4. กด **ทำให้ใช้งานได้ (Deploy)**
5. คัดลอก **URL เว็บแอป (Web app URL)** ที่ได้ (ขึ้นต้นด้วย `https://script.google.com/macros/s/.../exec`) นำมาใช้งานเชื่อมต่อกับหน้าเว็บ

---

## 2. โครงสร้างตารางข้อมูลใน Google Sheets (10 ตาราง)

| ชื่อชีต | การใช้งานในหน้าเว็บ | คอลัมน์สำคัญ |
| :--- | :--- | :--- |
| **`SiteSettings`** | ข้อมูลโรงเรียน, ช่องทางติดต่อ, โซเชียล, ลิขสิทธิ์ | `Key`, `Value`, `Description`, `Updated_At` |
| **`HeroBanner`** | แบนเนอร์ยินดีต้อนรับ, ป้ายกำกับ, ปุ่ม CTA | `ID`, `BadgeText`, `Title`, `Subtitle`, `Btn1Text`, `Btn1Link`, `Status` |
| **`Statistics`** | ตัวเลขสถิติ 4 ช่อง (นักเรียน, กลุ่มสาระ, ห้องเรียน, บุคลากร) | `ID`, `IconEmoji`, `NumberValue`, `Label`, `SortOrder`, `Status` |
| **`QuickAccess`** | ปุ่มทางลัดด่วน 8 ปุ่ม | `ID`, `IconEmoji`, `Title`, `TargetURL`, `OpenNewTab`, `SortOrder`, `Status` |
| **`NewsArticles`** | ข่าวปักหมุด, ข่าวล่าสุด, ยอดวิว, วันที่, ภาพปก | `ArticleID`, `Category`, `Title`, `Excerpt`, `Content`, `IsPinned`, `ViewCount` |
| **`Galleries`** | ภาพกิจกรรมเด่น 4 ภาพและอัลบั้มกิจกรรม | `ID`, `Caption`, `IconEmoji`, `Image_DriveId`, `DirectViewUrl`, `EventDate` |
| **`Staff`** | ทำเนียบผู้บริหารและบุคลากร | `ID`, `FullName`, `RoleTitle`, `Department`, `AvatarEmoji`, `DirectPhotoUrl` |
| **`NavMenu`** | แถบเมนูนำทางด้านบน | `ID`, `Label`, `URL`, `ParentID`, `SortOrder`, `Status` |
| **`FooterLinks`** | ลิงก์ด่วน และลิงก์สำหรับผู้ปกครองส่วนท้าย | `ID`, `Group`, `Label`, `URL`, `SortOrder`, `Status` |
| **`ContactSubmissions`** | กล่องรับข้อความติดต่อจากผู้ปกครอง/นักเรียน | `ID`, `SenderName`, `Email`, `Phone`, `Subject`, `Message`, `Submitted_At` |

---

## 3. โครงสร้างโฟลเดอร์ Google Drive สำหรับจัดเก็บไฟล์

ระบบจะสร้างโฟลเดอร์ให้โดยอัตโนมัติเมื่อมีการอัปโหลดไฟล์ผ่าน API:

```text
📁 SchoolWebsite_Data/
   ├── 📁 01_News_Covers/        (ภาพปกข่าวประชาสัมพันธ์)
   ├── 📁 02_Gallery_Photos/     (ภาพถ่ายกิจกรรม)
   ├── 📁 03_Staff_Avatars/      (รูปถ่ายครูและผู้บริหาร)
   ├── 📁 04_Site_Banners/       (ภาพแบนเนอร์เว็บไซต์)
   └── 📁 05_Public_Documents/   (ไฟล์ PDF ดาวน์โหลดและจัดซื้อจัดจ้าง)
```

---

## 4. API Endpoints และการเชื่อมต่อ

Base URL: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`

### 4.1 อ่านข้อมูล (HTTP GET)

#### 1. ดึงข้อมูลทั้งหมดสำหรับหน้าแรก (One-call Initial Data):
- **URL:** `GET ?action=getInitialData`
- **คำอธิบาย:** ดึงการตั้งค่าทั้งหมด, ข่าวปักหมุด, ข่าวล่าสุด 6 ข่าว, แบนเนอร์, สถิติ, ปุ่มด่วน, ภาพกิจกรรม, บุคลากร พร้อมระบบ Script CacheService (แคช 10 นาที ตอบสนองในระดับเสี้ยววินาที)

#### 2. ดึงรายการข่าวสาร (รองรับ Pagination & หมวดหมู่):
- **URL:** `GET ?action=getNews&page=1&limit=6&category=ประชาสัมพันธ์`

#### 3. ดึงข่าวฉบับเต็มและเพิ่มยอดวิว (+1 ViewCount):
- **URL:** `GET ?action=getNewsDetail&id=NEWS-001`

#### 4. ค้นหาข่าวและบุคลากร (Live Search):
- **URL:** `GET ?action=search&q=คำค้นหา`

#### 5. ดึงข้อความติดต่อสำหรับ Admin Dashboard:
- **URL:** `GET ?action=getContacts`

---

### 4.2 เขียนข้อมูล (HTTP POST)

#### 1. ส่งข้อความติดต่อ:
```json
POST /exec
{
  "action": "saveContact",
  "name": "สมชาย ใจดี",
  "email": "somchai@example.com",
  "phone": "081-234-5678",
  "subject": "สอบถามเรื่องการรับสมัครเรียน",
  "message": "ต้องการสอบถามรายละเอียดหลักสูตรห้องเรียนพิเศษครับ"
}
```

#### 2. อัปโหลดรูปภาพลง Google Drive:
```json
POST /exec
{
  "action": "uploadFile",
  "folderCategory": "news",
  "fileName": "cover_science_day.jpg",
  "mimeType": "image/jpeg",
  "base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```
**ผลลัพธ์ตอบกลับ:**
```json
{
  "success": true,
  "fileId": "1a2b3c4d5e...",
  "directUrl": "https://lh3.googleusercontent.com/d/1a2b3c4d5e...",
  "viewUrl": "https://drive.google.com/file/d/1a2b3c4d5e.../view"
}
```

#### 3. เพิ่มหรืออัปเดตข่าวสาร:
```json
POST /exec
{
  "action": "saveNews",
  "ArticleID": "NEWS-001",
  "Category": "ประชาสัมพันธ์",
  "CategoryBadgeClass": "cat-news",
  "Title": "หัวข้อข่าว...",
  "Excerpt": "เนื้อหาย่อ...",
  "Content": "เนื้อหาเต็ม...",
  "DirectCoverUrl": "https://lh3.googleusercontent.com/d/...",
  "IsPinned": true,
  "PublishDate": "23 พ.ค. 2569",
  "Author": "admin",
  "Status": "Published"
}
```

#### 4. ปรับแต่งส่วนต่างๆ ของเว็บ:
- **ข้อมูลโรงเรียน:** `POST { "action": "updateSettings", "settings": { ... } }`
- **แบนเนอร์หลัก (Hero):** `POST { "action": "updateHero", "hero": { ... } }`
- **สถิติ 4 ช่อง (Stats):** `POST { "action": "updateStats", "stats": [ ... ] }`
- **ทางลัดด่วน (Quick Access):** `POST { "action": "updateQuickAccess", "quickAccess": [ ... ] }`
- **การตั้งค่า Facebook:** `POST { "action": "saveFacebookSettings", "fb_page_id": "...", "fb_access_token": "..." }`

---

## 5. การดึงรูปภาพจาก Drive ให้โหลดเร็วแบบ CDN

ระบบของเราแปลงรหัสไฟล์ Google Drive ให้เป็น High-Speed Thumbnail CDN โดยอัตโนมัติ:
- ฟอร์แมต URL: `https://lh3.googleusercontent.com/d/{FILE_ID}`
- จุดเด่น: โหลดเร็วกว่าลิงก์ `drive.google.com/uc?id=...` ทั่วไปถึง 3-5 เท่า และไม่ติดปัญหา Bandwidth Limit หรือ Google Login Screen

---

## 6. ระบบซิงค์ข่าวสารจาก Facebook อัตโนมัติ (Facebook Auto-Sync Engine)

ระบบนี้จะทำการดึงโพสต์จาก Facebook Page ของโรงเรียนมาเป็นข่าวประชาสัมพันธ์บนเว็บไซต์อัตโนมัติทุกๆ 1 ชั่วโมง:

### ขั้นตอนการตั้งค่า:
1. เข้าไปที่ [Facebook Developers](https://developers.facebook.com/) แล้วสร้าง App ประเภท Business
2. ขอ **Page Access Token (Long-lived Token)** ที่มีสิทธิ์ `pages_read_engagement` และ `pages_read_user_content`
3. ค้นหา **Page ID** ของเพจโรงเรียน (ดูได้จากส่วน About ของเพจ)
4. เปิดหน้า `admin.html` เข้าเมนู **"🔄 ซิงค์ข้อมูล Facebook"**
5. กรอก **Facebook Page ID** และ **Page Access Token** แล้วกด **"💾 บันทึกการตั้งค่า Facebook"**
6. กดปุ่ม **"▶️ เปิดระบบซิงค์อัตโนมัติ"** เพื่อสร้าง Time-driven Trigger ใน Google Apps Script (ทำงานทุก 1 ชม.)
7. สามารถกด **"🔄 บังคับซิงค์ทันที (Force Sync)"** เพื่อทดสอบดึงข่าวล่าสุดได้ทันที

### ความสามารถของระบบ Auto-Sync:
- **ป้องกันโพสต์ซ้ำ (Deduplication):** เปรียบเทียบ Post ID กับฐานข้อมูลเสมอ โพสต์เดิมจะไม่ถูกบันทึกซ้ำ
- **ดึงรูปภาพสูงสุด 5 รูป:** รูปแรกจะถูกตั้งเป็นภาพปกข่าว และรูปทั้งหมดจะถูกบันทึกลง `Attachment_DriveUrls` แสดงเป็นแกลเลอรีในหน้าอ่านข่าว
- **สกัดหัวข้อข่าวอัจฉริยะ:** หากโพสต์มีข้อความในเครื่องหมายคำพูด `"..."` ระบบจะนำมาเป็นหัวข้อข่าว หากไม่มี จะใช้บรรทัดแรกของโพสต์
