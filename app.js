/**
 * ==============================================================================
 * JavaScript ควบคุมการทำงานและเชื่อมต่อระบบหลังบ้าน (GAS + Sheets + Drive)
 * โรงเรียนวัดโป่งก้อนเส้า - Watpongkonsao School
 * ==============================================================================
 */

// ── การตั้งค่าระบบ ──
const CONFIG = {
    API_URL: localStorage.getItem('SCHOOL_API_URL') || '',
    CACHE_KEY: 'SCHOOL_LOCAL_CACHE_V1'
};

// ── ข้อมูลเริ่มต้นของโรงเรียนวัดโป่งก้อนเส้า (ไม่มี Mockup ปลอม) ──
const DEFAULT_DATA = {
    settings: {
        school_name_th: 'โรงเรียนวัดโป่งก้อนเส้า',
        school_name_en: 'Watpongkonsao School',
        school_motto: 'เรียนดี มีวินัย ใส่ใจสิ่งแวดล้อม',
        school_logo_abbr: 'ป.ก.ส.',
        school_logo_url: '',
        address: 'หมู่ 5 บ้านโป่งก้อนเส้า ตำบลท่ามะปราง อำเภอแก่งคอย จังหวัดสระบุรี',
        phone: '036-xxx-xxx',
        email: 'watpongkonsao@gmail.com',
        office_hours: 'จ.-ศ. 08.00–16.30 น.',
        social_facebook: '#',
        social_youtube: '#',
        social_instagram: '#',
        copyright_text: '© 2569 โรงเรียนวัดโป่งก้อนเส้า · พัฒนาโดย Khunjone V.1 · สงวนลิขสิทธิ์ทุกประการ'
    },
    hero: [
        {
            BadgeText: '🏫 ยินดีต้อนรับสู่เว็บไซต์โรงเรียน',
            Title: 'ยินดีต้อนรับสู่<br>โรงเรียนวัดโป่งก้อนเส้า',
            Subtitle: 'Watpongkonsao School · เรียนดี มีวินัย ใส่ใจสิ่งแวดล้อม',
            Btn1Text: 'รู้จักเรา →',
            Btn1Link: '#',
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
        //{ IconEmoji: '📝', Title: 'รับสมัครงาน', TargetURL: '#' },
        //{ IconEmoji: '🛒', Title: 'จัดซื้อจ้าง', TargetURL: '#' },
        //{ IconEmoji: '⬇️', Title: 'เอกสารดาวน์โหลด', TargetURL: '#' },
        { IconEmoji: '🖼️', Title: 'ภาพกิจกรรม', TargetURL: '#' },
        { IconEmoji: '👥', Title: 'ข้อมูลบุคลากร', TargetURL: '#' },
        { IconEmoji: '📞', Title: 'ติดต่อโรงเรียน', TargetURL: '#footer-contact-info' },
        //{ IconEmoji: '🏫', Title: 'เว็บโรงเรียนใน', TargetURL: '#' }
    ],
    featuredNews: null,
    latestNews: [],
    gallery: [],
    staff: []
};

// ข้อมูลสถานะปัจจุบันในหน่วยความจำ
let currentSiteData = { ...DEFAULT_DATA };

// ==============================================================================
// 1. การโหลดและผสานข้อมูล (Data Hydration)
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. ตรวจสอบข้อมูลใน LocalStorage ก่อน (Stale-While-Revalidate)
    const cached = localStorage.getItem(CONFIG.CACHE_KEY);
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            currentSiteData = { ...DEFAULT_DATA, ...parsed };
            // รวม settings
            if (parsed.settings) currentSiteData.settings = { ...DEFAULT_DATA.settings, ...parsed.settings };
            renderAll(currentSiteData);
        } catch (e) {
            renderAll(DEFAULT_DATA);
        }
    } else {
        renderAll(DEFAULT_DATA);
    }

    // 2. ดึงข้อมูลสดจาก Google Apps Script API ในพื้นหลัง
    fetchLiveData();

    // 3. ผูกระบบค้นหา Live Search
    setupSearch();
});

async function fetchLiveData() {
    if (!CONFIG.API_URL) {
        console.log('📌 ยังไม่ได้ระบุ Google Apps Script Web App URL (ตั้งค่าได้ที่หน้า admin.html)');
        return;
    }

    try {
        const res = await fetch(`${CONFIG.API_URL}?action=getInitialData`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();

        if (json && json.success && json.data) {
            currentSiteData = json.data;
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(currentSiteData));
            renderAll(currentSiteData);
            console.log('✅ โหลดข้อมูลสดจาก Google Spreadsheet สำเร็จ');
        }
    } catch (err) {
        console.warn('⚠️ ไม่สามารถดึงข้อมูลจาก Google Apps Script ได้ (ใช้ข้อมูลในระบบ):', err);
    }
}

