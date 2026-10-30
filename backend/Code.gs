/**
 * ==============================================================================
 * ระบบหลังบ้านเว็บไซต์โรงเรียน (Google Apps Script + Google Sheets + Google Drive)
 * โรงเรียนตัวอย่างวิทยา - School of Excellence
 * ==============================================================================
 * สคริปต์นี้ทำหน้าที่เป็น RESTful API Controller สำหรับจัดการข้อมูลทุกส่วนของหน้าเว็บ
 * เชื่อมโยงกับ Google Sheets เป็น Database และ Google Drive เป็น Media Storage
 */

// ── การตั้งค่าและชื่อตารางใน GOOGLE SHEETS ──
const SHEETS = {
  SETTINGS: 'SiteSettings',
  HERO: 'HeroBanner',
  STATS: 'Statistics',
  QUICK_ACCESS: 'QuickAccess',
  NEWS: 'NewsArticles',
  GALLERY: 'Galleries',
  STAFF: 'Staff',
  NAV: 'NavMenu',
  FOOTER: 'FooterLinks',
  CONTACT: 'ContactSubmissions'
};

const DRIVE_FOLDERS = {
  ROOT: 'SchoolWebsite_Data',
  NEWS: '01_News_Covers',
  GALLERY: '02_Gallery_Photos',
  STAFF: '03_Staff_Avatars',
  BANNERS: '04_Site_Banners',
  DOCS: '05_Public_Documents'
};

const CACHE_KEY = 'SCHOOL_SITE_INITIAL_DATA_V1';
const CACHE_DURATION_SEC = 600; // 10 นาที

// ── การตั้งค่า FACEBOOK SYNC ──
const FB_GRAPH_API = 'https://graph.facebook.com/v18.0';
const FB_SYNC_TRIGGER_NAME = 'autoSyncFacebook';
const FB_SYNC_INTERVAL_HOURS = 1; // ซิงค์ทุก 1 ชั่วโมง

// ==============================================================================
// 1. HTTP GET CONTROLLER (อ่านข้อมูล)
// ==============================================================================
function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const action = params.action || 'getInitialData';

    switch (action) {
      case 'getInitialData':
        return getInitialDataHandler();

      case 'getNews':
        return getNewsHandler(params);

      case 'getNewsDetail':
        return getNewsDetailHandler(params.id);

      case 'search':
        return searchHandler(params.q);

      case 'getGallery':
        return getGalleryHandler(params);

      case 'getStaff':
        return getStaffHandler(params);

      case 'clearCache':
        clearAllCache();
        return jsonResponse({ success: true, message: 'ล้างแคชเรียบร้อยแล้ว' });

      case 'getFacebookSettings':
        return getFacebookSettingsHandler();

      case 'forceSyncFacebook':
        return forceSyncFacebookHandler();

      case 'getContacts':
        return getContactsHandler();

      default:
        return jsonResponse({ error: 'ไม่พบ action ที่ระบุ: ' + action }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: err.toString(), stack: err.stack }, 500);
  }
}

// ==============================================================================
// 2. HTTP POST CONTROLLER (เขียน/แก้ไข/ลบ/อัปโหลด)
// ==============================================================================
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      body = e.parameter;
    }

    const action = body.action;

    switch (action) {
      case 'saveContact':
        return saveContactHandler(body);

      case 'uploadFile':
        return uploadFileHandler(body);

      case 'saveNews':
        return saveNewsHandler(body);

      case 'deleteNews':
        return deleteNewsHandler(body.id);

      case 'saveStaff':
        return saveStaffHandler(body);

      case 'deleteStaff':
        return deleteStaffHandler(body.id);

      case 'saveGallery':
        return saveGalleryHandler(body);

      case 'deleteGallery':
        return deleteGalleryHandler(body.id);

      case 'updateSettings':
        return updateSettingsHandler(body.settings);

      case 'updateHero':
        return updateHeroHandler(body.hero);

      case 'updateStats':
        return updateStatsHandler(body.stats);

      case 'updateQuickAccess':
        return updateQuickAccessHandler(body.quickAccess);

      case 'incrementView':
        return incrementViewHandler(body.id);

      case 'saveFacebookSettings':
        return saveFacebookSettingsHandler(body);

      case 'setupFacebookTrigger':
        return setupFacebookTriggerHandler();

      case 'removeFacebookTrigger':
        return removeFacebookTriggerHandler();

      default:
        return jsonResponse({ error: 'ไม่พบ action ในการ POST: ' + action }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: err.toString(), stack: err.stack }, 500);
  }
}

// ==============================================================================
// 3. READ HANDLERS
// ==============================================================================

/**
 * ดึงข้อมูลหน้าแรกทั้งหมดในครั้งเดียวแบบมีแคชความเร็วสูง
 */
