/**
 * ==============================================================================
 * JavaScript ควบคุมระบบหลังบ้าน Admin Dashboard
 * โรงเรียนวัดโป่งก้อนเส้า - Watpongkonsao School
 * ==============================================================================
 */

const ADMIN_CONFIG = {
    PIN: 'admin1234',
    CACHE_KEY: 'SCHOOL_LOCAL_CACHE_V1',
    API_URL: localStorage.getItem('SCHOOL_API_URL') || ''
};

// ฐานข้อมูลเริ่มต้นสำหรับโรงเรียนวัดโป่งก้อนเส้า
const FALLBACK_DB = {
    settings: {
        school_name_th: 'โรงเรียนวัดโป่งก้อนเส้า',
        school_name_en: 'Watpongkonsao School',
        school_motto: 'มุ่งสู่ความเป็นเลิศ พัฒนาผู้เรียนสู่อนาคต',
        school_logo_abbr: 'ป.ก.ส.',
        school_logo_url: '',
        address: 'หมู่ 5 บ้านโป่งก้อนเส้า ตำบลท่ามะปราง อำเภอแก่งคอย จังหวัดสระบุรี',
        phone: '036-xxx-xxx',
        email: 'watpongkonsao@gmail.com',
        office_hours: 'จ.-ศ. 08.00–16.30 น.',
        social_facebook: '',
        social_youtube: '',
        social_instagram: '',
        copyright_text: '© 2569 โรงเรียนวัดโป่งก้อนเส้า · พัฒนาโดย Khunjone V.1 · สงวนลิขสิทธิ์ทุกประการ'
    },
    hero: [
        {
            BadgeText: '🏫 ยินดีต้อนรับสู่เว็บไซต์โรงเรียน',
            Title: 'ยินดีต้อนรับสู่<br>โรงเรียนวัดโป่งก้อนเส้า',
            Subtitle: 'Watpongkonsao School · มุ่งสู่ความเป็นเลิศ พัฒนาผู้เรียนสู่อนาคต',
            Btn1Text: 'รู้จักเรา →',
            Btn1Link: '#featured-section',
            Btn2Text: 'ติดต่อโรงเรียน',
            Btn2Link: '#footer-contact-info'
        }
    ],
    stats: [
        { IconEmoji: '👨‍🎓', NumberValue: '-', Label: 'นักเรียน' },
        { IconEmoji: '📚', NumberValue: '-', Label: 'กลุ่มสาระ' },
        { IconEmoji: '🚪', NumberValue: '-', Label: 'ห้องเรียน' },
        { IconEmoji: '👩‍🏫', NumberValue: '-', Label: 'บุคลากร' }
    ],
    quickAccess: [
        { IconEmoji: '📰', Title: 'ประชาสัมพันธ์', TargetURL: '#' },
        { IconEmoji: '📝', Title: 'รับสมัครงาน', TargetURL: '#' },
        { IconEmoji: '🛒', Title: 'จัดซื้อจ้าง', TargetURL: '#' },
        { IconEmoji: '⬇️', Title: 'เอกสารดาวน์โหลด', TargetURL: '#' },
        { IconEmoji: '🖼️', Title: 'ภาพกิจกรรม', TargetURL: '#' },
        { IconEmoji: '👥', Title: 'ข้อมูลบุคลากร', TargetURL: '#' },
        { IconEmoji: '📞', Title: 'ติดต่อโรงเรียน', TargetURL: '#footer-contact-info' },
        { IconEmoji: '🏫', Title: 'เว็บโรงเรียนใน', TargetURL: '#' }
    ],
    featuredNews: null,
    latestNews: [],
    gallery: [],
    staff: [],
    contacts: []
};

let db = { ...FALLBACK_DB };

// ==============================================================================
// 1. ตรวจสอบการเข้าสู่ระบบ (Authentication)
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthSession();
    loadLocalDatabase();
    initUI();
    if (ADMIN_CONFIG.API_URL) {
        syncDataWithBackend(false);
    }
});

function checkAuthSession() {
    const isAuth = sessionStorage.getItem('ADMIN_AUTH') === 'true';
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
        authScreen.style.display = isAuth ? 'none' : 'flex';
    }
}

window.verifyAdminLogin = function () {
    const input = document.getElementById('login-pin-input');
    if (input && input.value === ADMIN_CONFIG.PIN) {
        sessionStorage.setItem('ADMIN_AUTH', 'true');
        document.getElementById('auth-screen').style.display = 'none';
        showToast('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับผู้ดูแลระบบ', 'success');
        input.value = '';
    } else {
        showToast('รหัสผ่าน PIN ไม่ถูกต้อง (Default: admin1234)', 'error');
    }
};

window.adminLogout = function () {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        sessionStorage.removeItem('ADMIN_AUTH');
        checkAuthSession();
    }
};

