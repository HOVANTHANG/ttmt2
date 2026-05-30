// =========================================================
// Admin – Duyệt sản phẩm từ cửa hàng (product-approval.js)
// =========================================================

const BASE = 'http://localhost:8080';

// Trạng thái phân trang
let currentPage = 0;
let currentKeyword = '';

// ── Load badge số sản phẩm chờ duyệt ─────────────────────
async function loadPendingBadge() {
    try {
        const res = await fetch(`${BASE}/api/admin/shop/product/pending/count`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return;
        const data = await res.json();
        const badge = document.getElementById('pendingBadge');
        if (badge) {
            badge.textContent = data.count || 0;
            badge.style.display = data.count > 0 ? 'inline-flex' : 'none';
        }
    } catch (e) { console.error(e); }
}

// ── Load danh sách sản phẩm chờ duyệt ────────────────────
async function loadPendingProducts(page = 0, keyword = '') {
    currentPage = page;
    currentKeyword = keyword;

    const tbody = document.getElementById('pendingList');
    tbody.innerHTML = `<tr><td colspan="8" class="pa-state">
        <div class="pa-spinner"></div><span>Đang tải dữ liệu...</span>
    </td></tr>`;

    let url = `${BASE}/api/admin/shop/product/pending?page=${page}&size=10`;
    if (keyword.trim()) url += `&keyword=${encodeURIComponent(keyword.trim())}`;

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        const list = data.content || [];
        const totalPages = data.totalPages || 0;

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="pa-state">
                <i class="fa-solid fa-check-circle" style="color:#10b981;font-size:2rem;"></i>
                <span>Không có sản phẩm nào đang chờ duyệt!</span>
            </td></tr>`;
            document.getElementById('pendingPagination').innerHTML = '';
            return;
        }

        let html = '';
        list.forEach(p => {
            const shop = p.shop ? p.shop.shopName : '<em>Không có shop</em>';
            const cat = p.category ? p.category.name : '—';
            const brand = p.tradeMark ? p.tradeMark.name : '—';
            const img = p.imageBanner
                ? `<img src="${p.imageBanner}" class="pa-thumb" onerror="this.style.display='none'">`
                : `<div class="pa-thumb-ph"><i class="fa-solid fa-image"></i></div>`;
            const date = p.createdDate || '';

            html += `
            <tr id="pa-row-${p.id}">
                <td><span class="pa-id">#${p.id}</span></td>
                <td>${img}</td>
                <td>
                    <div class="pa-name" title="${(p.name || '').replace(/"/g, '&quot;')}">${p.name || '—'}</div>
                    <div class="pa-code">${p.code || ''}</div>
                </td>
                <td>${shop}</td>
                <td>${cat}</td>
                <td>${brand}</td>
                <td>${date}</td>
                <td>
                    <div class="pa-actions">
                       <button class="pa-btn pa-btn-detail"
                        style="background:#3b82f6;color:#fff;"
                        onclick="viewProductDetail(${p.id})">
                        <i class="fa-solid fa-eye"></i> Chi tiết
                    </button>
                        <button class="pa-btn pa-btn-approve" onclick="approveProduct(${p.id})" title="Duyệt">
                            <i class="fa-solid fa-circle-check"></i> Duyệt
                        </button>
                        <button class="pa-btn pa-btn-reject" onclick="openRejectModal(${p.id},'${(p.name || '').replace(/'/g, '\\\'')}')" title="Từ chối">
                            <i class="fa-solid fa-circle-xmark"></i> Từ chối
                        </button>
                    </div>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;

        // Phân trang
        let pages = '';
        for (let i = 0; i < totalPages; i++) {
            pages += `<li class="page-item ${i === page ? 'active' : ''}">
                <a class="page-link" href="javascript:void(0)"
                   onclick="loadPendingProducts(${i}, '${keyword.replace(/'/g, "\\'")}')">
                   ${i + 1}
                </a>
            </li>`;
        }
        document.getElementById('pendingPagination').innerHTML = pages;

    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="8" class="pa-state">
            <i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;font-size:2rem;"></i>
            <span>Lỗi tải dữ liệu. Vui lòng thử lại.</span>
        </td></tr>`;
    }
}

// ── Duyệt sản phẩm ────────────────────────────────────────
async function approveProduct(id) {
    if (!confirm('Bạn có chắc muốn DUYỆT sản phẩm này?')) return;

    try {
        const res = await fetch(`${BASE}/api/admin/shop/product/${id}/approve`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            toastr.success('Sản phẩm đã được duyệt thành công!');
            // Xóa row khỏi bảng
            const row = document.getElementById(`pa-row-${id}`);
            if (row) row.remove();
            loadPendingBadge();
            // Nếu hết sản phẩm trong trang thì reload
            const tbody = document.getElementById('pendingList');
            if (!tbody.querySelector('tr') || tbody.innerHTML.trim() === '') {
                loadPendingProducts(currentPage > 0 ? currentPage - 1 : 0, currentKeyword);
            }
        } else {
            const err = await res.json();
            toastr.error(err.defaultMessage || 'Có lỗi xảy ra!');
        }
    } catch (e) {
        toastr.error('Lỗi kết nối máy chủ!');
    }
}

// ── Mở modal từ chối ──────────────────────────────────────
let rejectTargetId = null;

function openRejectModal(id, name) {
    rejectTargetId = id;
    document.getElementById('rejectProductName').textContent = name;
    document.getElementById('rejectReason').value = '';

    const detailModalElem = document.getElementById('detailModal');
    const detailModal = bootstrap.Modal.getInstance(detailModalElem) || new bootstrap.Modal(detailModalElem);
    detailModal.hide();

    const modal = new bootstrap.Modal(document.getElementById('rejectModal'));
    modal.show();
}

// ── Xác nhận từ chối ─────────────────────────────────────
async function confirmReject() {
    if (!rejectTargetId) return;
    const reason = document.getElementById('rejectReason').value.trim();

    try {
        const res = await fetch(`${BASE}/api/admin/shop/product/${rejectTargetId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });
        bootstrap.Modal.getInstance(document.getElementById('rejectModal')).hide();
        if (res.ok) {
            toastr.warning('Sản phẩm đã bị từ chối.');
            const row = document.getElementById(`pa-row-${rejectTargetId}`);
            if (row) row.remove();
            loadPendingBadge();
            const tbody = document.getElementById('pendingList');
            if (!tbody.querySelector('tr') || tbody.innerHTML.trim() === '') {
                loadPendingProducts(currentPage > 0 ? currentPage - 1 : 0, currentKeyword);
            }
        } else {
            const err = await res.json();
            toastr.error(err.defaultMessage || 'Có lỗi xảy ra!');
        }
    } catch (e) {
        toastr.error('Lỗi kết nối máy chủ!');
    }
    rejectTargetId = null;
}

