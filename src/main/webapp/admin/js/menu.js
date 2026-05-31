const exceptionCode = 417;
var token = localStorage.getItem("token");
$(document).ready(function () {
    checkroleAdmin();
    loadmenu();

    function loadmenu() {
        var content =
            `<a class="nav-link" href="/admin/index">
                <div class="sb-nav-link-icon"><i class="fa fa-database iconmenu"></i></div>
                Tổng quan
            </a>
            <a class="nav-link" href="/admin/taikhoan">
                <div class="sb-nav-link-icon"><i class="fas fa-user-alt iconmenu"></i></div>
                Tài khoản
            </a>
            <a class="nav-link" href="/admin/seller-pending" id="menuAdminSellerPending">
                <div class="sb-nav-link-icon"><i class="fas fa-user-check iconmenu"></i></div>
                Người bán chờ duyệt
                <span id="pendingSellerBadge" style="
                    display:none;
                    background:#ef4444;color:#fff;
                    font-size:10px;font-weight:700;
                    border-radius:999px;padding:1px 7px;
                    margin-left:6px;vertical-align:middle;
                ">0</span>
            </a>
            <a class="nav-link" href="/admin/shop">
                <div class="sb-nav-link-icon"> <i class="fas fa-store iconmenu"></i></div>
                Danh sách shop
            </a>

            <a class="nav-link" href="/admin/shop-statistic">
                <div class="sb-nav-link-icon">
                    <i class="fas fa-chart-bar iconmenu"></i>
                </div>
                Thống kê shop
            </a>
            <a class="nav-link" href="/admin/danhmuc">
                <div class="sb-nav-link-icon"><i class="fas fa-table iconmenu"></i></div>
                Danh mục
            </a>
            <a class="nav-link" href="/admin/thuonghieu">
                <div class="sb-nav-link-icon"><i class="fas fa-table iconmenu"></i></div>
                Thương hiệu
            </a>
            <a class="nav-link" href="/admin/blog">
                <div class="sb-nav-link-icon"><i class="fas fa-newspaper iconmenu"></i></div>
                Bài viết
            </a>
            <a class="nav-link" href="/admin/voucher">
                <div class="sb-nav-link-icon"><i class="fa fa-ticket-alt iconmenu"></i></div>
                Voucher
            </a>
            <a class="nav-link" href="/admin/product">
                <div class="sb-nav-link-icon"><i class="fas fa-tshirt iconmenu"></i></div>
                Sản phẩm
            </a>
            <a class="nav-link" href="/admin/product-approval" id="menuProductApproval">
                <div class="sb-nav-link-icon"><i class="fas fa-clipboard-check iconmenu"></i></div>
                Duyệt sản phẩm
                <span id="pendingProductBadge" style="
                    display:none;
                    background:#ef4444;color:#fff;
                    font-size:10px;font-weight:700;
                    border-radius:999px;padding:1px 7px;
                    margin-left:6px;vertical-align:middle;
                ">0</span>
            </a>
            <a class="nav-link" href="/admin/commission">
                <div class="sb-nav-link-icon"><i class="fas fa-percent iconmenu"></i></div>
                Chiết khấu
            </a>
            <a class="nav-link" href="/admin/banner">
                <div class="sb-nav-link-icon"><i class="fa fa-image iconmenu"></i></div>
                banner
            </a>
            <a class="nav-link" href="/admin/invoice" id="menuAdminInvoice">
                <div class="sb-nav-link-icon"><i class="fa fa-shopping-cart iconmenu"></i></div>
                Đơn hàng
                <span id="adminPendingOrderBadge" style="
                    display:none;
                    background:#ef4444;color:#fff;
                    font-size:10px;font-weight:700;
                    border-radius:999px;padding:1px 7px;
                    margin-left:6px;vertical-align:middle;
                ">0</span>
            </a>
            <a onclick="dangXuat()" class="nav-link" href="#">
                <div class="sb-nav-link-icon"><i class="fas fa-sign-out-alt iconmenu"></i></div>
                Đăng xuất
            </a>
           `

        var menu =
            `<nav class="sb-sidenav accordion sb-sidenav-dark" id="sidenavAccordion">
        <div class="sb-sidenav-menu">
            <div class="nav">
                ${content}
            </div>
        </div>
    </nav>`
        document.getElementById("layoutSidenav_nav").innerHTML = menu
    }
    loadtop()

    function loadtop() {
        var top =
            `<a class="navbar-brand ps-3" href="index">Quản trị hệ thống</a>
        <button class="btn btn-link btn-sm order-1 order-lg-0 me-4 me-lg-0" id="sidebarToggle" href="#!"><i class="fas fa-bars"></i></button>
        <form class="d-none d-md-inline-block form-inline ms-auto me-0 me-md-3 my-2 my-md-0"></form>
        <ul id="menuleft" class="navbar-nav ms-auto ms-md-0 me-3 me-lg-4">
        </ul>`
        document.getElementById("top").innerHTML = top
    }
    var sidebarToggle = document.getElementById("sidebarToggle");
    sidebarToggle.onclick = function () {
        document.body.classList.toggle('sb-sidenav-toggled');
        localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
    }
});