// ==============================================================================
// 2. การจัดการฐานข้อมูลและสลับแท็บ
// ==============================================================================
function loadLocalDatabase() {
    const local = localStorage.getItem(ADMIN_CONFIG.CACHE_KEY);
    if (local) {
        try {
            const parsed = JSON.parse(local);
            db = { ...FALLBACK_DB, ...parsed };
            if (parsed.settings) db.settings = { ...FALLBACK_DB.settings, ...parsed.settings };
        } catch (e) {
            db = { ...FALLBACK_DB };
        }
    } else {
        db = { ...FALLBACK_DB };
        saveLocalDatabase();
    }
}

function saveLocalDatabase() {
    localStorage.setItem(ADMIN_CONFIG.CACHE_KEY, JSON.stringify(db));
}

window.navigateTab = function (tabId, clickedBtn) {
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));

    const targetPane = document.getElementById(`pane-${tabId}`);
    if (targetPane) targetPane.style.display = 'block';

    const btn = clickedBtn || document.querySelector(`.sidebar-nav .nav-link[onclick*="'${tabId}'"]`);
    if (btn) {
        btn.classList.add('active');
        const titleElem = document.getElementById('current-page-title');
        if (titleElem) titleElem.textContent = btn.textContent;
    }

    if (tabId === 'facebook') {
        loadFacebookSettings();
    } else if (tabId === 'news') {
        renderNewsTable();
    } else if (tabId === 'gallery') {
        renderGalleryTable();
    } else if (tabId === 'staff') {
        renderStaffTable();
    } else if (tabId === 'contact') {
        loadContacts();
        renderContactTable();
    } else if (tabId === 'overview') {
        renderOverviewMetrics();
    }
};

function initUI() {
    updateApiStatusIndicator();
    renderOverviewMetrics();
    fillSettingsForm();
    fillHeroForm();
    renderStatsInputs();
    renderQuickInputs();
    renderNewsTable();
    renderGalleryTable();
    renderStaffTable();
    renderContactTable();
    initNewsFilePreview();
    loadFacebookSettings();
    loadContacts();
}

function updateApiStatusIndicator() {
    const pill = document.getElementById('top-api-status');
    const inputUrl = document.getElementById('input-api-url');
    if (inputUrl) inputUrl.value = ADMIN_CONFIG.API_URL;

    if (pill) {
        if (ADMIN_CONFIG.API_URL) {
            pill.className = 'status-pill pill-online';
            pill.innerHTML = '🟢 เชื่อมต่อกับ Google Apps Script แล้ว';
        } else {
            pill.className = 'status-pill pill-offline';
            pill.innerHTML = '🟡 โหมดจำลองในเบราว์เซอร์ (ยังไม่ใส่ URL)';
        }
    }
}

function renderOverviewMetrics() {
    document.getElementById('metric-news-count').textContent = (db.latestNews || []).length;
    document.getElementById('metric-gallery-count').textContent = (db.gallery || []).length;
    document.getElementById('metric-staff-count').textContent = (db.staff || []).length;
    document.getElementById('metric-contact-count').textContent = (db.contacts || []).length;
}

// ==============================================================================
// 3. จัดการ SITE SETTINGS (ข้อมูลโรงเรียน)
// ==============================================================================
function fillSettingsForm() {
    const s = db.settings || {};
    document.getElementById('set-school-name-th').value = s.school_name_th || '';
    document.getElementById('set-school-name-en').value = s.school_name_en || '';
    document.getElementById('set-school-motto').value = s.school_motto || '';
    document.getElementById('set-school-logo-abbr').value = s.school_logo_abbr || '';
    document.getElementById('set-school-logo-url').value = s.school_logo_url || '';
    document.getElementById('set-address').value = s.address || '';
    document.getElementById('set-phone').value = s.phone || '';
    document.getElementById('set-email').value = s.email || '';
    document.getElementById('set-office-hours').value = s.office_hours || '';
    document.getElementById('set-facebook').value = s.social_facebook || '';
    document.getElementById('set-youtube').value = s.social_youtube || '';
    document.getElementById('set-instagram').value = s.social_instagram || '';
    document.getElementById('set-copyright').value = s.copyright_text || '';
}

window.saveSiteSettings = async function () {
    const s = {
        school_name_th: document.getElementById('set-school-name-th').value.trim(),
        school_name_en: document.getElementById('set-school-name-en').value.trim(),
        school_motto: document.getElementById('set-school-motto').value.trim(),
        school_logo_abbr: document.getElementById('set-school-logo-abbr').value.trim(),
        school_logo_url: document.getElementById('set-school-logo-url').value.trim(),
        address: document.getElementById('set-address').value.trim(),
        phone: document.getElementById('set-phone').value.trim(),
        email: document.getElementById('set-email').value.trim(),
        office_hours: document.getElementById('set-office-hours').value.trim(),
        social_facebook: document.getElementById('set-facebook').value.trim(),
        social_youtube: document.getElementById('set-youtube').value.trim(),
        social_instagram: document.getElementById('set-instagram').value.trim(),
        copyright_text: document.getElementById('set-copyright').value.trim()
    };

    db.settings = s;
    saveLocalDatabase();

    // บันทึกไปยัง Google Sheets
    if (ADMIN_CONFIG.API_URL) {
        try {
            await fetch(ADMIN_CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'updateSettings', settings: s })
            });
        } catch (e) {
            console.error('GAS updateSettings error:', e);
        }
    }

    showToast('บันทึกข้อมูลโรงเรียนเรียบร้อยแล้ว!', 'success');
};