// ── Tìm kiếm ─────────────────────────────────────────────
function searchPending() {
    const kw = document.getElementById('searchPendingInput').value;
    loadPendingProducts(0, kw);
}

// ── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    loadPendingProducts(0, '');
    loadPendingBadge();

    // Tìm kiếm khi nhấn Enter
    const inp = document.getElementById('searchPendingInput');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') searchPending(); });
});
// ===================== DETAIL MODAL =====================
async function viewProductDetail(id) {
    // Reset modal
    document.getElementById('detailBody').innerHTML =
        '<div style="text-align:center;padding:40px;"><div class="pa-spinner" style="margin:0 auto 12px;"></div><p>Đang tải chi tiết...</p></div>';

    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();

    try {

        const res = await fetch(`${BASE}/api/product/admin/detail/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        const p = await res.json();
        const images = (p.productImages || []).map(img =>
            `<img src="${img.image}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" onerror="this.style.display='none'">`
        ).join('');

        const variants = (p.productVariants || []).map(v =>
            `<tr>
                <td style="text-align: center;">${v.tier1value || '—'}</td>
                <td style="text-align: center;">${v.tier2value || '—'}</td>
                <td style="font-weight:600;color:#10b981; text-align: center;">${fmt(v.price)}</td>
                <td style="text-align: center;">${v.quantity ?? 0}</td>
            </tr>`
        ).join('');

        document.getElementById('detailBody').innerHTML = `
        <div style="display:flex;gap:24px;flex-wrap:wrap;">

            <!-- Ảnh banner -->
            <div style="flex:0 0 200px;">
                ${p.imageBanner
                ? `<img src="${p.imageBanner}" style="width:200px;height:200px;object-fit:cover;border-radius:12px;border:1px solid #e5e7eb;">`
                : `<div style="width:200px;height:200px;border-radius:12px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:3rem;"><i class="fa-solid fa-image"></i></div>`
            }
                <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">${images}</div>
            </div>

            <!-- Thông tin cơ bản -->
            <div style="flex:1;min-width:240px;">
                <h5 style="font-weight:700;color:#111827;margin-bottom:4px;">${p.name}</h5>
                <div style="font-size:.8rem;color:#6b7280;margin-bottom:14px;">Mã: <strong>${p.code || '—'}</strong></div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;font-size:.85rem;">
                    <div><span style="color:#6b7280;">Cửa hàng:</span><br><strong>${p.shop ? p.shop.shopName : '—'}</strong></div>
                    <div><span style="color:#6b7280;">Danh mục:</span><br><strong>${p.category ? p.category.name : '—'}</strong></div>
                    <div><span style="color:#6b7280;">Thương hiệu:</span><br><strong>${p.tradeMark ? p.tradeMark.name : '—'}</strong></div>
                    <div><span style="color:#6b7280;">Giá niêm yết:</span><br><strong style="color:#ef4444;">${fmt(p.price)}</strong></div>
                    <div><span style="color:#6b7280;">Giá gốc:</span><br><strong style="text-decoration:line-through;color:#9ca3af;">${fmt(p.oldPrice)}</strong></div>
                    <div><span style="color:#6b7280;">Ngày tạo:</span><br><strong>${p.createdDate ? p.createdDate.substring(0, 10) : '—'}</strong></div>
                </div>

                <!-- Mô tả -->
                ${p.description ? `
                <div style="margin-top:16px;">
                    <div style="font-weight:600;font-size:.85rem;color:#374151;margin-bottom:6px;">Mô tả sản phẩm</div>
                    <div style="font-size:.83rem;color:#4b5563;line-height:1.6;max-height:120px;overflow-y:auto;background:#f9fafb;border-radius:8px;padding:10px;border:1px solid #e5e7eb;">${p.description}</div>
                </div>` : ''}
            </div>
        </div>

        <!-- Biến thể -->
        ${variants ? `
        <div style="margin-top:20px;">
            <div style="font-weight:600;font-size:.87rem;color:#374151;margin-bottom:8px;"><i class="fa-solid fa-layer-group me-1"></i>Biến thể sản phẩm</div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:.83rem;">
                    <thead>
                        <tr style="background:#f3f4f6;">
                            <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Giá trị 1</th>
                            <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Giá trị 2</th>
                            <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Giá</th>
                            <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Số lượng</th>
                        </tr>
                    </thead>
                    <tbody>${variants}</tbody>
                </table>
            </div>
        </div>` : ''}

    
        <div style="margin-top:22px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #e5e7eb;padding-top:16px;">
              <button class="pa-btn pa-btn-approve" onclick="approveProduct(${p.id})" title="Duyệt">
                            <i class="fa-solid fa-circle-check"></i> Duyệt
                        </button>
                        <button class="pa-btn pa-btn-reject" onclick="openRejectModal(${p.id},'${(p.name || '').replace(/'/g, '\\\'')}')" title="Từ chối">
                            <i class="fa-solid fa-circle-xmark"></i> Từ chối
                        </button>
        </div>`;

    } catch (e) {
        document.getElementById('detailBody').innerHTML =
            '<div style="text-align:center;padding:40px;color:#ef4444;"><i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;display:block;margin-bottom:8px;"></i>Không tải được chi tiết sản phẩm.</div>';
        console.error(e);
    }
}
function fmt(val) {
    if (val == null) return '—';
    return Number(val).toLocaleString('vi-VN') + 'đ';
}