function getInitialDataHandler() {
  const cache = CacheService.getScriptCache();
  const cachedData = cache.get(CACHE_KEY);

  if (cachedData) {
    return ContentService.createTextOutput(cachedData)
      .setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const settings = getKeyValueData(ss.getSheetByName(SHEETS.SETTINGS));
  const hero = getTableData(ss.getSheetByName(SHEETS.HERO));
  const stats = getTableData(ss.getSheetByName(SHEETS.STATS));
  const quickAccess = getTableData(ss.getSheetByName(SHEETS.QUICK_ACCESS));
  const allNews = getTableData(ss.getSheetByName(SHEETS.NEWS));
  const gallery = getTableData(ss.getSheetByName(SHEETS.GALLERY));
  const staff = getTableData(ss.getSheetByName(SHEETS.STAFF));
  const nav = getTableData(ss.getSheetByName(SHEETS.NAV));
  const footer = getTableData(ss.getSheetByName(SHEETS.FOOTER));

  // แยกข่าวปักหมุด และข่าวล่าสุด 6 ข่าวแรก
  const publishedNews = allNews.filter(n => (n.Status || '').toLowerCase() === 'published');
  const pinnedNews = publishedNews.find(n => n.IsPinned === true || n.IsPinned === 'TRUE') || publishedNews[0] || null;
  const latestNews = publishedNews.slice(0, 6);

  const payload = {
    success: true,
    data: {
      settings: settings,
      hero: hero.filter(h => h.Status === 'Active'),
      stats: stats.filter(s => s.Status === 'Active').sort((a,b) => (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0)),
      quickAccess: quickAccess.filter(q => q.Status === 'Active').sort((a,b) => (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0)),
      featuredNews: pinnedNews,
      latestNews: latestNews,
      gallery: gallery.filter(g => g.Status === 'Active').slice(0, 4),
      staff: staff.filter(s => s.Status === 'Active').sort((a,b) => (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0)).slice(0, 4),
      nav: nav.filter(n => n.Status === 'Active').sort((a,b) => (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0)),
      footer: footer.filter(f => f.Status === 'Active').sort((a,b) => (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0))
    },
    timestamp: new Date().toISOString()
  };

  const jsonStr = JSON.stringify(payload);
  try {
    cache.put(CACHE_KEY, jsonStr, CACHE_DURATION_SEC);
  } catch (e) {
    // กรณีข้อมูลเกิน 100KB ของแคชตัวเดียว ให้ข้าม
  }

  return ContentService.createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ดึงรายการข่าวสาร (รองรับการกรองหมวดหมู่ และ Pagination)
 */
function getNewsHandler(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.NEWS);
  let list = getTableData(sheet).filter(n => (n.Status || '').toLowerCase() === 'published');

  const cat = params.category;
  if (cat && cat !== 'all') {
    list = list.filter(n => n.Category === cat);
  }

  const page = parseInt(params.page || '1', 10);
  const limit = parseInt(params.limit || '6', 10);
  const total = list.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const items = list.slice(start, start + limit);

  return jsonResponse({
    success: true,
    total: total,
    page: page,
    limit: limit,
    totalPages: totalPages,
    items: items
  });
}

/**
 * ดึงรายละเอียดข่าวฉบับเต็ม พร้อมเพิ่ม ViewCount +1 อัตโนมัติ
 */
function getNewsDetailHandler(id) {
  if (!id) return jsonResponse({ error: 'ต้องระบุ id ข่าว' }, 400);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.NEWS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse({ error: 'ไม่พบข้อมูล' }, 404);

  const headers = data[0];
  const idCol = headers.indexOf('ArticleID');
  const viewCol = headers.indexOf('ViewCount');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      // เพิ่มยอดวิว
      const currentViews = Number(data[i][viewCol]) || 0;
      sheet.getRange(i + 1, viewCol + 1).setValue(currentViews + 1);

      const item = {};
      headers.forEach((h, colIdx) => {
        item[h] = data[i][colIdx];
      });
      item.ViewCount = currentViews + 1;

      return jsonResponse({ success: true, item: item });
    }
  }

  return jsonResponse({ error: 'ไม่พบข่าวรหัส: ' + id }, 404);
}

/**
 * ค้นหาทั้งเว็บไซต์ (ข่าวสาร และ บุคลากร)
 */
function searchHandler(query) {
  if (!query) return jsonResponse({ success: true, results: { news: [], staff: [] } });

  const q = query.toLowerCase().trim();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const news = getTableData(ss.getSheetByName(SHEETS.NEWS))
    .filter(n => (n.Title || '').toLowerCase().includes(q) || (n.Excerpt || '').toLowerCase().includes(q) || (n.Category || '').toLowerCase().includes(q));

  const staff = getTableData(ss.getSheetByName(SHEETS.STAFF))
    .filter(s => (s.FullName || '').toLowerCase().includes(q) || (s.RoleTitle || '').toLowerCase().includes(q) || (s.Department || '').toLowerCase().includes(q));

  return jsonResponse({
    success: true,
    query: query,
    results: {
      news: news.slice(0, 10),
      staff: staff.slice(0, 10)
    }
  });
}

function getGalleryHandler(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const list = getTableData(ss.getSheetByName(SHEETS.GALLERY))
    .filter(g => g.Status === 'Active');
  return jsonResponse({ success: true, items: list });
}

function getStaffHandler(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const list = getTableData(ss.getSheetByName(SHEETS.STAFF))
    .filter(s => s.Status === 'Active')
    .sort((a,b) => (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0));
  return jsonResponse({ success: true, items: list });
}

// ==============================================================================
// 4. WRITE & UPLOAD HANDLERS
// ==============================================================================

/**
 * บันทึกข้อความติดต่อจากผู้ใช้งาน
 */
function saveContactHandler(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.CONTACT);
  
  const id = 'MSG-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd-HHmmss');
  const row = [
    id,
    body.name || '',
    body.email || '',
    body.phone || '',
    body.subject || '',
    body.message || '',
    new Date(),
    'Unread'
  ];

  sheet.appendRow(row);
  return jsonResponse({ success: true, message: 'ส่งข้อความเรียบร้อยแล้ว', id: id });
}