// ==============================================================================
// 4. จัดการ HERO BANNER
// ==============================================================================
function fillHeroForm() {
    const h = (db.hero && db.hero[0]) || {};
    document.getElementById('hero-in-badge').value = h.BadgeText || '';
    document.getElementById('hero-in-title').value = h.Title || '';
    document.getElementById('hero-in-subtitle').value = h.Subtitle || '';
    document.getElementById('hero-in-btn1-text').value = h.Btn1Text || '';
    document.getElementById('hero-in-btn1-link').value = h.Btn1Link || '';
    document.getElementById('hero-in-btn2-text').value = h.Btn2Text || '';
    document.getElementById('hero-in-btn2-link').value = h.Btn2Link || '';
}

window.saveHeroBanner = async function () {
    const heroData = {
        BadgeText: document.getElementById('hero-in-badge').value.trim(),
        Title: document.getElementById('hero-in-title').value.trim(),
        Subtitle: document.getElementById('hero-in-subtitle').value.trim(),
        Btn1Text: document.getElementById('hero-in-btn1-text').value.trim(),
        Btn1Link: document.getElementById('hero-in-btn1-link').value.trim(),
        Btn2Text: document.getElementById('hero-in-btn2-text').value.trim(),
        Btn2Link: document.getElementById('hero-in-btn2-link').value.trim()
    };

    db.hero = [heroData];
    saveLocalDatabase();

    if (ADMIN_CONFIG.API_URL) {
        try {
            await fetch(ADMIN_CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'updateHero', hero: heroData })
            });
        } catch (e) {
            console.error('GAS updateHero error:', e);
        }
    }

    showToast('บันทึกข้อมูลแบนเนอร์เรียบร้อยแล้ว!', 'success');
};

// ==============================================================================
// 5. จัดการ STATISTICS (สถิติ 4 ช่อง)
// ==============================================================================
function renderStatsInputs() {
    const container = document.getElementById('stats-inputs-container');
    if (!container) return;

    const stats = db.stats || [];
    container.innerHTML = stats.map((st, i) => `
        <div style="background:var(--gray-50); padding:16px; border-radius:var(--radius); border:1px solid var(--gray-200);">
            <div style="font-weight:700; color:var(--navy); margin-bottom:10px;">กล่องสถิติที่ ${i + 1}</div>
            <div class="form-grid-3">
                <div class="form-group" style="margin-bottom:0;">
                    <label>ไอคอน</label>
                    <input type="text" id="stat-icon-${i}" value="${st.IconEmoji || '📊'}">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label>ตัวเลข</label>
                    <input type="text" id="stat-num-${i}" value="${st.NumberValue || '-'}">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label>ข้อความกำกับ</label>
                    <input type="text" id="stat-label-${i}" value="${st.Label || ''}">
                </div>
            </div>
        </div>
    `).join('');
}

window.saveStats = async function () {
    const newStats = [];
    for (let i = 0; i < 4; i++) {
        const icon = document.getElementById(`stat-icon-${i}`)?.value || '📊';
        const num = document.getElementById(`stat-num-${i}`)?.value || '-';
        const label = document.getElementById(`stat-label-${i}`)?.value || '';
        newStats.push({ IconEmoji: icon, NumberValue: num, Label: label, SortOrder: i + 1, Status: 'Active' });
    }
    db.stats = newStats;
    saveLocalDatabase();

    if (ADMIN_CONFIG.API_URL) {
        try {
            await fetch(ADMIN_CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'updateStats', stats: newStats })
            });
        } catch (e) {
            console.error('GAS updateStats error:', e);
        }
    }

    showToast('บันทึกข้อมูลสถิติ 4 ช่องเรียบร้อยแล้ว!', 'success');
};

// ==============================================================================
// 6. จัดการ QUICK ACCESS (ทางลัดด่วน)
// ==============================================================================
function renderQuickInputs() {
    const container = document.getElementById('quick-inputs-container');
    if (!container) return;

    const items = db.quickAccess || [];
    container.innerHTML = items.map((q, i) => `
        <div style="background:var(--gray-50); padding:14px; border-radius:var(--radius); border:1px solid var(--gray-200);">
            <div class="form-grid-3">
                <div class="form-group" style="margin-bottom:0; max-width:80px;">
                    <label>ไอคอน</label>
                    <input type="text" id="qa-icon-${i}" value="${q.IconEmoji || '📌'}">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label>ชื่อบริการ</label>
                    <input type="text" id="qa-title-${i}" value="${q.Title || ''}">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label>ลิงก์ URL</label>
                    <input type="text" id="qa-url-${i}" value="${q.TargetURL || '#'}">
                </div>
            </div>
        </div>
    `).join('');
}

