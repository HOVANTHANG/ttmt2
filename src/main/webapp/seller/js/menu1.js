const exceptionCode = 417;
var token = localStorage.getItem("token");

$(document).ready(function () {
    // Always ensure sidebar starts open — clear any stale state
    localStorage.removeItem('sb|sidebar-toggle');
    document.body.classList.remove('sb-sidenav-toggled');

    checkroleSeller();
    loadmenu();
    loadtop();

    function loadmenu() {
        const currentPath = window.location.pathname;
        function active(path) { return currentPath.includes(path) ? 'active' : ''; }

        var content = `
            <a class="nav-link ${active('/seller/index')}" href="/seller/index">
                <div class="sb-nav-link-icon"><i class="fas fa-chart-line"></i></div>Tổng quan
            </a>
            <div class="sb-sidenav-menu-heading">Quản lý</div>
            <a class="nav-link ${active('/seller/product')}" href="/seller/product">
                <div class="sb-nav-link-icon"><i class="fas fa-box-open"></i></div>Sản phẩm
            </a>
            <a class="nav-link ${active('/seller/invoice')}" href="/seller/invoice" id="menuSellerInvoice">
                <div class="sb-nav-link-icon"><i class="fas fa-receipt"></i></div>Đơn hàng
                <span id="sellerPendingOrderBadge" style="
                    display:none;background:#ef4444;color:#fff;
                    font-size:10px;font-weight:700;border-radius:999px;
                    padding:1px 7px;margin-left:6px;vertical-align:middle;
                ">0</span>
            </a>
            <a class="nav-link ${active('/seller/voucher')}" href="/seller/voucher">
                <div class="sb-nav-link-icon"><i class="fas fa-tags"></i></div>Voucher
            </a>
            <a class="nav-link ${active('/seller/diachi')}" href="/seller/diachi">
                <div class="sb-nav-link-icon"><i class="fas fa-map-marker-alt"></i></div>Địa chỉ kho
            </a>
            <div class="sb-sidenav-menu-heading">Hỗ trợ</div>
            <a class="nav-link ${active('/seller/seller-chat')}" href="/seller/seller-chat" id="menuSellerChat">
                <div class="sb-nav-link-icon"><i class="fas fa-comments"></i></div>Tin nhắn
                <span id="sellerUnreadChatBadge" style="
                    display:none;background:#ef4444;color:#fff;
                    font-size:10px;font-weight:700;border-radius:999px;
                    padding:1px 7px;margin-left:6px;vertical-align:middle;
                ">0</span>
            </a>
        
            <a onclick="dangXuat()" class="nav-link" href="#">
                <div class="sb-nav-link-icon"><i class="fas fa-sign-out-alt"></i></div>Đăng xuất
            </a>`;

        var menu = `
            <nav class="sb-sidenav accordion sb-sidenav-dark" id="sidenavAccordion">
                <div class="sb-sidenav-menu">
                    <div class="nav flex-column">
                        <div class="seller-brand-header">
                            <div class="seller-brand-logo"><i class="fas fa-store-alt"></i></div>
                            <div>
                                <div class="seller-brand-title">Seller Center</div>
                                <div class="seller-brand-sub" id="shopNameSidebar">Đang tải...</div>
                            </div>
                        </div>
                        ${content}
                    </div>
                </div>
            </nav>`;

        document.getElementById("layoutSidenav_nav").innerHTML = menu;

        // ── Force sidebar styles via JS to bypass styles.css override ──
        _injectSidebarStyles();
    }

    function _injectSidebarStyles() {
        // Remove previous injected style if navigating within seller
        var old = document.getElementById('__seller-sidebar-style');
        if (old) old.remove();

        var style = document.createElement('style');
        style.id = '__seller-sidebar-style';
        style.textContent = `
            #layoutSidenav_nav,
            #layoutSidenav_nav .sb-sidenav,
            #layoutSidenav_nav .sb-sidenav-dark {
                background: linear-gradient(180deg, #0c2e2a 0%, #071918 100%) !important;
                border-right: 2px solid rgba(13,148,136,.35) !important;
            }
            #sidenavAccordion .sb-sidenav-menu {
                background: transparent !important;
            }
            #sidenavAccordion .nav-link {
                color: rgba(255,255,255,.9) !important;
                border-left: 3px solid transparent !important;
                border-radius: 0 10px 10px 0 !important;
                margin: 2px 10px 2px 0 !important;
                transition: all .2s !important;
            }
            #sidenavAccordion .nav-link .sb-nav-link-icon,
            #sidenavAccordion .nav-link i {
                color: #5eead4 !important;
            }
            #sidenavAccordion .nav-link:hover {
                color: #fff !important;
                background: rgba(13,148,136,.28) !important;
                border-left-color: #2dd4bf !important;
                transform: translateX(2px) !important;
            }
            #sidenavAccordion .nav-link.active {
                color: #fff !important;
                background: linear-gradient(90deg, rgba(13,148,136,.5) 0%, rgba(13,148,136,.15) 100%) !important;
                border-left: 4px solid #2dd4bf !important;
                font-weight: 700 !important;
            }
            #sidenavAccordion .nav-link.active i {
                color: #fff !important;
            }
            .sb-sidenav-menu-heading {
                color: #2dd4bf !important;
                font-size: 10px !important;
                font-weight: 800 !important;
                letter-spacing: 1.4px !important;
                padding: 18px 16px 6px !important;
                opacity: .85;
            }
            .sb-topnav.navbar {
                background: linear-gradient(135deg, #0c2e2a 0%, #071918 100%) !important;
                border-bottom: 1px solid rgba(13,148,136,.4) !important;
            }
            .seller-brand-header {
                border-bottom: 1px solid rgba(255,255,255,.08) !important;
            }
            .seller-brand-title { color: #fff !important; font-weight: 700 !important; }
            .seller-brand-sub { color: rgba(255,255,255,.5) !important; }
        `;
        document.head.appendChild(style);
    }

    function loadtop() {
        var top = `
            <button class="btn btn-link btn-sm order-1 order-lg-0 me-3" id="sidebarToggle">
                <i class="fas fa-bars"></i>
            </button>
            <a class="navbar-brand ps-1" href="/seller/index">
                <span class="seller-topbar-badge"><i class="fas fa-store-alt"></i> Seller</span>
            </a>
            <div class="ms-auto d-flex align-items-center gap-3 pe-3">
                <a href="/index" class="btn-topbar-link" title="Về trang chủ">
                    <i class="fas fa-home"></i>
                </a>
                <div class="seller-avatar-wrap">
                    <button id="btnOpenShopModal" onclick="openShopModal()" title="Xem / Sửa thông tin cửa hàng"
                        style="background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.3);border-radius:999px;
                               padding:5px 14px 5px 10px;display:flex;align-items:center;gap:8px;cursor:pointer;
                               color:#fff;font-size:13px;font-weight:700;transition:background .2s;"
                        onmouseover="this.style.background='rgba(13,148,136,.45)'"
                        onmouseout="this.style.background='rgba(255,255,255,.12)'">
                        <i class="fas fa-store" style="color:#5eead4;font-size:15px;"></i>
                        <span id="topbarShopName">Đang tải...</span>
                        <i class="fas fa-chevron-down" style="font-size:11px;opacity:.7;"></i>
                    </button>
                </div>
            </div>`;

        document.getElementById("top").innerHTML = top;

        var btn = document.getElementById("sidebarToggle");
        if (btn) {
            btn.addEventListener('click', function () {
                document.body.classList.toggle('sb-sidenav-toggled');
            });
        }

        // Inject shop modal into page (once)
        injectShopModal();
        // Load shop info for topbar label
        loadShopNameTopbar();
    }

    function loadShopNameTopbar() {
        var t = localStorage.getItem("token");
        if (!t) return;
        fetch("http://localhost:8080/api/seller/my-shop", {
            headers: { "Authorization": "Bearer " + t }
        }).then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                if (d) {
                    if (d.shopName) {
                        var el = document.getElementById("topbarShopName");
                        if (el) el.textContent = d.shopName;
                        var sid = document.getElementById("shopNameSidebar");
                        if (sid) sid.textContent = d.shopName;
                    }
                    if (d.status === "LOCKED") {
                        // Prepend lock banner
                        var contentArea = document.getElementById("layoutSidenav_content");
                        if (contentArea && !document.getElementById("shop-locked-banner")) {
                            var banner = document.createElement("div");
                            banner.id = "shop-locked-banner";
                            banner.style.cssText = "background:#fee2e2; border-bottom:1px solid #fca5a5; color:#b91c1c; padding:14px 20px; font-weight:700; text-align:center; font-size:14px; position:sticky; top:0; z-index:9999;";
                            banner.innerHTML = '<i class="fas fa-lock" style="margin-right:8px;"></i> Cửa hàng của bạn đã bị khóa bởi Admin. Các tính năng thêm sản phẩm, thêm voucher và nhắn tin đã bị vô hiệu hóa.';
                            contentArea.insertBefore(banner, contentArea.firstChild);
                        }
                        // Disable actions
                        disableSellerActions();
                    }
                }
            }).catch(function () { });
    }

    function disableSellerActions() {
        const currentPath = window.location.pathname;
        
        if (currentPath.includes("/seller/addproduct") || currentPath.includes("/seller/addvoucher") || currentPath.includes("/seller/addimportproduct")) {
            const formElements = document.querySelectorAll("input, textarea, select, button:not(#sidebarToggle):not(#btnOpenShopModal)");
            formElements.forEach(el => {
                el.disabled = true;
                el.style.opacity = "0.6";
                el.style.cursor = "not-allowed";
            });
            
            const customUploads = document.querySelectorAll(".btn-upload, .upload-btn, .avatar-pick-btn");
            customUploads.forEach(el => {
                el.style.pointerEvents = "none";
                el.style.opacity = "0.6";
            });
            
            const mainContent = document.querySelector("main");
            if (mainContent) {
                const overlay = document.createElement("div");
                overlay.style.cssText = "background:rgba(254,226,226,0.9); border:1px solid #fca5a5; border-radius:12px; padding:16px; margin-bottom:20px; color:#b91c1c; font-weight:600; display:flex; align-items:center; gap:10px;";
                overlay.innerHTML = '<i class="fas fa-exclamation-triangle" style="font-size:20px;"></i> <div>Trang này đã bị vô hiệu hóa vì cửa hàng của bạn đang bị khóa bởi Admin.</div>';
                mainContent.insertBefore(overlay, mainContent.firstChild);
            }
        }
        
        if (currentPath.includes("/seller/product") || currentPath.includes("/seller/voucher")) {
            const addButtons = document.querySelectorAll("a[href*='addproduct'], a[href*='addvoucher'], button[onclick*='add'], a[href*='addimport']");
            addButtons.forEach(el => {
                el.style.pointerEvents = "none";
                el.style.opacity = "0.5";
                el.style.cursor = "not-allowed";
                el.removeAttribute("href");
                el.onclick = function(e) { e.preventDefault(); return false; };
            });
            
            const actionButtons = document.querySelectorAll(".btn-edit, .btn-delete, button[onclick*='edit'], button[onclick*='delete']");
            actionButtons.forEach(el => {
                el.style.pointerEvents = "none";
                el.style.opacity = "0.5";
                el.style.cursor = "not-allowed";
                el.onclick = function(e) { e.preventDefault(); return false; };
            });
        }
    
        if (currentPath.includes("/seller/seller-chat") || currentPath.includes("/seller/chat")) {
            const chatInput = document.getElementById("sellerChatInput");
            if (chatInput) {
                chatInput.disabled = true;
                chatInput.placeholder = "Cửa hàng đã bị khóa - Không thể nhắn tin";
                chatInput.style.background = "#f1f5f9";
            }
            const sendBtn = document.querySelector(".seller-chat-footer button");
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.style.opacity = "0.6";
                sendBtn.style.cursor = "not-allowed";
                sendBtn.onclick = function(e) { e.preventDefault(); return false; };
            }
        }
    }

    function injectShopModal() {
        if (document.getElementById("__shopInfoModal")) return;

        var modalHtml = `
        <style>
            #__shopInfoModal { display:none;position:fixed;inset:0;z-index:99999;align-items:center;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(4px); }
            #__shopInfoModal.active { display:flex; }
            .__shopModal-box {
                background:#fff;border-radius:24px;width:100%;max-width:520px;
                box-shadow:0 24px 60px rgba(0,0,0,.22);overflow:hidden;animation:__slideUp .28s cubic-bezier(.34,1.3,.64,1);
            }
            @keyframes __slideUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
            .__shopModal-header {
                background:linear-gradient(135deg,#0d9488 0%,#065f46 100%);
                padding:22px 28px 18px;display:flex;align-items:center;justify-content:space-between;
            }
            .__shopModal-title { color:#fff;font-size:18px;font-weight:800;display:flex;align-items:center;gap:10px; }
            .__shopModal-close { background:rgba(255,255,255,.15);border:none;border-radius:50%;width:32px;height:32px;
                color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.2s; }
            .__shopModal-close:hover { background:rgba(255,255,255,.3); }
            .__shopModal-body { padding:24px 28px; max-height:70vh; overflow-y:auto; }
            .__shopModal-tabs { display:flex;gap:4px;margin-bottom:20px;background:#f1f5f9;border-radius:12px;padding:4px; }
            .__shopModal-tab { flex:1;padding:8px;border:none;background:transparent;border-radius:9px;font-size:13px;font-weight:600;
                color:#64748b;cursor:pointer;transition:.2s; }
            .__shopModal-tab.active { background:#fff;color:#0d9488;box-shadow:0 2px 8px rgba(0,0,0,.08); }
            .__sm-info-row { display:flex;align-items:flex-start;gap:12px;margin-bottom:14px; }
            .__sm-info-icon { width:38px;height:38px;border-radius:12px;background:#f0fdf4;display:flex;align-items:center;
                justify-content:center;font-size:16px;color:#0d9488;flex-shrink:0; }
            .__sm-info-label { font-size:12px;color:#94a3b8;font-weight:600;margin-bottom:2px; }
            .__sm-info-val { font-size:14px;color:#1e293b;font-weight:600;word-break:break-word; }
            .__sm-badge { display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700; }
            .__sm-badge.approved { background:#dcfce7;color:#16a34a; }
            .__sm-badge.pending  { background:#fef9c3;color:#ca8a04; }
            .__sm-badge.rejected { background:#fee2e2;color:#dc2626; }
            .__sm-form-group { margin-bottom:14px; }
            .__sm-form-group label { display:block;font-size:12px;font-weight:700;color:#64748b;margin-bottom:5px; }
            .__sm-form-group input, .__sm-form-group textarea {
                width:100%;border:1.5px solid #e2e8f0;border-radius:10px;padding:9px 12px;font-size:14px;
                outline:none;transition:.2s;font-family:inherit; }
            .__sm-form-group input:focus, .__sm-form-group textarea:focus { border-color:#0d9488;box-shadow:0 0 0 3px rgba(13,148,136,.12); }
            .__sm-form-group textarea { resize:vertical;min-height:80px; }
            .__sm-btn-save { width:100%;padding:11px;border:none;border-radius:12px;
                background:linear-gradient(135deg,#0d9488,#065f46);color:#fff;font-size:14px;font-weight:700;
                cursor:pointer;transition:.2s;margin-top:4px; }
            .__sm-btn-save:hover { opacity:.9;transform:translateY(-1px); }
            .__sm-avatar { width:72px;height:72px;border-radius:18px;object-fit:cover;border:3px solid #e2e8f0; }
            .__sm-avatar-placeholder { width:72px;height:72px;border-radius:18px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;font-size:28px;color:#0d9488;border:3px solid #e2e8f0; }
            .__sm-stars { color:#f59e0b;font-size:14px; }
            .__avatar-picker-wrap { display:flex;align-items:center;gap:14px;margin-bottom:14px; }
            .__avatar-preview {
                width:80px;height:80px;border-radius:18px;
                border:2.5px dashed #cbd5e1;background:#f8fafc;
                flex-shrink:0;overflow:hidden;cursor:pointer;
                position:relative;transition:border-color .2s;
                display:flex;align-items:center;justify-content:center;
                font-size:26px;color:#94a3b8;
            }
            .__avatar-preview:hover { border-color:#0d9488; }
            .__avatar-preview img {
                position:absolute;top:0;left:0;
                width:100%;height:100%;
                object-fit:cover;display:block;
            }
            .__avatar-picker-right { flex:1; }
            .__avatar-picker-right label { display:block;font-size:12px;font-weight:700;color:#64748b;margin-bottom:6px; }
            .__avatar-pick-btn {
                display:inline-flex;align-items:center;gap:7px;
                padding:8px 16px;border-radius:10px;border:1.5px solid #0d9488;
                background:#f0fdf4;color:#0d9488;font-size:13px;font-weight:700;
                cursor:pointer;transition:.2s;
            }
            .__avatar-pick-btn:hover { background:#0d9488;color:#fff; }
            .__avatar-uploading { font-size:12px;color:#64748b;margin-top:6px;display:none; }
            .__avatar-uploading.show { display:flex;align-items:center;gap:6px; }
            .__avatar-spinner { width:14px;height:14px;border:2px solid #cbd5e1;border-top-color:#0d9488;border-radius:50%;animation:__spin .7s linear infinite;display:inline-block; }
            @keyframes __spin { to{transform:rotate(360deg)} }
        </style>
        <div id="__shopInfoModal">
            <div class="__shopModal-box">
                <div class="__shopModal-header">
                    <div class="__shopModal-title"><i class="fas fa-store"></i> Thông tin cửa hàng</div>
                    <button class="__shopModal-close" onclick="closeShopModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="__shopModal-body">
                    <div class="__shopModal-tabs">
                        <button class="__shopModal-tab active" id="__tabView" onclick="switchShopTab('view')">
                            <i class="fas fa-info-circle"></i> Chi tiết
                        </button>
                        <button class="__shopModal-tab" id="__tabEdit" onclick="switchShopTab('edit')">
                            <i class="fas fa-edit"></i> Chỉnh sửa
                        </button>
                    </div>

                    <!-- VIEW TAB -->
                    <div id="__shopViewTab">
                        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
                            <div id="__shopAvatarWrap"></div>
                            <div>
                                <div style="font-size:18px;font-weight:800;color:#1e293b;" id="__sv_name">–</div>
                                <div style="font-size:12px;color:#64748b;margin-top:2px;" id="__sv_slug"></div>
                                <div style="margin-top:6px;" id="__sv_status"></div>
                            </div>
                        </div>
                        <div class="__sm-info-row">
                            <div class="__sm-info-icon"><i class="fas fa-phone"></i></div>
                            <div><div class="__sm-info-label">Số điện thoại</div><div class="__sm-info-val" id="__sv_phone">–</div></div>
                        </div>
                        <div class="__sm-info-row">
                            <div class="__sm-info-icon"><i class="fas fa-envelope"></i></div>
                            <div><div class="__sm-info-label">Email cửa hàng</div><div class="__sm-info-val" id="__sv_email">–</div></div>
                        </div>
                        <div class="__sm-info-row">
                            <div class="__sm-info-icon"><i class="fas fa-align-left"></i></div>
                            <div><div class="__sm-info-label">Mô tả</div><div class="__sm-info-val" id="__sv_desc">–</div></div>
                        </div>
                        <div class="__sm-info-row">
                            <div class="__sm-info-icon"><i class="fas fa-star"></i></div>
                            <div>
                                <div class="__sm-info-label">Đánh giá</div>
                                <div class="__sm-info-val">
                                    <span class="__sm-stars" id="__sv_stars"></span>
                                    <span id="__sv_star_val" style="color:#1e293b;margin-left:4px;"></span>
                                    <span style="color:#94a3b8;font-size:12px;" id="__sv_review_count"></span>
                                </div>
                            </div>
                        </div>
                        <div class="__sm-info-row">
                            <div class="__sm-info-icon"><i class="fas fa-shopping-bag"></i></div>
                            <div><div class="__sm-info-label">Tổng đã bán</div><div class="__sm-info-val" id="__sv_sold">–</div></div>
                        </div>
                        <div class="__sm-info-row">
                            <div class="__sm-info-icon"><i class="fas fa-user"></i></div>
                            <div><div class="__sm-info-label">Chủ sở hữu</div><div class="__sm-info-val" id="__sv_owner">–</div></div>
                        </div>
                    </div>

                    <!-- EDIT TAB -->
                    <div id="__shopEditTab" style="display:none;">
                        <div class="__sm-form-group">
                            <label><i class="fas fa-store"></i> Tên cửa hàng *</label>
                            <input type="text" id="__se_name" placeholder="Tên cửa hàng">
                        </div>
                        <div class="__sm-form-group">
                            <label><i class="fas fa-phone"></i> Số điện thoại</label>
                            <input type="text" id="__se_phone" placeholder="Số điện thoại liên hệ">
                        </div>
                        <div class="__sm-form-group">
                            <label><i class="fas fa-envelope"></i> Email cửa hàng</label>
                            <input type="email" id="__se_email" placeholder="Email cửa hàng">
                        </div>
                        <div class="__sm-form-group">
                            <label><i class="fas fa-image"></i> Ảnh đại diện cửa hàng</label>
                            <div class="__avatar-picker-wrap">
                                <div class="__avatar-preview" id="__se_avatar_preview" onclick="document.getElementById('__se_avatar_file').click()" title="Nhấp để chọn ảnh">
                                    <span id="__se_avatar_icon"><i class="fas fa-camera"></i></span>
                                </div>
                                <div class="__avatar-picker-right">
                                    <label>Chọn ảnh từ máy tính</label>
                                    <input type="file" id="__se_avatar_file" accept="image/*" style="display:none" onchange="onAvatarFileChange(this)">
                                    <input type="hidden" id="__se_avatar">
                                    <button type="button" class="__avatar-pick-btn" onclick="document.getElementById('__se_avatar_file').click()">
                                        <i class="fas fa-upload"></i> Chọn ảnh
                                    </button>
                                    <div class="__avatar-uploading" id="__se_avatar_uploading">
                                        <span class="__avatar-spinner"></span>
                                        <span>Đang tải ảnh lên...</span>
                                    </div>
                                    <div id="__se_avatar_hint" style="font-size:11px;color:#94a3b8;margin-top:5px;">JPG, PNG, WEBP — tối đa 5MB</div>
                                </div>
                            </div>
                        </div>
                        <div class="__sm-form-group">
                            <label><i class="fas fa-align-left"></i> Mô tả cửa hàng</label>
                            <textarea id="__se_desc" placeholder="Mô tả ngắn về cửa hàng..."></textarea>
                        </div>
                        <button class="__sm-btn-save" onclick="saveShopInfo()">
                            <i class="fas fa-save"></i> Lưu thay đổi
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

        var div = document.createElement("div");
        div.innerHTML = modalHtml;
        document.body.appendChild(div);

        // Close on backdrop click
        document.getElementById("__shopInfoModal").addEventListener("click", function (e) {
            if (e.target === this) closeShopModal();
        });
    }

    setTimeout(loadSellerBadges, 800);
    setInterval(loadSellerBadges, 8000);
});

window._shopData = null;

function openShopModal() {
    var modal = document.getElementById("__shopInfoModal");
    if (!modal) return;
    modal.classList.add("active");
    switchShopTab("view");
    fetchShopInfo();
}

function closeShopModal() {
    var modal = document.getElementById("__shopInfoModal");
    if (modal) modal.classList.remove("active");
}

function switchShopTab(tab) {
    document.getElementById("__shopViewTab").style.display = tab === "view" ? "block" : "none";
    document.getElementById("__shopEditTab").style.display = tab === "edit" ? "block" : "none";
    document.getElementById("__tabView").classList.toggle("active", tab === "view");
    document.getElementById("__tabEdit").classList.toggle("active", tab === "edit");
    if (tab === "edit" && window._shopData) fillEditForm(window._shopData);
}

function fetchShopInfo() {
    var t = localStorage.getItem("token");
    if (!t) return;
    fetch("http://localhost:8080/api/seller/my-shop", {
        headers: { "Authorization": "Bearer " + t }
    }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
            if (!d) return;
            window._shopData = d;
            renderShopView(d);
            // sync topbar and sidebar labels
            var el = document.getElementById("topbarShopName");
            if (el) el.textContent = d.shopName || "";
            var sid = document.getElementById("shopNameSidebar");
            if (sid) sid.textContent = d.shopName || "";
            var sn = document.getElementById("shopName");
            if (sn) sn.textContent = d.shopName || "";
            var sn2 = document.getElementById("shopNameSide");
            if (sn2) sn2.textContent = d.shopName || "";
        }).catch(function (e) { console.error(e); });
}

function renderShopView(d) {
    // Avatar
    var avatarWrap = document.getElementById("__shopAvatarWrap");
    if (avatarWrap) {
        if (d.avatar) {
            avatarWrap.innerHTML = '<img class="__sm-avatar" src="' + d.avatar + '" onerror="this.style.display=\'none\'">';
        } else {
            avatarWrap.innerHTML = '<div class="__sm-avatar-placeholder"><i class="fas fa-store"></i></div>';
        }
    }
    setText2("__sv_name", d.shopName || "–");
    setText2("__sv_slug", d.shopSlug ? ("@" + d.shopSlug) : "");
    setText2("__sv_phone", d.phone || "Chưa cập nhật");
    setText2("__sv_email", d.email || "Chưa cập nhật");
    setText2("__sv_desc", d.description || "Chưa có mô tả");
    setText2("__sv_sold", (d.totalSold || 0).toLocaleString("vi-VN") + " sản phẩm");
    setText2("__sv_owner", d.ownerFullname || "–");

    // Stars
    var starVal = parseFloat(d.avgStar || 0);
    var starsHtml = "";
    for (var i = 1; i <= 5; i++) {
        starsHtml += i <= Math.round(starVal) ? "★" : "☆";
    }
    setText2("__sv_stars", starsHtml);
    setText2("__sv_star_val", starVal.toFixed(1));
    setText2("__sv_review_count", "(" + (d.reviewCount || 0) + " đánh giá)");

    // Status badge
    var statusEl = document.getElementById("__sv_status");
    if (statusEl) {
        var cls = d.status === "APPROVED" ? "approved" : (d.status === "PENDING" ? "pending" : (d.status === "LOCKED" ? "rejected" : "rejected"));
        var label = d.status === "APPROVED" ? "✓ Đã duyệt" : (d.status === "PENDING" ? "⏳ Chờ duyệt" : (d.status === "LOCKED" ? "🔒 Đã khóa" : "✗ Từ chối"));
        statusEl.innerHTML = '<span class="__sm-badge ' + cls + '">' + label + '</span>';
    }
}

function fillEditForm(d) {
    setVal("__se_name", d.shopName || "");
    setVal("__se_phone", d.phone || "");
    setVal("__se_email", d.email || "");
    setVal("__se_avatar", d.avatar || "");
    setVal("__se_desc", d.description || "");

    // Show existing avatar preview
    var preview = document.getElementById("__se_avatar_preview");
    if (preview) {
        if (d.avatar) {
            preview.innerHTML = '<img src="' + d.avatar + '" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block;" onerror="this.parentNode.innerHTML=\'<span><i class=\\"fas fa-camera\\"></i></span>\'">';
        } else {
            preview.innerHTML = '<span><i class="fas fa-camera"></i></span>';
        }
    }
    // Reset file input
    var fileInput = document.getElementById("__se_avatar_file");
    if (fileInput) fileInput.value = "";
    var hint = document.getElementById("__se_avatar_hint");
    if (hint) { hint.textContent = "JPG, PNG, WEBP \u2014 t\u1ed1i \u0111a 5MB"; hint.style.color = "#94a3b8"; }
}

function onAvatarFileChange(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert("\u1ea2nh qu\u00e1 l\u1edbn! Vui l\u00f2ng ch\u1ecdn ảnh d\u01b0\u1edbi 5MB.");
        input.value = "";
        return;
    }

    // Show local preview immediately
    var reader = new FileReader();
    reader.onload = function (e) {
        var preview = document.getElementById("__se_avatar_preview");
        if (preview) preview.innerHTML = '<img src="' + e.target.result + '" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block;">';
    };
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    var uploading = document.getElementById("__se_avatar_uploading");
    var hint = document.getElementById("__se_avatar_hint");
    if (uploading) uploading.classList.add("show");
    if (hint) hint.textContent = "";

    var t = localStorage.getItem("token");
    var formData = new FormData();
    formData.append("file", file);

    fetch("http://localhost:8080/api/public/upload-file", {
        method: "POST",
        headers: t ? { "Authorization": "Bearer " + t } : {},
        body: formData
    }).then(function (r) {
        if (!r.ok) throw new Error("Upload th\u1ea5t b\u1ea1i");
        return r.text();
    }).then(function (url) {
        // Store the Cloudinary URL in hidden input
        setVal("__se_avatar", url.replace(/^"|"$/g, ""));
        if (uploading) uploading.classList.remove("show");
        if (hint) hint.textContent = "\u2705 T\u1ea3i l\u00ean th\u00e0nh c\u00f4ng!";
        if (hint) hint.style.color = "#16a34a";
    }).catch(function (err) {
        console.error(err);
        if (uploading) uploading.classList.remove("show");
        if (hint) { hint.textContent = "\u274c T\u1ea3i l\u00ean th\u1ea5t b\u1ea1i, vui l\u00f2ng th\u1eed l\u1ea1i."; hint.style.color = "#dc2626"; }
        // Reset preview to old avatar
        var old = (window._shopData && window._shopData.avatar) || "";
        var preview = document.getElementById("__se_avatar_preview");
        if (preview) {
            preview.innerHTML = old
                ? '<img src="' + old + '" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block;">'
                : '<span><i class="fas fa-camera"></i></span>';
        }
        input.value = "";
    });
}

function saveShopInfo() {
    // Guard: block save if avatar is still uploading
    var uploading = document.getElementById("__se_avatar_uploading");
    if (uploading && uploading.classList.contains("show")) {
        showToast("Vui lòng chờ ảnh tải lên xong!", "error");
        return;
    }

    var t = localStorage.getItem("token");
    if (!t) return;
    var body = {
        shopName: getVal("__se_name"),
        phone: getVal("__se_phone"),
        email: getVal("__se_email"),
        avatar: getVal("__se_avatar"),
        description: getVal("__se_desc")
    };
    if (!body.shopName || body.shopName.trim() === "") {
        alert("Tên cửa hàng không được để trống!");
        return;
    }
    fetch("http://localhost:8080/api/seller/my-shop", {
        method: "PUT",
        headers: { "Authorization": "Bearer " + t, "Content-Type": "application/json" },
        body: JSON.stringify(body)
    }).then(function (r) {
        if (r.ok) {
            // Refresh cached shop data
            window._shopData = Object.assign(window._shopData || {}, body);
            renderShopView(window._shopData);
            // Sync all labels across page
            var el = document.getElementById("topbarShopName");
            if (el) el.textContent = body.shopName;
            var sid = document.getElementById("shopNameSidebar");
            if (sid) sid.textContent = body.shopName;
            var sn = document.getElementById("shopName");
            if (sn) sn.textContent = body.shopName;
            var sn2 = document.getElementById("shopNameSide");
            if (sn2) sn2.textContent = body.shopName;
            // Switch back to view tab
            switchShopTab("view");
            showToast("Cập nhật thành công!", "success");
        } else {
            r.text().then(function (msg) { alert("Lỗi: " + msg); });
        }
    }).catch(function (e) { alert("Lỗi kết nối server!"); });
}


function setText2(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; }
function setVal(id, val) { var e = document.getElementById(id); if (e) e.value = val; }
function getVal(id) { var e = document.getElementById(id); return e ? e.value : ""; }

function showToast(msg, type) {
    if (typeof toastr !== "undefined") {
        if (type === "success") toastr.success(msg);
        else toastr.error(msg);
    } else {
        alert(msg);
    }
}

async function dangXuat() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.replace('../dangnhap');
}

function formatmoney(money) {
    const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
    return VND.format(money);
}

async function checkroleSeller() {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/dangnhap"; return; }
    try {
        const response = await fetch('http://localhost:8080/api/seller/check-role-seller', {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) {
            const text = await response.text();
            alert(text || "Bạn không có quyền seller");
            window.location.href = "/index";
        }
    } catch (error) {
        console.error(error);
        alert("Không thể kết nối server");
        window.location.href = "/index";
    }
}

async function loadSellerBadges() {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    // 1. Load badge đơn hàng
    try {
        const lastSeen = localStorage.getItem("lastSeenSellerOrderId") || 0;
        const res = await fetch(`http://localhost:8080/api/invoice/seller/pending-info?lastSeenId=${lastSeen}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            const data = await res.json();
            if (window.location.pathname.includes("/seller/invoice")) {
                localStorage.setItem("lastSeenSellerOrderId", data.latestId);
                const b = document.getElementById("sellerPendingOrderBadge");
                if (b) b.style.display = 'none';
            } else {
                const b = document.getElementById("sellerPendingOrderBadge");
                if (b) {
                    b.textContent = data.count;
                    b.style.display = data.count > 0 ? 'inline' : 'none';
                }
            }
        }
    } catch(e) {}

    // 2. Load badge tin nhắn
    try {
        const lastSeen = localStorage.getItem("lastSeenSellerMessageId") || 0;
        const res = await fetch(`http://localhost:8080/api/chat/seller/unread-info?lastSeenId=${lastSeen}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            const data = await res.json();
            if (window.location.pathname.includes("/seller/seller-chat")) {
                localStorage.setItem("lastSeenSellerMessageId", data.latestId);
                const b = document.getElementById("sellerUnreadChatBadge");
                if (b) b.style.display = 'none';
            } else {
                const b = document.getElementById("sellerUnreadChatBadge");
                if (b) {
                    b.textContent = data.count;
                    b.style.display = data.count > 0 ? 'inline' : 'none';
                }
            }
        }
    } catch(e) {}
}