/**
 * อัปโหลดรูปภาพหรือเอกสารลง Google Drive
 * รับ base64, fileName, mimeType, folderCategory ('news', 'gallery', 'staff', 'banners', 'docs')
 */
function uploadFileHandler(body) {
  if (!body.base64 || !body.fileName) {
    return jsonResponse({ error: 'ข้อมูลไฟล์ไม่ครบถ้วน (ต้องการ base64 และ fileName)' }, 400);
  }

  const folderCategory = body.folderCategory || 'news';
  const folder = getOrCreateTargetFolder(folderCategory);

  const decodedBytes = Utilities.base64Decode(body.base64.replace(/^data:.*;base64,/, ''));
  const blob = Utilities.newBlob(decodedBytes, body.mimeType || 'image/jpeg', body.fileName);
  
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  // ลิงก์ High-Speed Google CDN สำหรับรูปภาพ
  const directUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
  const viewUrl = file.getUrl();

  return jsonResponse({
    success: true,
    fileId: fileId,
    directUrl: directUrl,
    viewUrl: viewUrl,
    fileName: body.fileName
  });
}

/**
 * เพิ่มหรืออัปเดตข่าวสาร
 */
function saveNewsHandler(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.NEWS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let id = body.ArticleID;
  let isNew = false;
  if (!id) {
    id = 'NEWS-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd-HHmmss');
    isNew = true;
  }

  let rowIndex = -1;
  const idCol = headers.indexOf('ArticleID');
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowValues = headers.map(h => {
    if (h === 'ArticleID') return id;
    if (h === 'Created_At' && isNew) return new Date();
    if (h === 'ViewCount' && isNew) return 0;
    if (body[h] !== undefined) return body[h];
    return '';
  });

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  clearAllCache();
  return jsonResponse({ success: true, message: 'บันทึกข่าวเรียบร้อย', ArticleID: id });
}

function deleteNewsHandler(id) {
  if (!id) return jsonResponse({ error: 'ต้องระบุ id' }, 400);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.NEWS);
  const data = sheet.getDataRange().getValues();
  const idCol = data[0].indexOf('ArticleID');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      sheet.deleteRow(i + 1);
      clearAllCache();
      return jsonResponse({ success: true, message: 'ลบข่าวเรียบร้อยแล้ว' });
    }
  }
  return jsonResponse({ error: 'ไม่พบข่าวที่ต้องการลบ' }, 404);
}

function saveStaffHandler(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.STAFF);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let id = body.ID || ('STAFF-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd-HHmmss'));
  let rowIndex = -1;
  const idCol = headers.indexOf('ID');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowValues = headers.map(h => {
    if (h === 'ID') return id;
    if (body[h] !== undefined) return body[h];
    return '';
  });

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  clearAllCache();
  return jsonResponse({ success: true, message: 'บันทึกข้อมูลบุคลากรเรียบร้อย', ID: id });
}

function deleteStaffHandler(id) {
  return deleteRowById(SHEETS.STAFF, 'ID', id, 'ลบข้อมูลบุคลากรเรียบร้อย');
}

function saveGalleryHandler(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.GALLERY);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let id = body.ID || ('GAL-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd-HHmmss'));
  let rowIndex = -1;
  const idCol = headers.indexOf('ID');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowValues = headers.map(h => {
    if (h === 'ID') return id;
    if (body[h] !== undefined) return body[h];
    return '';
  });

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  clearAllCache();
  return jsonResponse({ success: true, message: 'บันทึกภาพกิจกรรมเรียบร้อย', ID: id });
}

function deleteGalleryHandler(id) {
  return deleteRowById(SHEETS.GALLERY, 'ID', id, 'ลบภาพกิจกรรมเรียบร้อย');
}

function updateSettingsHandler(settingsObj) {
  if (!settingsObj) return jsonResponse({ error: 'ไม่มีข้อมูล settings' }, 400);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    if (settingsObj[key] !== undefined) {
      sheet.getRange(i + 1, 2).setValue(settingsObj[key]);
      sheet.getRange(i + 1, 4).setValue(new Date());
    }
  }

  clearAllCache();
  return jsonResponse({ success: true, message: 'อัปเดตการตั้งค่าเรียบร้อยแล้ว' });
}

function incrementViewHandler(id) {
  return getNewsDetailHandler(id);
}

function getContactsHandler() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const list = getTableData(ss.getSheetByName(SHEETS.CONTACT));
  return jsonResponse({ success: true, items: list.reverse() });
}