window.saveQuickAccess = async function () {
    const newQA = [];
    const items = db.quickAccess || [];
    for (let i = 0; i < items.length; i++) {
        const icon = document.getElementById(`qa-icon-${i}`)?.value || '📌';
        const title = document.getElementById(`qa-title-${i}`)?.value || '';
        const url = document.getElementById(`qa-url-${i}`)?.value || '#';
        newQA.push({ IconEmoji: icon, Title: title, TargetURL: url, SortOrder: i + 1, Status: 'Active' });
    }
    db.quickAccess = newQA;
    saveLocalDatabase();

    if (ADMIN_CONFIG.API_URL) {
        try {
            await fetch(ADMIN_CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'updateQuickAccess', quickAccess: newQA })
            });
        } catch (e) {
            console.error('GAS updateQuickAccess error:', e);
        }
    }

    showToast('บันทึกทางลัดด่วนเรียบร้อยแล้ว!', 'success');
};

// ==============================================================================
// 7. จัดการ NEWS ARTICLES (ข่าวสาร & อัปโหลด Drive)
// ==============================================================================
function renderNewsTable() {
    const tbody = document.getElementById('news-table-body');
    if (!tbody) return;

    const list = db.latestNews || [];
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--gray-500);">ยังไม่มีรายการข่าวสารในระบบ กดปุ่ม "➕ เพิ่มข่าวสารใหม่" เพื่อเริ่มสร้างข่าว</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(n => `
        <tr>
            <td style="font-size:12.5px; color:var(--gray-500);">${n.PublishDate || '-'}</td>
            <td style="font-weight:600; color:var(--navy);">${n.Title || ''}</td>
            <td><span class="status-pill pill-online" style="font-size:11px;">${n.Category || 'ทั่วไป'}</span></td>
            <td>${n.IsPinned ? '📌 ใช่' : '-'}</td>
            <td>👁 ${n.ViewCount || 0}</td>
            <td style="text-align:right;">
                <button class="btn-danger-sm" onclick="deleteNewsItem('${n.ArticleID}')">ลบ</button>
            </td>
        </tr>
    `).join('');

    renderOverviewMetrics();
}

window.openAddNewsModal = function () {
    document.getElementById('form-news-modal').reset();
    document.getElementById('news-edit-id').value = '';
    openModal('modal-add-news');
};

window.submitNewsForm = async function (e) {
    e.preventDefault();

    const title = document.getElementById('news-field-title').value.trim();
    const cat = document.getElementById('news-field-category').value;
    const excerpt = document.getElementById('news-field-excerpt').value.trim();
    const content = document.getElementById('news-field-content').value.trim();
    const isPinned = document.getElementById('news-field-pinned').checked;
    const fileInput = document.getElementById('news-field-file');

    const saveBtn = document.getElementById('btn-save-news');
    saveBtn.disabled = true;
    saveBtn.textContent = 'กำลังบันทึกข้อมูล...';

    let directCoverUrl = '';
    let attachmentUrls = [];

    // อัปโหลดรูปภาพทั้งหมดลง Google Drive (สูงสุด 5 รูป)
    if (fileInput && fileInput.files.length > 0 && ADMIN_CONFIG.API_URL) {
        const files = Array.from(fileInput.files).slice(0, 5);
        for (let i = 0; i < files.length; i++) {
            try {
                saveBtn.textContent = `กำลังอัปโหลดภาพที่ ${i + 1}/${files.length} ลง Google Drive...`;
                const file = files[i];
                const base64 = await fileToBase64(file);

                const uploadRes = await fetch(ADMIN_CONFIG.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'uploadFile',
                        folderCategory: 'news',
                        fileName: file.name,
                        mimeType: file.type,
                        base64: base64
                    })
                });
                const uploadJson = await uploadRes.json();
                if (uploadJson && uploadJson.directUrl) {
                    if (i === 0) {
                        directCoverUrl = uploadJson.directUrl;
                    } else {
                        attachmentUrls.push(uploadJson.directUrl);
                    }
                }
            } catch (err) {
                console.error(`Upload image ${i + 1} error:`, err);
            }
        }
    }

    const newArticle = {
        ArticleID: 'NEWS-' + Date.now(),
        Category: cat,
        Title: title,
        Excerpt: excerpt,
        Content: content || excerpt,
        DirectCoverUrl: directCoverUrl,
        Attachment_DriveUrls: attachmentUrls.join(','),
        IsPinned: isPinned,
        PublishDate: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
        Author: 'admin',
        ViewCount: 0,
        Status: 'Published'
    };

    // ส่งบันทึกเข้า Google Sheets
    if (ADMIN_CONFIG.API_URL) {
        try {
            await fetch(ADMIN_CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'saveNews', ...newArticle })
            });
        } catch (err) {
            console.error('GAS saveNews error:', err);
        }
    }

    if (isPinned) {
        db.featuredNews = newArticle;
    }
    db.latestNews = [newArticle, ...(db.latestNews || [])];
    saveLocalDatabase();

    closeModal('modal-add-news');
    renderNewsTable();
    showToast('เพิ่มข่าวสารประชาสัมพันธ์สำเร็จแล้ว!', 'success');

    saveBtn.disabled = false;
    saveBtn.textContent = '🚀 บันทึกและเผยแพร่ข่าว';
};

window.deleteNewsItem = async function (id) {
    if (!confirm('ต้องการลบข่าวสารนี้ใช่หรือไม่?')) return;

    db.latestNews = (db.latestNews || []).filter(n => n.ArticleID !== id);
    if (db.featuredNews && db.featuredNews.ArticleID === id) {
        db.featuredNews = db.latestNews[0] || null;
    }
    saveLocalDatabase();
    renderNewsTable();

    if (ADMIN_CONFIG.API_URL) {
        fetch(ADMIN_CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'deleteNews', id: id })
        }).catch(() => {});
    }

    showToast('ลบข่าวเรียบร้อยแล้ว', 'success');
};

// ==============================================================================
// 8. จัดการ GALLERY (ภาพกิจกรรม)
// ==============================================================================
function renderGalleryTable() {
    const tbody = document.getElementById('gallery-table-body');
    if (!tbody) return;

    const list = db.gallery || [];
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--gray-500);">ยังไม่มีภาพกิจกรรม กดปุ่ม "➕ เพิ่มภาพกิจกรรมใหม่" เพื่ออัปโหลด</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(g => `
        <tr>
            <td>
                ${g.DirectViewUrl ? `<img src="${g.DirectViewUrl}" style="width:50px; height:40px; object-fit:cover; border-radius:6px;">` : '📸'}
            </td>
            <td style="font-weight:600; color:var(--navy);">${g.Caption || ''}</td>
            <td style="font-size:13px; color:var(--gray-500);">${g.EventDate || '-'}</td>
            <td style="text-align:right;">
                <button class="btn-danger-sm" onclick="deleteGalleryItem('${g.ID}')">ลบ</button>
            </td>
        </tr>
    `).join('');

    renderOverviewMetrics();
}

window.openAddGalleryModal = function () {
    document.getElementById('form-gallery-modal').reset();
    openModal('modal-add-gallery');
};

window.submitGalleryForm = async function (e) {
    e.preventDefault();
    const caption = document.getElementById('gal-field-caption').value.trim();
    const date = document.getElementById('gal-field-date').value.trim();
    const fileInput = document.getElementById('gal-field-file');

    const saveBtn = document.getElementById('btn-save-gallery');
    saveBtn.disabled = true;
    saveBtn.textContent = 'กำลังอัปโหลดภาพ...';

    let directUrl = '';
    if (fileInput && fileInput.files.length > 0 && ADMIN_CONFIG.API_URL) {
        try {
            const file = fileInput.files[0];
            const base64 = await fileToBase64(file);
            const uploadRes = await fetch(ADMIN_CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'uploadFile',
                    folderCategory: 'gallery',
                    fileName: file.name,
                    mimeType: file.type,
                    base64: base64
                })
            });
            const json = await uploadRes.json();
            if (json && json.directUrl) directUrl = json.directUrl;
        } catch (err) {
            console.error(err);
        }
    }

    const newItem = {
        ID: 'GAL-' + Date.now(),
        Caption: caption,
        DirectViewUrl: directUrl,
        EventDate: date || '2569',
        Status: 'Active'
    };

    if (ADMIN_CONFIG.API_URL) {
        fetch(ADMIN_CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'saveGallery', ...newItem })
        }).catch(() => {});
    }

    db.gallery = [newItem, ...(db.gallery || [])];
    saveLocalDatabase();
    closeModal('modal-add-gallery');
    renderGalleryTable();
    showToast('เพิ่มภาพกิจกรรมเรียบร้อยแล้ว!', 'success');

    saveBtn.disabled = false;
    saveBtn.textContent = '🚀 บันทึกภาพกิจกรรม';
};

window.deleteGalleryItem = function (id) {
    if (!confirm('ยืนยันลบภาพกิจกรรมนี้?')) return;
    db.gallery = (db.gallery || []).filter(g => g.ID !== id);
    saveLocalDatabase();
    renderGalleryTable();
    if (ADMIN_CONFIG.API_URL) {
        fetch(ADMIN_CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'deleteGallery', id: id })
        }).catch(() => {});
    }
    showToast('ลบภาพกิจกรรมเรียบร้อย', 'success');
};

// ==============================================================================
// 9. จัดการ STAFF DIRECTORY (บุคลากร)
// ==============================================================================
function renderStaffTable() {
    const tbody = document.getElementById('staff-table-body');
    if (!tbody) return;

    const list = db.staff || [];
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--gray-500);">ยังไม่มีรายชื่อบุคลากร กดปุ่ม "➕ เพิ่มข้อมูลบุคลากร" เพื่อเพิ่มข้อมูล</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(s => `
        <tr>
            <td>
                ${s.DirectPhotoUrl ? `<img src="${s.DirectPhotoUrl}" style="width:36px; height:36px; object-fit:cover; border-radius:50%;">` : (s.AvatarEmoji || '👤')}
            </td>
            <td style="font-weight:600; color:var(--navy);">${s.FullName || ''}</td>
            <td>${s.RoleTitle || ''}</td>
            <td>${s.Department || '-'}</td>
            <td style="text-align:right;">
                <button class="btn-danger-sm" onclick="deleteStaffItem('${s.ID}')">ลบ</button>
            </td>
        </tr>
    `).join('');

    renderOverviewMetrics();
}

window.openAddStaffModal = function () {
    document.getElementById('form-staff-modal').reset();
    openModal('modal-add-staff');
};

window.submitStaffForm = async function (e) {
    e.preventDefault();
    const name = document.getElementById('staff-field-name').value.trim();
    const role = document.getElementById('staff-field-role').value.trim();
    const dept = document.getElementById('staff-field-dept').value.trim();
    const fileInput = document.getElementById('staff-field-file');

    const saveBtn = document.getElementById('btn-save-staff');
    saveBtn.disabled = true;
    saveBtn.textContent = 'กำลังบันทึกข้อมูล...';

    let directUrl = '';
    if (fileInput && fileInput.files.length > 0 && ADMIN_CONFIG.API_URL) {
        try {
            const file = fileInput.files[0];
            const base64 = await fileToBase64(file);
            const uploadRes = await fetch(ADMIN_CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'uploadFile',
                    folderCategory: 'staff',
                    fileName: file.name,
                    mimeType: file.type,
                    base64: base64
                })
            });
            const json = await uploadRes.json();
            if (json && json.directUrl) directUrl = json.directUrl;
        } catch (err) {
            console.error(err);
        }
    }

    const newItem = {
        ID: 'STAFF-' + Date.now(),
        FullName: name,
        RoleTitle: role,
        Department: dept,
        DirectPhotoUrl: directUrl,
        AvatarEmoji: '👤',
        Status: 'Active'
    };

    if (ADMIN_CONFIG.API_URL) {
        fetch(ADMIN_CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'saveStaff', ...newItem })
        }).catch(() => {});
    }

    db.staff = [...(db.staff || []), newItem];
    saveLocalDatabase();
    closeModal('modal-add-staff');
    renderStaffTable();
    showToast('เพิ่มข้อมูลบุคลากรเรียบร้อยแล้ว!', 'success');

    saveBtn.disabled = false;
    saveBtn.textContent = '🚀 บันทึกข้อมูลบุคลากร';
};

window.deleteStaffItem = function (id) {
    if (!confirm('ยืนยันลบข้อมูลบุคลากรนี้?')) return;
    db.staff = (db.staff || []).filter(s => s.ID !== id);
    saveLocalDatabase();
    renderStaffTable();
    if (ADMIN_CONFIG.API_URL) {
        fetch(ADMIN_CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'deleteStaff', id: id })
        }).catch(() => {});
    }
    showToast('ลบข้อมูลบุคลากรเรียบร้อย', 'success');
};

// ==============================================================================
// 10. CONTACT INQUIRIES & API CONFIG
// ==============================================================================
function renderContactTable() {
    const tbody = document.getElementById('contact-table-body');
    if (!tbody) return;

    const list = db.contacts || [];
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--gray-500);">ยังไม่มีข้อความส่งเข้ามาจากหน้าเว็บไซต์</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(c => `
        <tr>
            <td style="font-size:12px; color:var(--gray-500);">${c.Submitted_At || '-'}</td>
            <td style="font-weight:600;">${c.SenderName || ''}</td>
            <td>${c.Subject || ''}</td>
            <td style="font-size:13px;">${c.Message || ''}</td>
            <td style="font-size:12px;">${c.Phone || c.Email || '-'}</td>
        </tr>
    `).join('');
}

async function loadContacts() {
    if (!ADMIN_CONFIG.API_URL) return;
    try {
        const res = await fetch(`${ADMIN_CONFIG.API_URL}?action=getContacts`);
        const json = await res.json();
        if (json && json.success && json.items) {
            db.contacts = json.items;
            saveLocalDatabase();
            renderContactTable();
            renderOverviewMetrics();
        }
    } catch (e) {
        console.error('loadContacts error:', e);
    }
}

window.saveApiUrl = function () {
    const url = document.getElementById('input-api-url').value.trim();
    ADMIN_CONFIG.API_URL = url;
    localStorage.setItem('SCHOOL_API_URL', url);
    updateApiStatusIndicator();
    showToast('บันทึก Google Apps Script Web App URL เรียบร้อย', 'success');
};

window.testApiConnection = async function () {
    const url = document.getElementById('input-api-url').value.trim();
    if (!url) {
        showToast('กรุณาระบุ URL ก่อนทำการทดสอบ', 'error');
        return;
    }

    showToast('กำลังเชื่อมต่อทดสอบกับ Google Apps Script...', 'info');
    try {
        const res = await fetch(`${url}?action=getInitialData`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        if (json && json.success) {
            showToast('🟢 เชื่อมต่อสำเร็จ! ดึงข้อมูลจาก Google Spreadsheet ได้สมบูรณ์', 'success');
            syncDataWithBackend(true);
        } else {
            showToast('เชื่อมต่อได้แต่รูปแบบข้อมูลไม่ถูกต้อง: ' + JSON.stringify(json), 'error');
        }
    } catch (err) {
        showToast('❌ ไม่สามารถเชื่อมต่อได้: ' + err.message, 'error');
    }
};

window.syncDataWithBackend = async function (notify = true) {
    if (!ADMIN_CONFIG.API_URL) {
        if (notify) showToast('ยังไม่ได้ระบุ Web App URL', 'error');
        return;
    }

    try {
        const res = await fetch(`${ADMIN_CONFIG.API_URL}?action=getInitialData`);
        const json = await res.json();
        if (json && json.success && json.data) {
            db = { ...db, ...json.data };
            saveLocalDatabase();
            initUI();
            if (notify) showToast('อัปเดตข้อมูลล่าสุดจาก Google Sheets สำเร็จ!', 'success');
        }
        await loadContacts();
    } catch (err) {
        if (notify) showToast('ไม่สามารถดึงข้อมูลสดได้: ' + err.message, 'error');
    }
};

window.clearScriptCache = async function () {
    if (!ADMIN_CONFIG.API_URL) {
        showToast('ต้องระบุ URL ก่อนล้างแคช', 'error');
        return;
    }

    try {
        await fetch(`${ADMIN_CONFIG.API_URL}?action=clearCache`);
        showToast('สั่งล้างแคช Script CacheService บน Google สำเร็จ', 'success');
    } catch (err) {
        showToast('เกิดข้อผิดพลาดในการล้างแคช', 'error');
    }
};

window.exportDataJson = function () {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `school_backup_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('ดาวน์โหลดไฟล์สำรองข้อมูล JSON เรียบร้อยแล้ว', 'success');
};