// ==============================================================================
// 2. ฟังก์ชันเรนเดอร์ข้อมูลลงในหน้าเว็บ
// ==============================================================================
function renderAll(data) {
    if (data.settings) renderSettings(data.settings);
    if (data.hero && data.hero.length > 0) renderHero(data.hero[0]);
    if (data.stats && data.stats.length > 0) renderStats(data.stats);
    if (data.quickAccess && data.quickAccess.length > 0) renderQuickAccess(data.quickAccess);
    renderFeaturedNews(data.featuredNews);
    renderNewsGrid(data.latestNews || []);
    renderGallery(data.gallery || []);
    renderStaff(data.staff || []);
}

function renderSettings(s) {
    // Title tag
    if (s.school_name_th) {
        document.title = `${s.school_name_th} - ${s.school_name_en || 'School Website'}`;
    }

    // Topbar
    const addr = document.getElementById('topbar-address');
    if (addr && s.address) addr.textContent = `📍 ${s.address}`;

    const phone = document.getElementById('topbar-phone');
    if (phone && s.phone) phone.textContent = `📞 ${s.phone}`;

    const email = document.getElementById('topbar-email');
    if (email && s.email) email.textContent = `✉️ ${s.email}`;

    // Social Links
    const linkFb = document.getElementById('link-facebook');
    if (linkFb && s.social_facebook) linkFb.href = s.social_facebook;

    const linkYt = document.getElementById('link-youtube');
    if (linkYt && s.social_youtube) linkYt.href = s.social_youtube;

    const linkIg = document.getElementById('link-instagram');
    if (linkIg && s.social_instagram) linkIg.href = s.social_instagram;

    // Header Logo & Name
    const logoAbbr = document.getElementById('logo-abbr');
    if (logoAbbr) {
        if (s.school_logo_url) {
            logoAbbr.innerHTML = `<img src="${s.school_logo_url}" alt="${s.school_logo_abbr || 'Logo'}" style="width:100%;height:100%;object-fit:contain;">`;
        } else if (s.school_logo_abbr) {
            logoAbbr.textContent = s.school_logo_abbr;
        }
    }

    const schoolTitle = document.getElementById('school-title');
    if (schoolTitle && s.school_name_th) schoolTitle.textContent = s.school_name_th;

    const schoolMotto = document.getElementById('school-motto');
    if (schoolMotto && s.school_motto) schoolMotto.textContent = s.school_motto;

    // Footer
    const footerSchoolName = document.getElementById('footer-school-name');
    if (footerSchoolName && s.school_name_th) footerSchoolName.textContent = s.school_name_th;

    const footerSchoolMotto = document.getElementById('footer-school-motto');
    if (footerSchoolMotto && s.school_motto) footerSchoolMotto.textContent = s.school_motto;

    const footerContact = document.getElementById('footer-contact-info');
    if (footerContact) {
        footerContact.innerHTML = `
            <span>📍 ${s.address || 'กำลังปรับปรุงข้อมูล'}</span>
            <span>📞 ${s.phone || '-'}</span>
            <span>✉️ ${s.email || '-'}</span>
            <span>🕐 ${s.office_hours || 'จ.-ศ. 08.00–16.30 น.'}</span>
        `;
    }

    const footerCopy = document.getElementById('footer-copyright');
    if (footerCopy && s.copyright_text) footerCopy.textContent = s.copyright_text;
}

function renderHero(h) {
    const badge = document.getElementById('hero-badge');
    if (badge && h.BadgeText) badge.textContent = h.BadgeText;

    const title = document.getElementById('hero-title');
    if (title && h.Title) title.innerHTML = h.Title;

    const sub = document.getElementById('hero-subtitle');
    if (sub && h.Subtitle) sub.textContent = h.Subtitle;

    const btn1 = document.getElementById('hero-btn1');
    if (btn1 && h.Btn1Text) {
        btn1.textContent = h.Btn1Text;
        if (h.Btn1Link) btn1.href = h.Btn1Link;
    }

    const btn2 = document.getElementById('hero-btn2');
    if (btn2 && h.Btn2Text) {
        btn2.textContent = h.Btn2Text;
        if (h.Btn2Link) btn2.href = h.Btn2Link;
    }
}