function updateHeroHandler(heroObj) {
  if (!heroObj) return jsonResponse({ error: 'ไม่มีข้อมูล hero' }, 400);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.HERO);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const rowValues = headers.map(h => {
    if (h === 'ID') return 'HERO-01';
    if (h === 'Status') return 'Active';
    if (h === 'SortOrder') return 1;
    if (heroObj[h] !== undefined) return heroObj[h];
    return data[1] ? (data[1][headers.indexOf(h)] || '') : '';
  });

  if (data.length > 1) {
    sheet.getRange(2, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  clearAllCache();
  return jsonResponse({ success: true, message: 'บันทึกข้อมูลแบนเนอร์เรียบร้อยแล้ว' });
}

function updateStatsHandler(statsArray) {
  if (!Array.isArray(statsArray)) return jsonResponse({ error: 'ข้อมูล stats ต้องเป็น Array' }, 400);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.STATS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  if (data.length > 1) {
    sheet.getRange(2, 1, data.length - 1, headers.length).clearContent();
  }

  const rows = statsArray.map((st, i) => {
    return headers.map(h => {
      if (h === 'ID') return st.ID || ('STAT-0' + (i + 1));
      if (h === 'SortOrder') return st.SortOrder || (i + 1);
      if (h === 'Status') return st.Status || 'Active';
      if (st[h] !== undefined) return st[h];
      return '';
    });
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  clearAllCache();
  return jsonResponse({ success: true, message: 'บันทึกข้อมูลสถิติเรียบร้อยแล้ว' });
}

function updateQuickAccessHandler(itemsArray) {
  if (!Array.isArray(itemsArray)) return jsonResponse({ error: 'ข้อมูล quickAccess ต้องเป็น Array' }, 400);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.QUICK_ACCESS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  if (data.length > 1) {
    sheet.getRange(2, 1, data.length - 1, headers.length).clearContent();
  }

  const rows = itemsArray.map((qa, i) => {
    return headers.map(h => {
      if (h === 'ID') return qa.ID || ('QA-0' + (i + 1));
      if (h === 'SortOrder') return qa.SortOrder || (i + 1);
      if (h === 'Status') return qa.Status || 'Active';
      if (h === 'OpenNewTab') return qa.OpenNewTab || false;
      if (qa[h] !== undefined) return qa[h];
      return '';
    });
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  clearAllCache();
  return jsonResponse({ success: true, message: 'บันทึกทางลัดด่วนเรียบร้อยแล้ว' });
}

// ==============================================================================
// 4.5 FACEBOOK AUTO-SYNC SYSTEM
// ==============================================================================

/**
 * ฟังก์ชันหลักที่จะถูกเรียกโดย Time-driven Trigger ทุก 1 ชั่วโมง
 * ดึงโพสต์ล่าสุดจาก Facebook Page และบันทึกเฉพาะโพสต์ใหม่ลง Google Sheets
 */
function autoSyncFacebook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settings = getKeyValueData(ss.getSheetByName(SHEETS.SETTINGS));

  const pageId = settings['fb_page_id'] || '';
  const accessToken = settings['fb_access_token'] || '';

  if (!pageId || !accessToken) {
    Logger.log('⚠️ Facebook Sync: ยังไม่ได้ตั้งค่า Page ID หรือ Access Token');
    return { success: false, message: 'ยังไม่ได้ตั้งค่า Facebook Page ID หรือ Access Token ในระบบ' };
  }

  try {
    // ดึงโพสต์ล่าสุด 10 รายการจาก Facebook Page
    const apiUrl = FB_GRAPH_API + '/' + pageId + '/posts'
      + '?fields=id,message,created_time,permalink_url,attachments{media,subattachments}'
      + '&limit=10'
      + '&access_token=' + accessToken;

    const response = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
    const httpCode = response.getResponseCode();

    if (httpCode !== 200) {
      const errText = response.getContentText();
      Logger.log('❌ Facebook API error (HTTP ' + httpCode + '): ' + errText);
      let errMsg = 'Facebook API error (HTTP ' + httpCode + ')';
      try {
        const errJson = JSON.parse(errText);
        if (errJson && errJson.error && errJson.error.message) {
          errMsg = errJson.error.message;
        }
      } catch (e) {}
      return { success: false, message: errMsg, error: errText };
    }

    const json = JSON.parse(response.getContentText());
    const posts = json.data || [];

    if (posts.length === 0) {
      Logger.log('ℹ️ ไม่พบโพสต์ใดๆ จาก Facebook Page');
      return { success: true, message: 'ไม่พบโพสต์ใดๆ จาก Facebook Page', newCount: 0 };
    }

    // ดึง Post ID ที่มีอยู่แล้วใน Google Sheets เพื่อเปรียบเทียบ
    const newsSheet = ss.getSheetByName(SHEETS.NEWS);
    const existingData = newsSheet.getDataRange().getValues();
    const headers = existingData[0];
    const idCol = headers.indexOf('ArticleID');
    const existingIds = new Set();
    for (let i = 1; i < existingData.length; i++) {
      existingIds.add(String(existingData[i][idCol]));
    }

    let newCount = 0;

    posts.forEach(function (post) {
      const fbPostId = 'FB-' + post.id;

      // ข้ามถ้า Post ID นี้มีอยู่แล้ว
      if (existingIds.has(fbPostId)) return;

      // ข้ามโพสต์ที่ไม่มีข้อความ
      const message = post.message || '';
      if (!message.trim()) return;

      // แยกหัวข้อข่าวจากเครื่องหมายคำพูด ""
      const title = extractTitleFromQuotes(message);

      // สร้าง Excerpt (ตัดสั้น 150 ตัวอักษร)
      const excerpt = message.length > 150 ? message.substring(0, 150) + '...' : message;

      // ดึงรูปภาพจาก attachments (สูงสุด 5 รูป)
      const imageUrls = extractFacebookImages(post, 5);
      const coverUrl = imageUrls.length > 0 ? imageUrls[0] : '';
      const attachmentUrls = imageUrls.join(',');

      // แปลงวันที่
      const createdDate = new Date(post.created_time);
      const thaiDate = Utilities.formatDate(createdDate, 'GMT+7', 'dd MMM yyyy');

      // เตรียมข้อมูลแถวใหม่ตามหัวตาราง NewsArticles
      const rowValues = headers.map(function (h) {
        switch (h) {
          case 'ArticleID': return fbPostId;
          case 'Category': return 'ประชาสัมพันธ์';
          case 'CategoryBadgeClass': return 'cat-news';
          case 'Title': return title;
          case 'Excerpt': return excerpt;
          case 'Content': return message;
          case 'CoverImage_DriveId': return '';
          case 'DirectCoverUrl': return coverUrl;
          case 'IsPinned': return false;
          case 'PublishDate': return thaiDate;
          case 'Author': return 'Facebook';
          case 'ViewCount': return 0;
          case 'Attachment_DriveUrls': return attachmentUrls;
          case 'Status': return 'Published';
          case 'Created_At': return createdDate;
          default: return '';
        }
      });

      newsSheet.appendRow(rowValues);
      newCount++;
    });

    if (newCount > 0) {
      clearAllCache();
      Logger.log('✅ Facebook Sync สำเร็จ: เพิ่มข่าวใหม่ ' + newCount + ' รายการ');
      return { success: true, message: 'ซิงค์ข้อมูลสำเร็จ! เพิ่มข่าวใหม่ ' + newCount + ' รายการ', newCount: newCount };
    } else {
      Logger.log('ℹ️ Facebook Sync: ไม่พบโพสต์ใหม่ที่ยังไม่ได้บันทึก');
      return { success: true, message: 'ไม่พบโพสต์ใหม่ที่ยังไม่ได้บันทึก (ข้อมูลเป็นปัจจุบันแล้ว)', newCount: 0 };
    }

  } catch (err) {
    Logger.log('❌ Facebook Sync Error: ' + err.toString());
    return { success: false, message: 'เกิดข้อผิดพลาดในการซิงค์: ' + err.toString(), error: err.toString() };
  }
}

/**
 * แยกหัวข้อข่าวจากข้อความในเครื่องหมายคำพูด ""
 * หากไม่พบเครื่องหมายคำพูด จะใช้บรรทัดแรก หรือ 80 ตัวอักษรแรกแทน
 */
function extractTitleFromQuotes(text) {
  if (!text) return 'โพสต์จาก Facebook';

  // ค้นหาข้อความในเครื่องหมายคำพูด "..."
  var match = text.match(/["\u201C\u201D]([^"\u201C\u201D]+)["\u201C\u201D]/);
  if (match && match[1] && match[1].trim().length > 0) {
    return match[1].trim();
  }

  // สำรอง: ใช้บรรทัดแรก
  var firstLine = text.split('\n')[0].trim();
  if (firstLine.length > 0 && firstLine.length <= 120) {
    return firstLine;
  }

  // สำรอง: ตัด 80 ตัวอักษรแรก
  return text.substring(0, 80).trim() + '...';
}

/**
 * ดึง URL รูปภาพจาก Facebook Post attachments
 * @param {Object} post - ข้อมูลโพสต์จาก Graph API
 * @param {number} maxImages - จำนวนรูปภาพสูงสุดที่ต้องการ
 * @returns {string[]} อาร์เรย์ของ URL รูปภาพ
 */
function extractFacebookImages(post, maxImages) {
  var urls = [];
  try {
    if (!post.attachments || !post.attachments.data) return urls;

    post.attachments.data.forEach(function (att) {
      // กรณีโพสต์มีรูปภาพเดียว
      if (att.media && att.media.image && att.media.image.src) {
        urls.push(att.media.image.src);
      }

      // กรณีโพสต์มีหลายรูป (subattachments)
      if (att.subattachments && att.subattachments.data) {
        att.subattachments.data.forEach(function (sub) {
          if (sub.media && sub.media.image && sub.media.image.src) {
            urls.push(sub.media.image.src);
          }
        });
      }
    });
  } catch (e) {
    Logger.log('extractFacebookImages error: ' + e);
  }

  return urls.slice(0, maxImages);
}

/**
 * GET Handler: ดึงค่าตั้งค่า Facebook สำหรับหน้า Admin
 */
function getFacebookSettingsHandler() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getKeyValueData(ss.getSheetByName(SHEETS.SETTINGS));

  return jsonResponse({
    success: true,
    fb_page_id: settings['fb_page_id'] || '',
    fb_access_token: settings['fb_access_token'] ? '••••••••' : '',
    fb_has_token: !!settings['fb_access_token'],
    fb_trigger_active: isFacebookTriggerActive()
  });
}

/**
 * GET Handler: บังคับซิงค์ Facebook ทันที
 */
function forceSyncFacebookHandler() {
  const result = autoSyncFacebook();
  if (result && !result.success) {
    return jsonResponse({ success: false, message: result.message, error: result.error });
  }
  return jsonResponse({
    success: true,
    message: result ? result.message : 'สั่งซิงค์ข้อมูลจาก Facebook เรียบร้อยแล้ว',
    newCount: result ? result.newCount : 0
  });
}

/**
 * POST Handler: บันทึกค่าตั้งค่า Facebook (Page ID, Access Token)
 */
function saveFacebookSettingsHandler(body) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.SETTINGS);
  var data = sheet.getDataRange().getValues();

  var updates = {};
  if (body.fb_page_id !== undefined) updates['fb_page_id'] = body.fb_page_id;
  if (body.fb_access_token !== undefined && body.fb_access_token !== '••••••••') {
    updates['fb_access_token'] = body.fb_access_token;
  }

  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    if (updates[key] !== undefined) {
      sheet.getRange(i + 1, 2).setValue(updates[key]);
      sheet.getRange(i + 1, 4).setValue(new Date());
    }
  }

  // ถ้ายังไม่มีแถว fb_page_id หรือ fb_access_token ให้เพิ่มใหม่
  var existingKeys = data.map(function (row) { return row[0]; });
  if (updates['fb_page_id'] !== undefined && existingKeys.indexOf('fb_page_id') === -1) {
    sheet.appendRow(['fb_page_id', updates['fb_page_id'], 'Facebook Page ID', new Date()]);
  }
  if (updates['fb_access_token'] !== undefined && existingKeys.indexOf('fb_access_token') === -1) {
    sheet.appendRow(['fb_access_token', updates['fb_access_token'], 'Facebook Page Access Token', new Date()]);
  }

  clearAllCache();
  return jsonResponse({ success: true, message: 'บันทึกการตั้งค่า Facebook สำเร็จ' });
}

/**
 * POST Handler: สร้าง Trigger ซิงค์ Facebook อัตโนมัติทุก 1 ชั่วโมง
 */
function setupFacebookTriggerHandler() {
  setupFacebookTrigger();
  return jsonResponse({ success: true, message: 'ตั้งค่า Trigger ซิงค์อัตโนมัติทุก ' + FB_SYNC_INTERVAL_HOURS + ' ชั่วโมง สำเร็จ' });
}

/**
 * POST Handler: ลบ Trigger ซิงค์ Facebook อัตโนมัติ
 */
function removeFacebookTriggerHandler() {
  removeFacebookTrigger();
  return jsonResponse({ success: true, message: 'ปิดระบบซิงค์อัตโนมัติเรียบร้อยแล้ว' });
}

/**
 * สร้าง Time-driven Trigger ให้เรียก autoSyncFacebook() ทุกๆ 1 ชั่วโมง
 * (รันฟังก์ชันนี้ 1 ครั้งจาก Apps Script Editor หรือจากหน้า Admin)
 */
function setupFacebookTrigger() {
  // ลบ trigger เก่าก่อน (ป้องกันซ้ำซ้อน)
  removeFacebookTrigger();

  ScriptApp.newTrigger(FB_SYNC_TRIGGER_NAME)
    .timeBased()
    .everyHours(FB_SYNC_INTERVAL_HOURS)
    .create();

  Logger.log('✅ สร้าง Trigger ซิงค์ Facebook ทุก ' + FB_SYNC_INTERVAL_HOURS + ' ชั่วโมง สำเร็จ');
}

/**
 * ลบ Trigger ซิงค์ Facebook ทั้งหมด
 */
function removeFacebookTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (t) {
    if (t.getHandlerFunction() === FB_SYNC_TRIGGER_NAME) {
      ScriptApp.deleteTrigger(t);
    }
  });
}