// ==============================================================================
// 11. HELPER UTILITIES
// ==============================================================================
window.openModal = function (id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
};

window.closeModal = function (id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
};

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function showToast(msg, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${msg}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ==============================================================================
// 12. ระบบพรีวิวรูปภาพประกอบข่าวสาร (News File Preview)
// ==============================================================================
function initNewsFilePreview() {
    const fileInput = document.getElementById('news-field-file');
    const previewContainer = document.getElementById('news-file-preview');

    if (fileInput && previewContainer) {
        fileInput.addEventListener('change', function () {
            previewContainer.innerHTML = '';
            const files = this.files;

            if (files.length === 0) {
                previewContainer.style.display = 'none';
                return;
            }

            if (files.length > 5) {
                showToast('เลือกรูปภาพได้สูงสุด 5 รูปเท่านั้น', 'error');
                this.value = '';
                previewContainer.style.display = 'none';
                return;
            }

            previewContainer.style.display = 'flex';

            Array.from(files).forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const wrapper = document.createElement('div');
                    wrapper.style.cssText = 'position:relative; width:80px; height:60px; border-radius:8px; overflow:hidden; border:2px solid var(--gray-200); flex-shrink:0;';

                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
                    wrapper.appendChild(img);

                    if (index === 0) {
                        const badge = document.createElement('div');
                        badge.textContent = 'ปก';
                        badge.style.cssText = 'position:absolute; top:2px; left:2px; background:var(--gold); color:white; font-size:9px; padding:1px 5px; border-radius:4px; font-weight:700;';
                        wrapper.appendChild(badge);
                    }

                    previewContainer.appendChild(wrapper);
                };
                reader.readAsDataURL(file);
            });
        });
    }
}