function renderStats(stats) {
    const container = document.getElementById('stats-grid');
    if (!container) return;

    container.innerHTML = stats.map(st => `
        <div class="stat-item">
            <div class="stat-icon">${st.IconEmoji || '📊'}</div>
            <div class="stat-num">${st.NumberValue || '-'}</div>
            <div class="stat-label">${st.Label || ''}</div>
        </div>
    `).join('');
}

function renderQuickAccess(items) {
    const container = document.getElementById('quick-grid');
    if (!container) return;

    container.innerHTML = items.map(q => `
        <a class="quick-item" href="${q.TargetURL || '#'}" ${q.OpenNewTab ? 'target="_blank"' : ''}>
            <div class="quick-icon"><span>${q.IconEmoji || '📌'}</span></div>
            <span class="quick-label">${q.Title || ''}</span>
        </a>
    `).join('');
}

function renderFeaturedNews(n) {
    const container = document.getElementById('featured-card-wrapper');
    if (!container) return;

    if (!n) {
        container.innerHTML = `
            <div class="featured-card" style="grid-template-columns: 1fr; padding: 40px 24px; text-align: center; background: white;">
                <div style="font-size: 36px; margin-bottom: 8px;">📌</div>
                <h3 style="font-family:'Mitr',sans-serif; color:var(--navy); font-size: 18px; margin-bottom: 6px;">ยังไม่มีข่าวสำคัญปักหมุด</h3>
                <p style="color:var(--gray-500); font-size: 13.5px;">ผู้ดูแลระบบสามารถกำหนดข่าวปักหมุดได้จากหน้าจัดการระบบ (admin.html)</p>
            </div>
        `;
        return;
    }

    const imgHtml = n.DirectCoverUrl
        ? `<img src="${n.DirectCoverUrl}" alt="${n.Title}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">`
        : '';

    container.innerHTML = `
        <div class="featured-card">
            <div class="featured-img" style="position:relative">
                ${imgHtml}
                <span class="featured-badge">📌 ปักหมุด</span>
            </div>
            <div class="featured-body">
                <div class="featured-cat">📢 ${n.Category || 'ประชาสัมพันธ์'} · ${n.PublishDate || ''}</div>
                <div class="featured-title">${n.Title || ''}</div>
                <div class="featured-desc">${n.Excerpt || ''}</div>
                <div class="featured-meta">
                    <span>👤 ${n.Author || 'admin'}</span>
                    <span>👁 <span>${n.ViewCount || 0}</span> ครั้ง</span>
                </div>
                <button class="read-more" onclick="openNewsModal('${n.ArticleID}')">อ่านต่อ →</button>
            </div>
        </div>
    `;
}

