const BASE_URL = "http://localhost:8080";
let selectedShopId = null;

window.onload = function () {
    if (typeof loadMenu === "function") {
        loadMenu();
    }
    loadPendingSeller();
};

function getToken() {
    return localStorage.getItem("token");
}

async function loadPendingSeller() {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/admin/seller/pending`, {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    if (!res.ok) {
        alert("Không tải được danh sách shop chờ duyệt");
        return;
    }

    const list = await res.json();
    renderSellerList(list);
}

function renderSellerList(list) {
    let html = "";

    list.forEach(item => {
        html += `
                    <tr>
                        <td>#${item.id}</td>
                        <td>
                            <div class="d-flex align-items-center gap-3">
                                <div class="shop-avatar-wrap">
                                    ${item.avatar
                ? `<img src="${item.avatar}" onerror="this.style.display='none';this.parentNode.innerHTML='<span class=shop-avatar-initial>' + '${escapeHtml(item.shopName || 'S').charAt(0)}' + '</span>'">`
                : `<span class="shop-avatar-initial">${escapeHtml(item.shopName || 'S').charAt(0)}</span>`
            }
                                </div>
                                <div>
                                    <div class="shop-name">${escapeHtml(item.shopName)}</div>
                                    <div class="shop-slug">${escapeHtml(item.shopSlug)}</div>
                                </div>
                            </div>
                        </td>

                        <td>
                            <div>${escapeHtml(item.ownerFullname || item.ownerUsername || "Không rõ")}</div>
                            <small class="text-muted">${escapeHtml(item.ownerEmail || "")}</small>
                        </td>

                        <td>
                            <div>${escapeHtml(item.phone || "")}</div>
                            <small class="text-muted">${escapeHtml(item.email || "")}</small>
                        </td>

                        <td>
                            <span class="badge badge-pending text-dark bg-warning">${item.status || "PENDING"}</span>
                        </td>

                        <td>
                            <div class="action-btns">
                                <button class="btn btn-primary btn-sm" onclick="viewShopDetail(${item.id})">
                                    <i class="fas fa-eye"></i> Chi tiết
                                </button>
                                <button class="btn btn-success btn-sm" onclick="approveSeller(${item.id})">
                                    <i class="fas fa-check"></i> Duyệt
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="rejectSeller(${item.id})">
                                    <i class="fas fa-times"></i> Từ chối
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
    });

    document.getElementById("listSeller").innerHTML =
        html || `<tr><td colspan="6" class="text-center py-4">Không có shop nào đang chờ duyệt</td></tr>`;
}

async function viewShopDetail(id) {
    selectedShopId = id;

    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/admin/seller/detail/${id}`, {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    if (!res.ok) {
        alert("Không tải được chi tiết shop");
        return;
    }

    const item = await res.json();

    document.getElementById("shopDetailBody").innerHTML = `
                <div class="row g-4">
                    <div class="col-md-3 text-center">
                        <div class="detail-avatar-wrap mx-auto">
                            ${item.avatar
            ? `<img src="${item.avatar}" onerror="this.style.display='none';this.parentNode.innerHTML='<span class=detail-avatar-initial>${escapeHtml(item.shopName || 'S').charAt(0)}</span>'">`
            : `<span class="detail-avatar-initial">${escapeHtml(item.shopName || 'S').charAt(0)}</span>`
        }
                        </div>
                        <div class="mt-2 fw-bold">${escapeHtml(item.shopName)}</div>
                        <span class="badge badge-pending mt-1 text-dark bg-warning">${item.status || "PENDING"}</span>
                    </div>

                    <div class="col-md-9">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="detail-label">Tên shop</div>
                                <div class="detail-value">${escapeHtml(item.shopName)}</div>
                            </div>

                            <div class="col-md-6">
                                <div class="detail-label">Slug</div>
                                <div class="detail-value">${escapeHtml(item.shopSlug)}</div>
                            </div>

                            <div class="col-md-6">
                                <div class="detail-label">Số điện thoại shop</div>
                                <div class="detail-value">${escapeHtml(item.phone)}</div>
                            </div>

                            <div class="col-md-6">
                                <div class="detail-label">Email shop</div>
                                <div class="detail-value">${escapeHtml(item.email)}</div>
                            </div>

                            <div class="col-md-6">
                                <div class="detail-label">Chủ shop</div>
                                <div class="detail-value">${escapeHtml(item.ownerFullname || item.ownerUsername)}</div>
                            </div>

                            <div class="col-md-6">
                                <div class="detail-label">Email tài khoản</div>
                                <div class="detail-value">${escapeHtml(item.ownerEmail)}</div>
                            </div>

                            <div class="col-12">
                                <div class="detail-label">Mô tả shop</div>
                                <div class="p-3 bg-light rounded">
                                    ${escapeHtml(item.description || "Không có mô tả")}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

    document.getElementById("btnApproveInModal").onclick = function () {
        approveSeller(selectedShopId);
    };

    document.getElementById("btnRejectInModal").onclick = function () {
        rejectSeller(selectedShopId);
    };

    const modal = new bootstrap.Modal(document.getElementById("shopDetailModal"));
    modal.show();
}

async function approveSeller(id) {
    if (!confirm("Bạn có chắc muốn duyệt shop này?")) return;

    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/admin/seller/approve/${id}`, {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    if (res.ok) {
        toastr.success('Shop đã được duyệt thành công!');
        loadPendingSeller();
        closeModal();
    } else {
        toastr.error('Duyệt shop thất bại');
    }
}

async function rejectSeller(id) {
    if (!confirm("Bạn có chắc muốn từ chối shop này?")) return;

    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/admin/seller/reject/${id}`, {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    if (res.ok) {
        toastr.warning('Shop đã bị từ chối!');
        loadPendingSeller();
        closeModal();
    } else {
        toastr.error('Từ chối shop thất bại');
    }
}

function closeModal() {
    const modalEl = document.getElementById("shopDetailModal");
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
}

function escapeHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}