// ==============================================================================
// 13. ระบบซิงค์ข้อมูลจาก Facebook (Facebook Sync Functions)
// ==============================================================================

/**
 * โหลดค่าตั้งค่า Facebook จาก Google Apps Script แสดงในแท็บ Facebook
 */
function loadFacebookSettings() {
    if (!ADMIN_CONFIG.API_URL) return;

    fetch(`${ADMIN_CONFIG.API_URL}?action=getFacebookSettings`)
        .then(res => res.json())
        .then(json => {
            if (json && json.success) {
                const pageIdInput = document.getElementById('fb-page-id');
                const tokenInput = document.getElementById('fb-access-token');

                if (pageIdInput && json.fb_page_id !== undefined) pageIdInput.value = json.fb_page_id;
                if (tokenInput) {
                    if (json.fb_has_token) {
                        tokenInput.value = json.fb_access_token;
                    } else {
                        tokenInput.value = '';
                    }
                }

                updateFacebookTriggerStatus(json.fb_trigger_active);
            }
        })
        .catch(() => { });
}

/**
 * อัปเดตสถานะ Trigger ในหน้า UI
 */
function updateFacebookTriggerStatus(isActive) {
    const pill = document.getElementById('fb-trigger-status');
    if (!pill) return;

    if (isActive) {
        pill.className = 'status-pill pill-online';
        pill.innerHTML = '🟢 ระบบซิงค์อัตโนมัติกำลังทำงาน (ทุก 1 ชม.)';
    } else {
        pill.className = 'status-pill pill-offline';
        pill.innerHTML = '🔴 ยังไม่เปิดใช้งาน';
    }
}

