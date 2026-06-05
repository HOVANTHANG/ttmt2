
const BASE_URL = "http://localhost:8080";
const EXCEPTION_CODE = 417;

var token = localStorage.getItem("token");
var reviewStar = 5;
var reviewImageUrls = [];
var editingReviewId = null;
var editingReviewType = null;

function formatmoney(amount) {
    return Number(amount || 0).toLocaleString("vi-VN") + " ₫";
}

function safeImage(url, fallback) {
    return (url && String(url).trim() !== "") ? url : fallback;
}

function getVariantDisplayName(variant) {
    if (!variant) return "";
    return [variant.tier1value, variant.tier2value, variant.tier3value]
        .filter(Boolean)
        .join(" - ") || "Biến thể mặc định";
}


async function authFetch(url, options = {}) {
    const tk = localStorage.getItem("token");
    return fetch(url, {
        ...options,
        headers: {
            "Authorization": "Bearer " + tk,
            ...(options.headers || {})
        }
    });
}

// ==================== LOAD DANH SÁCH ĐƠN HÀNG ====================

const PAGE_SIZE = 5;
var allInvoices = [];
var filteredInvoices = [];
var currentPage = 1;
var currentFilter = 'ALL';

const STATUS_MAP = {
    DANG_CHO_XAC_NHAN: { label: 'Chờ xác nhận', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
    DA_XAC_NHAN: { label: 'Đã xác nhận', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
    DANG_GIAO: { label: 'Đang giao', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
    DA_GIAO: { label: 'Đã giao', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
    DA_NHAN: { label: 'Hoàn thành', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
    DA_HUY: { label: 'Đã hủy', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
    HUY: { label: 'Đã hủy', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
};

function getStatusInfo(status) {
    return STATUS_MAP[status] || { label: status || '—', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
}

async function loadMyInvoice() {
    try {
        const response = await authFetch(`${BASE_URL}/api/invoice/user/find-by-user`);
        if (!response.ok) throw new Error('Không tải được đơn hàng');

        allInvoices = await response.json() || [];
        // Sắp xếp mới nhất lên đầu
        allInvoices.sort((a, b) => b.id - a.id);

        document.getElementById('sldonhang').innerHTML = allInvoices.length + ' đơn hàng';

        currentFilter = 'ALL';
        currentPage = 1;
        applyFilter();

    } catch (e) {
        console.error('Lỗi loadMyInvoice:', e);
        toastr.error('Không tải được danh sách đơn hàng');
    }
}

function filterOrders(status, btn) {
    currentFilter = status;
    currentPage = 1;

    // Reset tất cả tab về dạng inactive
    document.querySelectorAll('[id^="tab-"]').forEach(el => {
        el.style.background = '#fff';
        el.style.color = '#64748b';
        el.style.border = '1.5px solid #e2e8f0';
    });
    // Active tab
    if (btn) {
        btn.style.background = 'linear-gradient(135deg,#0d9488,#065f46)';
        btn.style.color = '#fff';
        btn.style.border = 'none';
    }
    applyFilter();
}

function applyFilter() {
    filteredInvoices = currentFilter === 'ALL'
        ? allInvoices
        : allInvoices.filter(iv => iv.statusInvoice === currentFilter);
    renderPage();
    renderPagination();
}

function renderPage() {
    const container = document.getElementById('ordersContainer');
    if (!container) return;

    const start = (currentPage - 1) * PAGE_SIZE;
    const page = filteredInvoices.slice(start, start + PAGE_SIZE);

    if (filteredInvoices.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 0;color:#94a3b8;">
                <i class="fa-solid fa-box-open" style="font-size:52px;margin-bottom:16px;display:block;"></i>
                <div style="font-size:15px;font-weight:600;">Không có đơn hàng nào</div>
                <div style="font-size:13px;margin-top:6px;">Hãy mua sắm để có đơn hàng đầu tiên!</div>
            </div>`;
        return;
    }

    container.innerHTML = page.map(item => {
        const st = getStatusInfo(item.statusInvoice);
        const canCancel = ['DANG_CHO_XAC_NHAN', 'DA_XAC_NHAN'].includes(item.statusInvoice);
        const payBadge = item.payType === 'MOMO'
            ? `<span style="background:#fff0f9;color:#ec4899;border:1.5px solid #fbcfe8;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">MoMo</span>`
            : `<span style="background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">COD</span>`;

        return `
        <div onclick="openInvoiceDetail(${item.id})"
             style="background:#fff;border:1.5px solid #e8edf3;border-radius:16px;padding:18px 20px;cursor:pointer;
                    transition:box-shadow .2s,border-color .2s;display:flex;align-items:center;gap:20px;flex-wrap:wrap;"
             onmouseover="this.style.boxShadow='0 6px 24px rgba(13,148,136,.10)';this.style.borderColor='#99f6e4'"
             onmouseout="this.style.boxShadow='none';this.style.borderColor='#e8edf3'">

            <!-- ID + ngày -->
            <div style="min-width:110px;">
                <div style="font-size:18px;font-weight:800;color:#0d9488;">#${item.id}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:3px;">${item.createdTime || ''}</div>
                <div style="font-size:12px;color:#94a3b8;">${item.createdDate || ''}</div>
            </div>

            <!-- Trạng thái + thanh toán -->
            <div style="flex:1;min-width:140px;">
                <span style="display:inline-block;padding:5px 14px;border-radius:20px;font-size:12.5px;font-weight:700;
                             background:${st.bg};color:${st.color};border:1.5px solid ${st.border};">
                    ${st.label}
                </span>
                <div style="margin-top:8px;">${payBadge}</div>
            </div>

            <!-- Giá tiền -->
            <div style="text-align:right;min-width:140px;">
                <div style="font-size:17px;font-weight:800;color:#ef4444;">${formatmoney(item.totalAmount)}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Ship: ${formatmoney(item.shipCost)}</div>
            </div>

            <!-- Nút hành động -->
            <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;min-width:100px;"
                 onclick="event.stopPropagation()">
                <button onclick="openInvoiceDetail(${item.id})"
                    style="border:1.5px solid #0d9488;background:#fff;color:#0d9488;border-radius:20px;
                           padding:5px 16px;font-size:13px;font-weight:600;cursor:pointer;width:100%;font-family:inherit;
                           transition:all .2s;"
                    onmouseover="this.style.background='#0d9488';this.style.color='#fff'"
                    onmouseout="this.style.background='#fff';this.style.color='#0d9488'">
                    Xem chi tiết
                </button>
                ${canCancel ? `
                <button onclick="cancelInvoice(${item.id})"
                    style="border:1.5px solid #ef4444;background:#fff;color:#ef4444;border-radius:20px;
                           padding:5px 16px;font-size:13px;font-weight:600;cursor:pointer;width:100%;font-family:inherit;
                           transition:all .2s;"
                    onmouseover="this.style.background='#ef4444';this.style.color='#fff'"
                    onmouseout="this.style.background='#fff';this.style.color='#ef4444'">
                    Hủy đơn
                </button>` : ''}
            </div>
        </div>`;
    }).join('');
}

function renderPagination() {
    const pag = document.getElementById('ordersPagination');
    if (!pag) return;
    const total = Math.ceil(filteredInvoices.length / PAGE_SIZE);
    if (total <= 1) { pag.innerHTML = ''; return; }

    const btnStyle = (active) =>
        `padding:6px 14px;border-radius:8px;border:1.5px solid ${active ? '#0d9488' : '#e2e8f0'};
         background:${active ? '#0d9488' : '#fff'};color:${active ? '#fff' : '#64748b'};
         font-weight:${active ? '700' : '500'};cursor:pointer;font-family:inherit;font-size:13.5px;transition:all .2s;`;

    let html = `<button style="${btnStyle(false)}" onclick="goPage(${currentPage - 1})"
                    ${currentPage === 1 ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''}>
                    ‹ Trước
                </button>`;

    for (let i = 1; i <= total; i++) {
        html += `<button style="${btnStyle(i === currentPage)}" onclick="goPage(${i})">${i}</button>`;
    }

    html += `<button style="${btnStyle(false)}" onclick="goPage(${currentPage + 1})"
                ${currentPage === total ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''}>
                Tiếp ›
            </button>`;

    pag.innerHTML = html;
}

function goPage(page) {
    const total = Math.ceil(filteredInvoices.length / PAGE_SIZE);
    if (page < 1 || page > total) return;
    currentPage = page;
    renderPage();
    renderPagination();
    // Scroll lên đầu danh sách
    const c = document.getElementById('ordersContainer');
    if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==================== CHI TIẾT ĐƠN HÀNG ====================

async function openInvoiceDetail(invoiceId) {
    if (!localStorage.getItem("token")) {
        toastr.error("Bạn cần đăng nhập");
        window.location.href = "/dangnhap";
        return;
    }

    try {
        // Gọi song song 2 API
        const [invoiceRes, detailRes] = await Promise.all([
            authFetch(`${BASE_URL}/api/invoice/user/find-by-id?idInvoice=${invoiceId}`),
            authFetch(`${BASE_URL}/api/invoice-detail/user/find-by-invoice?idInvoice=${invoiceId}`)
        ]);

        if (!invoiceRes.ok) throw new Error("Không tải được hóa đơn");
        if (!detailRes.ok) throw new Error("Không tải được chi tiết hóa đơn");

        const [invoice, list] = await Promise.all([invoiceRes.json(), detailRes.json()]);

        renderInvoiceDetail(invoice, list);
        new bootstrap.Modal(document.getElementById("invoiceDetailModal")).show();

    } catch (e) {
        console.error("Lỗi openInvoiceDetail:", e);
        toastr.error("Không tải được chi tiết đơn hàng");
    }
}

function renderInvoiceDetail(invoice, list) {
    // Điền thông tin đơn hàng
    const fields = {
        invoiceCodeText: "#" + (invoice.id || ""),
        invoiceStatusText: invoice.statusInvoice || "",
        invoiceReceiverName: invoice.receiverName || "",
        invoicePhone: invoice.phone || "",
        invoiceAddress: invoice.address || "",
        invoiceNote: invoice.note ? "Ghi chú: " + invoice.note : ""
    };
    for (const [id, val] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    }

    // Nhóm sản phẩm theo shop
    const grouped = {};
    const shopOrder = [];
    let tamTinh = 0;

    for (const item of list) {
        const product = item.product || {};
        const shopId = item.shopId || product.shop?.id || 0;
        const shopName = item.shopName || product.shop?.shopName || "Shop";
        const shopAvatar = item.shopAvatar || product.shop?.avatar || "/image/logo.ico";

        if (!grouped[shopId]) {
            grouped[shopId] = { shopId, shopName, shopAvatar, items: [] };
            shopOrder.push(shopId);
        }
        grouped[shopId].items.push(item);
    }

    // Build HTML
    let html = shopOrder.map(sid => {
        const group = grouped[sid];

        const itemsHtml = group.items.map(item => {
            const product = item.product || {};
            const variant = item.productVariant || {};
            const quantity = Number(item.quantity || 0);
            const price = Number(item.price || variant.price || 0);
            const image = safeImage(item.image || variant.image || product.imageBanner, "/image/product1.webp");
            const variantText = getVariantDisplayName(variant);

            tamTinh += quantity * price;

            return `
                <div class="invoice-product-row">
                    <img src="${image}" class="invoice-product-image"
                         onerror="this.onerror=null; this.src='/image/product1.webp'">
                    <div style="flex:1">
                        <div class="invoice-product-name">${product.name || ""}</div>
                        <div class="invoice-product-variant">${variantText}</div>
                        <div>SL: ${quantity}</div>
                        <div class="invoice-product-price">${formatmoney(price)}</div>
                        ${invoice.statusInvoice === "DA_NHAN" ? `
                            <button class="invoice-review-btn"
                                    id="btnReviewProduct${item.id}"
                                    onclick="openProductReview(${item.id})">
                                Đánh giá sản phẩm
                            </button>` : ""}
                    </div>
                    <div class="text-end"><b>${formatmoney(price * quantity)}</b></div>
                </div>`;
        }).join("");

        return `
            <div class="invoice-shop-card">
                <div class="invoice-shop-header">
                    <div class="invoice-shop-left">
                        <img src="${safeImage(group.shopAvatar, '/image/logo.ico')}"
                             class="invoice-shop-avatar"
                             onerror="this.onerror=null; this.src='/image/logo.ico'">
                        <div>
                            <div class="invoice-shop-name">${group.shopName}</div>
                            <div class="invoice-shop-sub">Nhà bán hàng</div>
                        </div>
                    </div>
                    <div class="invoice-shop-actions">
                        ${group.shopId ? `<button class="btn-view-shop-small" onclick="goShop(${group.shopId})">Xem shop</button>` : ""}
                        ${invoice.statusInvoice === "DA_NHAN" && group.shopId ? `
                            <button class="btn-review-shop-small"
                                    id="btnReviewShop${invoice.id}_${group.shopId}"
                                    onclick="openShopReview(${invoice.id}, ${group.shopId})">
                                Đánh giá shop
                            </button>` : ""}
                    </div>
                </div>
                ${itemsHtml}
            </div>`;
    }).join("");

    document.getElementById("invoiceProductList").innerHTML =
        html || `<div class="text-center text-muted p-4">Không có sản phẩm</div>`;

    document.getElementById("invoiceTamTinh").innerText = formatmoney(tamTinh);
    document.getElementById("invoiceShip").innerText = formatmoney(invoice.shipCost || 0);
    document.getElementById("invoiceTotal").innerText = formatmoney(tamTinh + Number(invoice.shipCost || 0));

    checkReviewedButtons(invoice, list);
}

// ==================== KIỂM TRA ĐÃ ĐÁNH GIÁ ====================

async function checkReviewedButtons(invoice, list) {
    if (!localStorage.getItem("token") || !invoice || !list) return;

    // Kiểm tra đánh giá sản phẩm — song song tất cả items
    await Promise.all(list.map(async item => {
        try {
            const res = await authFetch(
                `${BASE_URL}/api/review/user/my-product-review?invoiceDetailId=${item.id}`
            );
            if (!res.ok) return;

            const review = await res.json();
            if (!review?.id) return;

            const btn = document.getElementById("btnReviewProduct" + item.id);
            if (btn) {
                btn.innerText = "Xem đánh giá";
                btn.classList.add("reviewed");
                btn.onclick = () => openEditProductReview(item.id, review);
            }
        } catch (e) {
            console.error("Lỗi check product review:", e);
        }
    }));

    // Kiểm tra đánh giá shop — mỗi shop 1 lần, song song
    const checkedShops = new Set();
    const uniqueShops = list.reduce((acc, item) => {
        const shopId = item.shopId || item.product?.shop?.id;
        if (shopId && !checkedShops.has(shopId)) {
            checkedShops.add(shopId);
            acc.push(shopId);
        }
        return acc;
    }, []);

    await Promise.all(uniqueShops.map(async shopId => {
        try {
            const res = await authFetch(
                `${BASE_URL}/api/review/user/my-shop-review?invoiceId=${invoice.id}&shopId=${shopId}`
            );
            if (!res.ok) return;

            const review = await res.json();
            if (!review?.id) return;

            const btn = document.getElementById(`btnReviewShop${invoice.id}_${shopId}`);
            if (btn) {
                btn.innerText = "Xem đánh giá";
                btn.classList.add("reviewed");
                btn.onclick = () => openEditShopReview(invoice.id, shopId, review);
            }
        } catch (e) {
            console.error("Lỗi check shop review:", e);
        }
    }));
}

// ==================== REVIEW MODAL ====================

/**
 * Hàm nội bộ dùng chung để mở modal đánh giá
 */
function _openReviewModal({ title, type, targetId, invoiceId = "", content = "", star = 5, editId = null, editType = null, images = [], showImageBox = true }) {
    editingReviewId = editId;
    editingReviewType = editType;
    reviewImageUrls = [];

    document.getElementById("reviewTitle").innerText = title;
    document.getElementById("reviewType").value = type;
    document.getElementById("reviewTargetId").value = targetId;
    document.getElementById("reviewInvoiceId").value = invoiceId;
    document.getElementById("reviewContent").value = content;
    document.getElementById("reviewImageBox").style.display = showImageBox ? "block" : "none";

    const input = document.getElementById("reviewImages");
    if (input) input.value = "";

    if (images.length > 0) {
        renderOldReviewImages(images);
    } else {
        document.getElementById("reviewImagePreview").innerHTML = "";
    }

    setReviewStar(star);
    new bootstrap.Modal(document.getElementById("reviewModal")).show();
}

function openProductReview(invoiceDetailId) {
    _openReviewModal({
        title: "Đánh giá sản phẩm",
        type: "PRODUCT",
        targetId: invoiceDetailId,
        showImageBox: true
    });
}

function openShopReview(invoiceId, shopId) {
    _openReviewModal({
        title: "Đánh giá shop",
        type: "SHOP",
        targetId: shopId,
        invoiceId: invoiceId,
        showImageBox: false
    });
}

function openEditProductReview(invoiceDetailId, review) {
    _openReviewModal({
        title: "Xem / sửa đánh giá sản phẩm",
        type: "PRODUCT",
        targetId: invoiceDetailId,
        content: review.content || "",
        star: Number(review.star || 5),
        editId: review.id,
        editType: "PRODUCT",
        images: review.images || review.productCommentImages || [],
        showImageBox: true
    });
}

function openEditShopReview(invoiceId, shopId, review) {
    _openReviewModal({
        title: "Xem / sửa đánh giá shop",
        type: "SHOP",
        targetId: shopId,
        invoiceId: invoiceId,
        content: review.content || "",
        star: Number(review.star || 5),
        editId: review.id,
        editType: "SHOP",
        showImageBox: false
    });
}

function goShop(shopId) {
    window.open("/shop-detail?id=" + shopId, "_blank");
}

function setReviewStar(star) {
    reviewStar = star;

    const input = document.getElementById("reviewStarValue");
    if (input) input.value = star;

    document.querySelectorAll(".review-star-select i").forEach((el, index) => {
        el.classList.toggle("active", index < star);
    });
}

// ==================== ẢNH ĐÁNH GIÁ ====================

function previewReviewImages() {
    const input = document.getElementById("reviewImages");
    const preview = document.getElementById("reviewImagePreview");
    preview.innerHTML = "";

    if (!input.files?.length) return;

    if (input.files.length > 5) {
        toastr.warning("Chỉ được chọn tối đa 5 ảnh");
        input.value = "";
        return;
    }

    for (const file of input.files) {
        if (!file.type.startsWith("image/")) {
            toastr.warning("Chỉ được chọn file ảnh");
            input.value = "";
            preview.innerHTML = "";
            return;
        }
        preview.innerHTML += `<img src="${URL.createObjectURL(file)}"
            style="width:70px;height:70px;object-fit:cover;border-radius:8px;margin:4px;">`;
    }
}

function renderOldReviewImages(images) {
    const preview = document.getElementById("reviewImagePreview");
    preview.innerHTML = "";
    if (!images?.length) return;

    for (const img of images) {
        const src = typeof img === "string" ? img : (img.linkImage || img.image || img.url || "");
        if (!src) continue;
        reviewImageUrls.push(src);
        preview.innerHTML += `<img src="${src}"
            style="width:70px;height:70px;object-fit:cover;border-radius:8px;margin:4px;"
            onerror="this.style.display='none'">`;
    }
}

async function uploadReviewImages() {
    const input = document.getElementById("reviewImages");
    if (!input?.files?.length) return [];

    if (input.files.length > 5) throw new Error("Chỉ được chọn tối đa 5 ảnh");

    const formData = new FormData();
    for (const file of input.files) {
        formData.append("file", file);
    }

    const res = await fetch(`${BASE_URL}/api/public/upload-multiple-file`, {
        method: "POST",
        body: formData
    });

    if (!res.ok) throw new Error("Upload ảnh thất bại");
    return res.json();
}

// ==================== GỬI ĐÁNH GIÁ ====================

async function submitReview() {
    if (!localStorage.getItem("token")) {
        toastr.error("Bạn cần đăng nhập");
        window.location.href = "/dangnhap";
        return;
    }

    const type = document.getElementById("reviewType").value;
    const targetId = Number(document.getElementById("reviewTargetId").value);
    const invoiceId = Number(document.getElementById("reviewInvoiceId").value || 0);
    const content = document.getElementById("reviewContent").value.trim();
    const method = editingReviewId ? "PUT" : "POST";

    try {
        let url, body;

        if (type === "PRODUCT") {
            const uploadedImages = await uploadReviewImages();
            const finalImages = uploadedImages?.length > 0
                ? uploadedImages
                : (editingReviewId && reviewImageUrls.length > 0 ? reviewImageUrls : []);

            body = { invoiceDetailId: targetId, star: reviewStar, content, images: finalImages };
            url = editingReviewId
                ? `${BASE_URL}/api/review/user/product/${editingReviewId}`
                : `${BASE_URL}/api/review/user/product`;
        } else {
            body = { invoiceId, shopId: targetId, star: reviewStar, content };
            url = editingReviewId
                ? `${BASE_URL}/api/review/user/shop/${editingReviewId}`
                : `${BASE_URL}/api/review/user/shop`;
        }

        const response = await authFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            toastr.success(editingReviewId ? "Cập nhật đánh giá thành công" : "Đánh giá thành công");
            bootstrap.Modal.getInstance(document.getElementById("reviewModal"))?.hide();

            const currentId = Number(document.getElementById("invoiceCodeText").innerText.replace("#", ""));
            if (currentId) openInvoiceDetail(currentId);
            return;
        }

        const text = await response.text();
        toastr.error(text || "Đánh giá thất bại");
    } catch (e) {
        console.error("Lỗi submitReview:", e);
        toastr.error(e.message || "Không thể kết nối server");
    }
}

// ==================== HỦY ĐƠN HÀNG ====================

async function cancelInvoice(id) {
    // Sử dụng SweetAlert2 để tạo popup nhập lý do chuyên nghiệp
    const { value: reason } = await Swal.fire({
        title: 'Xác nhận hủy đơn hàng',
        input: 'textarea',
        inputLabel: 'Vui lòng nhập lý do hủy đơn của bạn:',
        inputPlaceholder: 'Nhập lý do tại đây (ví dụ: Thay đổi địa chỉ, Đổi ý không mua nữa...)',
        inputAttributes: {
            'aria-label': 'Nhập lý do hủy đơn của bạn'
        },
        showCancelButton: true,
        confirmButtonColor: '#d33', // Màu đỏ cho nút Hủy đơn
        cancelButtonColor: '#3085d6', // Màu xanh cho nút Quay lại
        confirmButtonText: 'Xác nhận hủy',
        cancelButtonText: 'Quay lại',
        inputValidator: (value) => {
            // Tự động kiểm tra nếu user để trống hoặc chỉ gõ khoảng trắng
            if (!value || !value.trim()) {
                return 'Bạn bắt buộc phải nhập lý do để hủy đơn hàng!';
            }
        }
    });

    // Nếu người dùng bấm nút "Quay lại" (Cancel) hoặc click ra ngoài popup
    if (!reason) return;

    try {
        // Gửi lý do (đã qua trim) lên server qua URL parameter
        const cleanReason = reason.trim();
        const url = `${BASE_URL}/api/invoice/user/cancel-invoice?idInvoice=${id}&reason=${encodeURIComponent(cleanReason)}`;

        const res = await authFetch(url, { method: "POST" });

        // Sử dụng res.ok cho chuẩn Fetch API
        if (res.ok) {
            // Hiển thị thông báo thành công dạng popup đẹp mắt thay vì toastr thông thường (tùy bạn chọn)
            Swal.fire(
                'Thành công!',
                'Đơn hàng của bạn đã được hủy thành công.',
                'success'
            );
            loadMyInvoice();
        } else {
            // Đọc lỗi an toàn đề phòng server không trả về JSON
            let errorMessage = "Không thể hủy đơn";
            const contentType = res.headers.get("content-type");

            if (contentType && contentType.includes("application/json")) {
                const result = await res.json();
                errorMessage = result.defaultMessage || errorMessage;
            } else {
                const textMessage = await res.text();
                if (textMessage) errorMessage = textMessage;
            }
            toastr.warning(errorMessage);
        }
    } catch (e) {
        console.error("Lỗi cancelInvoice:", e);
        toastr.error("Có lỗi xảy ra, vui lòng thử lại sau");
    }
}

// ==================== TÌM KIẾM ĐƠN HÀNG ====================

async function timKiemDonHang() {
    const id = document.getElementById("madonhang").value.trim();
    const phone = document.getElementById("sodienthoai").value.trim();

    if (!id || !phone) {
        toastr.warning("Vui lòng nhập mã đơn hàng và số điện thoại");
        return;
    }

    // Button loading state
    const btn = document.getElementById("btnTimDon");
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tìm...'; }

    try {
        const response = await fetch(
            `${BASE_URL}/api/invoice/public/tim-kiem-don-hang?id=${id}&phone=${phone}`
        );
        const result = await response.json();

        if (response.status === EXCEPTION_CODE) {
            toastr.warning(result.defaultMessage);
            // Show not-found empty state
            var ea = document.getElementById("orderResultArea");
            if (ea) ea.innerHTML = `
                <div class="tdk-empty">
                    <div class="tdk-empty-icon"><i class="fa-solid fa-circle-xmark" style="color:#fca5a5"></i></div>
                    <h3>Không tìm thấy đơn hàng</h3>
                    <p>${result.defaultMessage || 'Vui lòng kiểm tra lại mã đơn hàng và số điện thoại'}</p>
                </div>`;
            var tbl = document.getElementById("my-orders-table");
            if (tbl) tbl.style.display = 'none';
            return;
        }

        // Build status badge
        function payBadge(status) {
            if (!status) return '—';
            var s = status.toLowerCase();
            if (s.includes('chưa') || s.includes('chua')) return `<span class="status-badge status-pending">${status}</span>`;
            if (s.includes('đã') || s.includes('da')) return `<span class="status-badge status-paid">${status}</span>`;
            return `<span class="status-badge status-pending">${status}</span>`;
        }
        function shipBadge(status) {
            if (!status) return '—';
            var s = status.toLowerCase();
            if (s.includes('chưa') || s.includes('chua')) return `<span class="status-badge status-pending">${status}</span>`;
            if (s.includes('đang') || s.includes('dang')) return `<span class="status-badge status-shipping">${status}</span>`;
            if (s.includes('đã giao') || s.includes('hoàn')) return `<span class="status-badge status-done">${status}</span>`;
            if (s.includes('huỷ') || s.includes('huy')) return `<span class="status-badge status-cancel">${status}</span>`;
            return `<span class="status-badge status-pending">${status}</span>`;
        }

        // Hide empty state, show table
        var ea = document.getElementById("orderResultArea");
        if (ea) ea.innerHTML = '';
        var tbl = document.getElementById("my-orders-table");
        if (tbl) tbl.style.display = 'table';

        document.getElementById("listinvoice").innerHTML = `
            <tr onclick="openInvoiceDetail(${result.id})" style="cursor:pointer">
                <td><a class="order-id-link">#${result.id}</a></td>
                <td style="color:var(--tx2);font-size:13px">${result.createdTime || ""} ${result.createdDate || ""}</td>
                <td style="font-size:13px;max-width:200px">${result.address || "—"}</td>
                <td style="text-align:right;font-weight:700;color:#ef4444">${formatmoney(result.totalAmount)}</td>
                <td style="text-align:right">${formatmoney(result.shipCost)}</td>
                <td>${payBadge(result.payType)}</td>
                <td>${shipBadge(result.statusInvoice)}</td>
                <td><i class="fa-solid fa-chevron-right" style="color:var(--tx3);font-size:12px"></i></td>
            </tr>
        `;
        toastr.success("Tìm thấy đơn hàng #" + result.id);
    } catch (e) {
        console.error("Lỗi timKiemDonHang:", e);
        toastr.error("Không thể tìm kiếm đơn hàng");
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Tra cứu'; }
    }
}

// ==================== BẢO HÀNH ====================

function openModalMoTa(idDetail) {
    document.getElementById("ivdetail").value = idDetail;
    $("#modaldeail").modal("show");
}