/**
 * ตรวจสอบว่า Facebook Trigger กำลังทำงานอยู่หรือไม่
 */
function isFacebookTriggerActive() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === FB_SYNC_TRIGGER_NAME) {
      return true;
    }
  }
  return false;
}

// ==============================================================================
// 5. SETUP & AUTOMATED DATABASE INITIALIZER (รันฟังก์ชันนี้ครั้งเดียวตอนเริ่มต้น)
// ==============================================================================

/**
 * ฟังก์ชันช่วยสร้างและจัดรูปแบบชีต พร้อมใส่หัวตารางและข้อมูลตั้งต้น
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - อ็อบเจกต์ Spreadsheet
 * @param {string} sheetName - ชื่อชีตที่ต้องการสร้าง
 * @param {string[]} headers - รายการหัวคอลัมน์
 * @param {Array[]} initialRows - แถวข้อมูลเริ่มต้น
 */
function setupSheet(ss, sheetName, headers, initialRows) {
  let sheet = ss.getSheetByName(sheetName);
  let isNew = false;

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    isNew = true;
  }

  // หากเป็นชีตที่เพิ่งสร้างใหม่ หรือชีตยังไม่มีข้อมูล ให้ใส่หัวตารางและข้อมูลตั้งต้น
  if (isNew || sheet.getLastRow() === 0) {
    sheet.clear();
    sheet.appendRow(headers);

    // ตกแต่งหัวตาราง: สีน้ำเงินเข้ม (#1a2d6d) ตัวหนังสือสีขาว ตัวหนา จัดกึ่งกลาง ตรึงแถวที่ 1
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#1a2d6d');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);

    // ใส่แถวข้อมูลเริ่มต้น
    if (initialRows && initialRows.length > 0) {
      sheet.getRange(2, 1, initialRows.length, headers.length).setValues(initialRows);
    }

    // ปรับความกว้างคอลัมน์อัตโนมัติ
    for (let c = 1; c <= headers.length; c++) {
      try {
        sheet.autoResizeColumn(c);
      } catch (e) {}
    }
  }

  return sheet;
}