/**
 * บันทึก Facebook Page ID และ Access Token ไปยัง Google Sheets
 */
window.saveFacebookSettings = async function () {
    const pageId = document.getElementById('fb-page-id').value.trim();
    const token = document.getElementById('fb-access-token').value.trim();

    if (!pageId || !token) {
        showToast('กรุณากรอก Facebook Page ID และ Access Token ให้ครบ', 'error');
        return;
    }

    if (!ADMIN_CONFIG.API_URL) {
        showToast('กรุณาตั้งค่า Google Apps Script URL ก่อนในแท็บ ⚙️ API', 'error');
        return;
    }

    showToast('กำลังบันทึกการตั้งค่า Facebook...', 'info');

    try {
        const res = await fetch(ADMIN_CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'saveFacebookSettings',
                fb_page_id: pageId,
                fb_access_token: token
            })
        });
        const json = await res.json();
        if (json && json.success) {
            showToast('บันทึกการตั้งค่า Facebook เรียบร้อยแล้ว!', 'success');
        } else {
            showToast('เกิดข้อผิดพลาด: ' + (json.error || 'ไม่ทราบสาเหตุ'), 'error');
        }
    } catch (err) {
        showToast('ไม่สามารถบันทึกการตั้งค่าได้: ' + err.message, 'error');
    }
};