function renderNewsGrid(newsList) {
    const container = document.getElementById('news-grid');
    if (!container) return;

    if (newsList.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: white; border-radius: var(--radius); border: 1.5px dashed var(--gray-200);">
                <div style="font-size: 40px; margin-bottom: 10px;">📰</div>
                <h4 style="font-family:'Mitr',sans-serif; font-size: 17px; color: var(--navy); margin-bottom: 6px;">ยังไม่มีรายการข่าวสารประชาสัมพันธ์</h4>
                <p style="font-size: 13.5px; color: var(--gray-500);">คุณสามารถเพิ่มข่าวสารใหม่พร้อมอัปโหลดภาพปกผ่านหน้าแผงควบคุมระบบหลังบ้าน</p>
                <a href="admin.html" class="btn-outline-navy" style="margin-top: 16px; display: inline-flex;">เข้าสู่ระบบเพื่อเพิ่มข่าว →</a>
            </div>
        `;
        return;
    }

    const badgeMap = {
        'ประชาสัมพันธ์': 'cat-news',
        'ข่าวกิจกรรม': 'cat-activity',
        'จัดซื้อจ้าง': 'cat-procurement',
        'รับสมัครงาน': 'cat-job',
        'ผลงานนักเรียน': 'cat-academic'
    };

    container.innerHTML = newsList.map(n => {
        const badgeClass = n.CategoryBadgeClass || badgeMap[n.Category] || 'cat-news';
        const coverHtml = n.DirectCoverUrl
            ? `<img src="${n.DirectCoverUrl}" alt="${n.Title}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">`
            : '';

        return `
            <div class="news-card">
                <div class="news-img" style="position:relative; background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%);">
                    ${coverHtml}
                    <span class="news-cat-badge ${badgeClass}">${n.Category || 'ข่าวสาร'}</span>
                </div>
                <div class="news-body">
                    <div class="news-meta">
                        <span>📅 ${n.PublishDate || ''}</span>
                        <span>👁 ${n.ViewCount || 0} อ่าน</span>
                    </div>
                    <div class="news-title">${n.Title || ''}</div>
                    <div class="news-excerpt">${n.Excerpt || ''}</div>
                    <div class="news-footer">
                        <span class="news-author"><span class="author-avatar">👤</span>${n.Author || 'admin'}</span>
                        <button class="news-link" onclick="openNewsModal('${n.ArticleID}')">อ่านต่อ →</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderGallery(items) {
    const container = document.getElementById('gallery-grid');
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: white; border-radius: var(--radius); border: 1.5px dashed var(--gray-200);">
                <div style="font-size: 36px; margin-bottom: 8px;">📸</div>
                <p style="font-size: 14px; color: var(--gray-500);">ยังไม่มีภาพกิจกรรมในระบบ (เพิ่มได้ที่หน้า admin.html)</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(g => {
        const imgHtml = g.DirectViewUrl
            ? `<img src="${g.DirectViewUrl}" alt="${g.Caption}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">`
            : (g.IconEmoji || '🖼️');

        return `
            <div class="gallery-item">
                ${imgHtml}
                <div class="gallery-caption">${g.Caption || ''}</div>
            </div>
        `;
    }).join('');
}

function renderStaff(staffList) {
    const container = document.getElementById('staff-grid');
    if (!container) return;

    if (staffList.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: white; border-radius: var(--radius); border: 1.5px dashed var(--gray-200);">
                <div style="font-size: 36px; margin-bottom: 8px;">👥</div>
                <p style="font-size: 14px; color: var(--gray-500);">ยังไม่มีข้อมูลบุคลากรในระบบ (เพิ่มได้ที่หน้า admin.html)</p>
            </div>
        `;
        return;
    }

    container.innerHTML = staffList.map(s => {
        const avatarHtml = s.DirectPhotoUrl
            ? `<img src="${s.DirectPhotoUrl}" alt="${s.FullName}" style="width:100%;height:100%;object-fit:cover;">`
            : (s.AvatarEmoji || '👨‍💼');

        return `
            <div class="staff-card">
                <div class="staff-avatar">${avatarHtml}</div>
                <div class="staff-name">${s.FullName || ''}</div>
                <div class="staff-role">${s.RoleTitle || ''}</div>
            </div>
        `;
    }).join('');
}

// ==============================================================================
// 3. โมดอลอ่านข่าวฉบับเต็ม & เพิ่มยอดวิว
// ==============================================================================
window.openNewsModal = async function (id) {
    const modal = document.getElementById('news-modal');
    if (!modal) return;

    let item = null;
    if (currentSiteData.featuredNews && currentSiteData.featuredNews.ArticleID === id) {
        item = currentSiteData.featuredNews;
    } else if (currentSiteData.latestNews) {
        item = currentSiteData.latestNews.find(n => n.ArticleID === id);
    }

    if (!item) {
        alert('ไม่พบเนื้อหาข่าวที่เลือก');
        return;
    }

    document.getElementById('modal-news-title').textContent = item.Title || '';
    document.getElementById('modal-news-meta').innerHTML = `
        <span>📂 ${item.Category || 'ข่าวสาร'}</span>
        <span>📅 ${item.PublishDate || ''}</span>
        <span>👤 ${item.Author || 'admin'}</span>
        <span>👁 <span id="modal-view-count">${(item.ViewCount || 0) + 1}</span> เข้าชม</span>
    `;

    const imgWrap = document.getElementById('modal-news-img-wrap');
    if (imgWrap) {
        const attachmentUrls = (item.Attachment_DriveUrls || '').split(',').map(u => u.trim()).filter(Boolean);
        if (attachmentUrls.length > 1) {
            imgWrap.innerHTML = `
                <img src="${attachmentUrls[0]}" class="modal-news-img" alt="${item.Title}">
                <div style="display:flex; gap:8px; margin-top:8px; margin-bottom:18px; overflow-x:auto;">
                    ${attachmentUrls.map((url, i) => `
                        <img src="${url}" alt="รูปที่ ${i + 1}" style="width:72px; height:54px; object-fit:cover; border-radius:6px; cursor:pointer; border:2px solid ${i === 0 ? 'var(--navy)' : 'var(--gray-200)'}; flex-shrink:0;" onclick="this.parentElement.previousElementSibling.src='${url}'; this.parentElement.querySelectorAll('img').forEach(el=>el.style.borderColor='var(--gray-200)'); this.style.borderColor='var(--navy)';">
                    `).join('')}
                </div>
            `;
            imgWrap.style.display = 'block';
        } else if (item.DirectCoverUrl) {
            imgWrap.innerHTML = `<img src="${item.DirectCoverUrl}" class="modal-news-img" alt="${item.Title}">`;
            imgWrap.style.display = 'block';
        } else {
            imgWrap.style.display = 'none';
        }
    }

    document.getElementById('modal-news-body').textContent = item.Content || item.Excerpt || '';

    // เพิ่มยอดวิวในหน่วยความจำ
    item.ViewCount = (item.ViewCount || 0) + 1;

    // เรียก API หลังบ้านเพื่อบันทึกยอดวิว +1 ใน Google Sheets
    if (CONFIG.API_URL) {
        fetch(`${CONFIG.API_URL}?action=getNewsDetail&id=${id}`).catch(() => { });
    }

    modal.classList.add('active');
};

window.closeNewsModal = function () {
    const modal = document.getElementById('news-modal');
    if (modal) modal.classList.remove('active');
};

// ==============================================================================
// 4. ระบบค้นหาแบบเรียลไทม์ (Live Search)
// ==============================================================================
function setupSearch() {
    const searchInput = document.getElementById('site-search-input');
    const dropdown = document.getElementById('search-dropdown');

    if (searchInput && dropdown) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.trim().toLowerCase();
            if (!val) {
                dropdown.classList.remove('active');
                dropdown.innerHTML = '';
                return;
            }

            const newsMatches = (currentSiteData.latestNews || []).filter(n =>
                (n.Title || '').toLowerCase().includes(val) || (n.Excerpt || '').toLowerCase().includes(val)
            );

            const staffMatches = (currentSiteData.staff || []).filter(s =>
                (s.FullName || '').toLowerCase().includes(val) || (s.RoleTitle || '').toLowerCase().includes(val)
            );

            if (newsMatches.length === 0 && staffMatches.length === 0) {
                dropdown.innerHTML = '<div style="padding:16px;text-align:center;color:#8892b0;font-size:13px">ไม่พบข้อมูลที่ค้นหา</div>';
            } else {
                let html = '';
                if (newsMatches.length > 0) {
                    html += '<div class="search-group-title">ข่าวสารและประกาศ</div>';
                    newsMatches.slice(0, 4).forEach(n => {
                        html += `
                            <div class="search-result-item" onclick="openNewsModal('${n.ArticleID}'); document.getElementById('search-dropdown').classList.remove('active');">
                                <div class="search-thumb">📰</div>
                                <div class="search-info">
                                    <div class="search-title">${n.Title}</div>
                                    <div class="search-sub">${n.Category} · ${n.PublishDate}</div>
                                </div>
                            </div>
                        `;
                    });
                }
                if (staffMatches.length > 0) {
                    html += '<div class="search-group-title">บุคลากร</div>';
                    staffMatches.slice(0, 4).forEach(s => {
                        html += `
                            <div class="search-result-item">
                                <div class="search-thumb">${s.AvatarEmoji || '👤'}</div>
                                <div class="search-info">
                                    <div class="search-title">${s.FullName}</div>
                                    <div class="search-sub">${s.RoleTitle}</div>
                                </div>
                            </div>
                        `;
                    });
                }
                dropdown.innerHTML = html;
            }
            dropdown.classList.add('active');
        });

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }
}

// ==============================================================================
// 5. ฟอร์มติดต่อเรา (Contact Form Submission)
// ==============================================================================
window.submitContactForm = async function (e) {
    e.preventDefault();

    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const subject = document.getElementById('contact-subject').value.trim();
    const message = document.getElementById('contact-message').value.trim();

    const submitBtn = document.getElementById('btn-submit-contact');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ กำลังส่งข้อความ...';

    // บันทึกลง Google Sheets ผ่าน API
    if (CONFIG.API_URL) {
        try {
            const res = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'saveContact',
                    name: name,
                    email: email,
                    phone: phone,
                    subject: subject,
                    message: message
                })
            });
            const json = await res.json();
            if (!json || !json.success) {
                console.warn('saveContact response:', json);
            }
        } catch (err) {
            console.error('Contact form submit error:', err);
        }
    }

    // แสดงข้อความสำเร็จ
    document.getElementById('contact-form').style.display = 'none';
    document.getElementById('contact-success').style.display = 'block';

    submitBtn.disabled = false;
    submitBtn.textContent = '📨 ส่งข้อความ';
};

window.resetContactForm = function () {
    document.getElementById('contact-form').reset();
    document.getElementById('contact-form').style.display = 'block';
    document.getElementById('contact-success').style.display = 'none';
};