/**
 * รันฟังก์ชันนี้เพียง 1 ครั้งใน Apps Script Editor เพื่อสร้าง 10 ชีต พร้อมใส่หัวตาราง
 * และใส่ข้อมูลตั้งต้นทั้งหมดตรงตาม index.html อัตโนมัติ!
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. SiteSettings
  setupSheet(ss, SHEETS.SETTINGS, ['Key', 'Value', 'Description', 'Updated_At'], [
    ['school_name_th', 'โรงเรียนวัดโป่งก้อนเส้า', 'ชื่อโรงเรียนภาษาไทย', new Date()],
    ['school_name_en', 'Watpongkonsao School', 'ชื่อภาษาอังกฤษ', new Date()],
    ['school_motto', 'มุ่งสู่ความเป็นเลิศ พัฒนาผู้เรียนสู่อนาคต', 'สโลแกนหรือคำขวัญ', new Date()],
    ['school_logo_abbr', 'ป.ก.ส.', 'ตัวย่อตราโรงเรียน', new Date()],
    ['school_logo_url', '', 'URL รูปภาพตราโรงเรียนใน Google Drive', new Date()],
    ['address', 'หมู่ 5 บ้านโป่งก้อนเส้า ตำบลท่ามะปราง อำเภอแก่งคอย จังหวัดสระบุรี', 'ที่อยู่โรงเรียน', new Date()],
    ['phone', '036-xxx-xxx', 'เบอร์โทรศัพท์ติดต่อ', new Date()],
    ['email', 'watpongkonsao@gmail.com', 'อีเมลติดต่อ', new Date()],
    ['office_hours', 'จ.-ศ. 08.00–16.30 น.', 'เวลาทำการ', new Date()],
    ['social_facebook', '', 'ลิงก์ Facebook', new Date()],
    ['social_youtube', '', 'ลิงก์ YouTube', new Date()],
    ['social_instagram', '', 'ลิงก์ Instagram', new Date()],
    ['copyright_text', '© 2569 โรงเรียนวัดโป่งก้อนเส้า · พัฒนาโดย Khunjone V.1 · สงวนลิขสิทธิ์ทุกประการ', 'ข้อความลิขสิทธิ์ท้ายเว็บ', new Date()],
    ['fb_page_id', '', 'Facebook Page ID สำหรับระบบซิงค์อัตโนมัติ', new Date()],
    ['fb_access_token', '', 'Facebook Page Access Token (Long-lived)', new Date()]
  ]);

  // 2. HeroBanner
  setupSheet(ss, SHEETS.HERO, ['ID', 'BadgeText', 'Title', 'Subtitle', 'Btn1Text', 'Btn1Link', 'Btn2Text', 'Btn2Link', 'BgImage_DriveId', 'Status', 'SortOrder'], [
    ['HERO-01', '🏫 ยินดีต้อนรับสู่เว็บไซต์โรงเรียน', 'ยินดีต้อนรับสู่<br>โรงเรียนวัดโป่งก้อนเส้า', 'Watpongkonsao School · มุ่งสู่ความเป็นเลิศ พัฒนาผู้เรียนสู่อนาคต', 'ติดตามข่าวสาร →', '#featured-section', 'ติดต่อโรงเรียน', '#footer-contact-info', '', 'Active', 1]
  ]);

  // 3. Statistics
  setupSheet(ss, SHEETS.STATS, ['ID', 'IconEmoji', 'NumberValue', 'Label', 'SortOrder', 'Status'], [
    ['STAT-01', '👨‍🎓', '-', 'นักเรียน', 1, 'Active'],
    ['STAT-02', '📚', '-', 'กลุ่มสาระ', 2, 'Active'],
    ['STAT-03', '🚪', '-', 'ห้องเรียน', 3, 'Active'],
    ['STAT-04', '👩‍🏫', '-', 'บุคลากร', 4, 'Active']
  ]);

  // 4. QuickAccess
  setupSheet(ss, SHEETS.QUICK_ACCESS, ['ID', 'IconEmoji', 'Title', 'TargetURL', 'OpenNewTab', 'SortOrder', 'Status'], [
    ['QA-01', '📰', 'ประชาสัมพันธ์', '#', 'FALSE', 1, 'Active'],
    ['QA-02', '📝', 'รับสมัครงาน', '#', 'FALSE', 2, 'Active'],
    ['QA-03', '🛒', 'จัดซื้อจ้าง', '#', 'FALSE', 3, 'Active'],
    ['QA-04', '⬇️', 'เอกสารดาวน์โหลด', '#', 'FALSE', 4, 'Active'],
    ['QA-05', '🖼️', 'ภาพกิจกรรม', '#', 'FALSE', 5, 'Active'],
    ['QA-06', '👥', 'ข้อมูลบุคลากร', '#', 'FALSE', 6, 'Active'],
    ['QA-07', '📞', 'ติดต่อโรงเรียน', '#footer-contact-info', 'FALSE', 7, 'Active'],
    ['QA-08', '🏫', 'เว็บโรงเรียนใน', '#', 'FALSE', 8, 'Active']
  ]);

  // 5. NewsArticles (เริ่มต้นแบบว่าง ไม่มี Mockup ปลอม)
  setupSheet(ss, SHEETS.NEWS, ['ArticleID', 'Category', 'CategoryBadgeClass', 'Title', 'Excerpt', 'Content', 'CoverImage_DriveId', 'DirectCoverUrl', 'IsPinned', 'PublishDate', 'Author', 'ViewCount', 'Attachment_DriveUrls', 'Status', 'Created_At'], []);

  // 6. Galleries (เริ่มต้นแบบว่าง ไม่มี Mockup ปลอม)
  setupSheet(ss, SHEETS.GALLERY, ['ID', 'Caption', 'IconEmoji', 'Image_DriveId', 'DirectViewUrl', 'EventDate', 'Category', 'SortOrder', 'Status'], []);

  // 7. Staff (เริ่มต้นแบบว่าง ไม่มี Mockup ปลอม)
  setupSheet(ss, SHEETS.STAFF, ['ID', 'FullName', 'RoleTitle', 'Department', 'AvatarEmoji', 'Photo_DriveId', 'DirectPhotoUrl', 'Email', 'Phone', 'SortOrder', 'Status'], []);

  // 8. NavMenu
  setupSheet(ss, SHEETS.NAV, ['ID', 'Label', 'URL', 'ParentID', 'SortOrder', 'Status'], [
    ['NAV-01', '🏠 หน้าแรก', '#', '', 1, 'Active'],
    ['NAV-02', 'เกี่ยวกับโรงเรียน ▾', '#', '', 2, 'Active'],
    ['NAV-03', 'บุคลากร ▾', '#', '', 3, 'Active'],
    ['NAV-04', 'ข่าวสาร ▾', '#', '', 4, 'Active'],
    ['NAV-05', 'ภาพกิจกรรม', '#', '', 5, 'Active'],
    ['NAV-06', 'สาวิทยบัณฑิต', '#', '', 6, 'Active'],
    ['NAV-07', 'เว็บโรงเรียน', '#', '', 7, 'Active'],
    ['NAV-08', 'ติดต่อเรา', '#', '', 8, 'Active']
  ]);

  // 9. FooterLinks
  setupSheet(ss, SHEETS.FOOTER, ['ID', 'Group', 'Label', 'URL', 'SortOrder', 'Status'], [
    ['FL-01', 'ลิงก์ด่วน', 'หน้าแรก', '#', 1, 'Active'],
    ['FL-02', 'ลิงก์ด่วน', 'เกี่ยวกับโรงเรียน', '#', 2, 'Active'],
    ['FL-03', 'ลิงก์ด่วน', 'บุคลากร', '#', 3, 'Active'],
    ['FL-04', 'ลิงก์ด่วน', 'ข่าวสาร', '#', 4, 'Active'],
    ['FL-05', 'ลิงก์ด่วน', 'ภาพกิจกรรม', '#', 5, 'Active'],
    ['FL-06', 'ลิงก์ด่วน', 'ติดต่อเรา', '#', 6, 'Active'],
    ['FL-07', 'สำหรับผู้ปกครอง', 'สมัครเรียน', '#', 1, 'Active'],
    ['FL-08', 'สำหรับผู้ปกครอง', 'ตรวจสอบผลการเรียน', '#', 2, 'Active'],
    ['FL-09', 'สำหรับผู้ปกครอง', 'ปฏิทินการศึกษา', '#', 3, 'Active'],
    ['FL-10', 'สำหรับผู้ปกครอง', 'ข้อมูลค่าใช้จ่าย', '#', 4, 'Active'],
    ['FL-11', 'สำหรับผู้ปกครอง', 'เข้าสู่ระบบผู้ปกครอง', '#', 5, 'Active']
  ]);

  // 10. ContactSubmissions
  setupSheet(ss, SHEETS.CONTACT, ['ID', 'SenderName', 'Email', 'Phone', 'Subject', 'Message', 'Submitted_At', 'Status'], []);

  // ลบ Sheet1 หรือ ชีต1 เริ่มต้นออกถ้ามี เพื่อให้ตารางเป็นระเบียบ
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('ชีต1') || ss.getSheetByName('แผ่นงาน1');
  if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {}
  }

  clearAllCache();
  Logger.log('สร้างฐานข้อมูลทั้ง 10 ตารางใน Google Sheets เสร็จสมบูรณ์!');
}

// ==============================================================================
// 6. HELPER UTILITIES
// ==============================================================================

function getKeyValueData(sheet) {
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const obj = {};
  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    const val = data[i][1];
    if (key) obj[key] = val;
  }
  return obj;
}

function getTableData(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = {};
    headers.forEach((h, col) => {
      item[h] = row[col];
    });
    list.push(item);
  }
  return list;
}

function deleteRowById(sheetName, idColName, idValue, successMsg) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const idCol = data[0].indexOf(idColName);

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == idValue) {
      sheet.deleteRow(i + 1);
      clearAllCache();
      return jsonResponse({ success: true, message: successMsg });
    }
  }
  return jsonResponse({ error: 'ไม่พบรายการที่ต้องการลบ: ' + idValue }, 404);
}

function getOrCreateTargetFolder(category) {
  let folderName = DRIVE_FOLDERS.NEWS;
  if (category === 'gallery') folderName = DRIVE_FOLDERS.GALLERY;
  else if (category === 'staff') folderName = DRIVE_FOLDERS.STAFF;
  else if (category === 'banners') folderName = DRIVE_FOLDERS.BANNERS;
  else if (category === 'docs') folderName = DRIVE_FOLDERS.DOCS;

  const rootFolders = DriveApp.getFoldersByName(DRIVE_FOLDERS.ROOT);
  let root = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(DRIVE_FOLDERS.ROOT);

  const subFolders = root.getFoldersByName(folderName);
  let target = subFolders.hasNext() ? subFolders.next() : root.createFolder(folderName);

  return target;
}

function clearAllCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(CACHE_KEY);
  } catch (e) {
    Logger.log('Cache clear failed: ' + e);
  }
}

function jsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