/**
 * เปิดระบบซิงค์อัตโนมัติ (สร้าง Trigger ทุก 1 ชั่วโมง)
 */
window.enableFacebookTrigger = async function () {
    if (!ADMIN_CONFIG.API_URL) {
        showToast('กรุณาตั้งค่า Google Apps Script URL ก่อนในแท็บ ⚙️ API', 'error');
        return;
    }

    showToast('กำลังเปิดระบบซิงค์อัตโนมัติ...', 'info');

    try {
        const res = await fetch(ADMIN_CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'setupFacebookTrigger' })
        });
        const json = await res.json();
        if (json && json.success) {
            updateFacebookTriggerStatus(true);
            showToast('เปิดระบบซิงค์อัตโนมัติจาก Facebook เรียบร้อยแล้ว!', 'success');
        } else {
            showToast('เกิดข้อผิดพลาด: ' + (json.error || ''), 'error');
        }
    } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
};

/**
 * ปิดระบบซิงค์อัตโนมัติ (ลบ Trigger)
 */
window.disableFacebookTrigger = async function () {
    if (!ADMIN_CONFIG.API_URL) {
        showToast('กรุณาตั้งค่า Google Apps Script URL ก่อนในแท็บ ⚙️ API', 'error');
        return;
    }

    if (!confirm('ต้องการปิดระบบซิงค์อัตโนมัติจาก Facebook หรือไม่?')) return;

    try {
        const res = await fetch(ADMIN_CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'removeFacebookTrigger' })
        });
        const json = await res.json();
        if (json && json.success) {
            updateFacebookTriggerStatus(false);
            showToast('ปิดระบบซิงค์อัตโนมัติเรียบร้อยแล้ว', 'success');
        } else {
            showToast('เกิดข้อผิดพลาด: ' + (json.error || ''), 'error');
        }
    } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
};

/**
 * บังคับซิงค์ข้อมูลจาก Facebook ทันที (Force Sync)
 */
window.forceSyncFacebook = async function () {
    if (!ADMIN_CONFIG.API_URL) {
        showToast('กรุณาตั้งค่า Google Apps Script URL ก่อนในแท็บ ⚙️ API', 'error');
        return;
    }

    const pageId = document.getElementById('fb-page-id').value.trim();
    if (!pageId) {
        showToast('กรุณากรอกและบันทึก Facebook Page ID ก่อนทำการซิงค์', 'error');
        return;
    }

    showToast('⏳ กำลังดึงโพสต์จาก Facebook Page... (อาจใช้เวลา 5-15 วินาที)', 'info');

    try {
        const res = await fetch(`${ADMIN_CONFIG.API_URL}?action=forceSyncFacebook`);
        const json = await res.json();
        if (json && json.success) {
            showToast('🎉 ' + (json.message || 'ซิงค์ข้อมูลจาก Facebook สำเร็จ!'), 'success');
            // รีเฟรชข้อมูลข่าวสารล่าสุด
            syncDataWithBackend(false);
            setTimeout(() => {
                renderNewsTable();
                renderOverviewMetrics();
            }, 1500);
        } else {
            showToast('เกิดข้อผิดพลาดในการซิงค์: ' + (json.message || json.error || 'ไม่สามารถซิงค์ได้'), 'error');
        }
    } catch (err) {
        showToast('ไม่สามารถเชื่อมต่อกับ Facebook ได้: ' + err.message, 'error');
    }
};