async function dangXuat() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.replace('../dangnhap')
}


function formatmoney(money) {
    const VND = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    });
    return VND.format(money);
}

async function checkroleAdmin() {
    var token = localStorage.getItem("token");
    var url = 'http://localhost:8080/api/admin/check-role-admin';
    const response = await fetch(url, {
        method: 'GET',
        headers: new Headers({
            'Authorization': 'Bearer ' + token
        })
    });
    if (response.status > 300) {
        window.location.replace('../dangnhap')
    }
}

// ── Load badge số sản phẩm chờ duyệt trên menu ──────────
async function loadPendingProductCount() {
    try {
        const lastSeen = localStorage.getItem("lastSeenAdminProductId") || 0;
        const res = await fetch(`http://localhost:8080/api/admin/shop/product/pending-info?lastSeenId=${lastSeen}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem("token") }
        });
        if (!res.ok) return;
        const data = await res.json();
        
        // Nếu đang ở trang Duyệt sản phẩm, tự động đánh dấu đã xem tất cả
        if (window.location.pathname.includes("/admin/product-approval")) {
            localStorage.setItem("lastSeenAdminProductId", data.latestId);
            const badge = document.getElementById('pendingProductBadge');
            if (badge) badge.style.display = 'none';
        } else {
            const badge = document.getElementById('pendingProductBadge');
            if (badge) {
                badge.textContent = data.count;
                badge.style.display = data.count > 0 ? 'inline' : 'none';
            }
        }
    } catch (e) { /* silent */ }
}

// Gọi sau khi DOM sẵn sàng
setTimeout(loadPendingProductCount, 500);
setInterval(loadPendingProductCount, 8000);

// ── Load badge số đơn hàng chờ duyệt trên menu ──────────
async function loadAdminPendingOrders() {
    try {
        const lastSeen = localStorage.getItem("lastSeenAdminOrderId") || 0;
        const res = await fetch(`http://localhost:8080/api/invoice/admin/pending-info?lastSeenId=${lastSeen}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem("token") }
        });
        if (!res.ok) return;
        const data = await res.json();
        
        // Nếu đang ở trang Đơn hàng, tự động đánh dấu đã xem tất cả
        if (window.location.pathname.includes("/admin/invoice")) {
            localStorage.setItem("lastSeenAdminOrderId", data.latestId);
            const badge = document.getElementById('adminPendingOrderBadge');
            if (badge) badge.style.display = 'none';
        } else {
            const badge = document.getElementById('adminPendingOrderBadge');
            if (badge) {
                badge.textContent = data.count;
                badge.style.display = data.count > 0 ? 'inline' : 'none';
            }
        }
    } catch (e) { /* silent */ }
}

// Gọi sau khi DOM sẵn sàng
setTimeout(loadAdminPendingOrders, 500);
setInterval(loadAdminPendingOrders, 8000);

// ── Load badge số người bán chờ duyệt trên menu ──────────
async function loadAdminPendingSellers() {
    try {
        const lastSeen = localStorage.getItem("lastSeenAdminSellerId") || 0;
        const res = await fetch(`http://localhost:8080/api/admin/seller/pending-info?lastSeenId=${lastSeen}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem("token") }
        });
        if (!res.ok) return;
        const data = await res.json();
        
        // Nếu đang ở trang Duyệt người bán, tự động đánh dấu đã xem tất cả
        if (window.location.pathname.includes("/admin/seller-pending")) {
            localStorage.setItem("lastSeenAdminSellerId", data.latestId);
            const badge = document.getElementById('pendingSellerBadge');
            if (badge) badge.style.display = 'none';
        } else {
            const badge = document.getElementById('pendingSellerBadge');
            if (badge) {
                badge.textContent = data.count;
                badge.style.display = data.count > 0 ? 'inline' : 'none';
            }
        }
    } catch (e) { /* silent */ }
}

// Gọi sau khi DOM sẵn sàng
setTimeout(loadAdminPendingSellers, 500);
setInterval(loadAdminPendingSellers, 8000);







