var tokenStock = localStorage.getItem("token");
var BASE_SHOP = "http://localhost:8080";
var allProductsStockList = [];

$(document).ready(function () {
    loadStockProducts();

    // Bind search keyup event
    $("#searchtable").on("keyup", function() {
        filterStockProducts();
    });
});

async function loadStockProducts() {
    try {
        const res = await fetch(BASE_SHOP + '/api/product/seller/my-shop-products?page=0&size=1000', {
            headers: { 'Authorization': 'Bearer ' + tokenStock }
        });
        if (!res.ok) throw new Error("Không tải được danh sách sản phẩm");
        const result = await res.json();
        const rawList = result.content || [];
        
        // Chỉ hiển thị sản phẩm trạng thái APPROVED, không bị khóa và không bị xóa
        allProductsStockList = rawList.filter(p => p.status === 'APPROVED' && !p.locked && !p.deleted);

        filterStockProducts();
    } catch (e) {
        console.error(e);
        toastr.error("Lỗi khi tải danh sách sản phẩm!");
    }
}

function filterStockProducts() {
    const searchVal = ($("#searchtable").val() || "").toLowerCase().trim();
    const categoryId = $("#danhmuc").val();
    const trademarkId = $("#thuonghieu").val();

    let filtered = allProductsStockList.filter(p => {
        // Tên sản phẩm
        const nameMatch = !searchVal || p.name.toLowerCase().includes(searchVal) || p.code.toLowerCase().includes(searchVal);
        // Danh mục
        const categoryMatch = !categoryId || (p.category && p.category.id == categoryId);
        // Thương hiệu
        const trademarkMatch = !trademarkId || (p.tradeMark && p.tradeMark.id == trademarkId);

        return nameMatch && categoryMatch && trademarkMatch;
    });

    renderStockProductsTable(filtered);
}

async function renderStockProductsTable(list) {
    let html = '';
    const body = document.getElementById("listProductStock");
    
    if (list.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    <i class="fas fa-box-open fa-2x mb-2"></i>
                    <div>Không có sản phẩm nào phù hợp.</div>
                </td>
            </tr>`;
        document.getElementById("resultCount").textContent = "0 biến thể";
        return;
    }

    let index = 1;
    let totalVariantsCount = 0;

    for (let i = 0; i < list.length; i++) {
        const p = list[i];
        const img = p.imageBanner || '/image/product1.webp';
        const variants = p.productVariants || [];
        totalVariantsCount += variants.length;

        if (variants.length === 0) {
            // Trường hợp sản phẩm không có biến thể nào
            html += `
            <tr style="vertical-align: middle;">
                <td>${index++}</td>
                <td><img src="${img}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;" /></td>
                <td>
                    <div class="fw-bold">${p.name}</div>
                    <small class="text-muted">${p.code}</small>
                </td>
                <td class="text-muted">Mặc định</td>
                <td><span class="text-muted">Chưa cấu hình kho</span></td>
                <td class="text-center fw-bold">0</td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary" disabled>🏢 Phân bổ</button>
                </td>
            </tr>`;
        } else {
            for (let j = 0; j < variants.length; j++) {
                const v = variants[j];
                const variantName = [v.tier1value, v.tier2value].filter(Boolean).join(' / ') || 'Mặc định';
                const rowKey = `row-alloc-${v.id}`;

                // Tạo dòng trống có ID để nạp allocations bất đồng bộ
                html += `
                <tr style="vertical-align: middle;">
                    <td>${j === 0 ? index++ : ''}</td>
                    <td>${j === 0 ? `<img src="${img}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;" />` : ''}</td>
                    <td>
                        ${j === 0 ? `<div class="fw-bold">${p.name}</div><small class="text-muted">${p.code}</small>` : ''}
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            ${v.image ? `<img src="${v.image}" style="width:30px; height:30px; border-radius:4px; object-fit:cover;" />` : ''}
                            <span>${variantName}</span>
                        </div>
                    </td>
                    <td id="${rowKey}">
                        <span class="text-muted"><i class="fas fa-spinner fa-spin me-1"></i> Đang tải kho...</span>
                    </td>
                    <td class="text-center fw-bold" id="total-qty-${v.id}">${v.quantity || 0}</td>
                    <td>
                        <button onclick="openAllocModal(${v.id}, '${p.name.replace(/'/g, "\\'")} - ${variantName.replace(/'/g, "\\'")}')" class="btn-alloc btn btn-sm">
                            <i class="fas fa-warehouse me-1"></i> Phân bổ
                        </button>
                    </td>
                </tr>`;

                // Tải allocations chạy ngầm
                loadAllocationsInline(v.id, rowKey);
            }
        }
    }

    body.innerHTML = html;
    document.getElementById("resultCount").textContent = totalVariantsCount + " biến thể";
}

async function loadAllocationsInline(variantId, elementId) {
    try {
        const res = await fetch(`${BASE_SHOP}/api/warehouse-inventory/seller/allocations?variantId=${variantId}`, {
            headers: { 'Authorization': 'Bearer ' + tokenStock }
        });
        if (!res.ok) throw new Error();
        const allocs = await res.json();
        const el = document.getElementById(elementId);
        if (!el) return;

        // Lọc những kho có số lượng > 0
        const activeAllocs = allocs.filter(a => a.quantity > 0);
        if (activeAllocs.length === 0) {
            el.innerHTML = `<span class="text-muted" style="font-size:12px;"><i class="fas fa-exclamation-circle me-1"></i>Chưa phân bổ kho</span>`;
        } else {
            let badgeHtml = '';
            activeAllocs.forEach(a => {
                badgeHtml += `<span class="warehouse-badge" title="${a.address}">${a.warehouseName}: ${a.quantity}</span> `;
            });
            el.innerHTML = badgeHtml;
        }
    } catch (e) {
        const el = document.getElementById(elementId);
        if (el) el.innerHTML = `<span class="text-danger" style="font-size:12px;">Lỗi tải kho</span>`;
    }
}

var currentAllocations = [];

async function openAllocModal(variantId, title) {
    document.getElementById("allocVariantId").value = variantId;
    document.getElementById("allocVariantName").textContent = title;
    document.getElementById("allocList").innerHTML = `
        <div class="text-center py-3">
            <i class="fas fa-spinner fa-spin fa-2x text-muted"></i>
        </div>`;
    
    try {
        const res = await fetch(`${BASE_SHOP}/api/warehouse-inventory/seller/allocations?variantId=${variantId}`, {
            headers: { 'Authorization': 'Bearer ' + tokenStock }
        });
        if (!res.ok) throw new Error("Không tải được phân bổ");
        currentAllocations = await res.json();

        renderAllocModalList();
    } catch(e) {
        console.error(e);
        toastr.error("Lỗi khi tải thông tin phân bổ kho!");
    }
}

function renderAllocModalList() {
    let html = '';
    currentAllocations.forEach((alloc, index) => {
        html += `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
                <div class="fw-bold text-dark" style="font-size:14px;">${alloc.warehouseName}</div>
                <div class="text-muted" style="font-size:11px;">${alloc.address || 'Địa chỉ chưa cập nhật'}</div>
            </div>
            <div>
                <input type="number" class="form-control-stock" value="${alloc.quantity || 0}" min="0" oninput="changeAllocQty(${index}, this.value)">
            </div>
        </div>`;
    });

    document.getElementById("allocList").innerHTML = html;
    updateAllocTotal();

    const modal = new bootstrap.Modal(document.getElementById('modalAllocation'));
    modal.show();
}

function changeAllocQty(index, val) {
    let qty = parseInt(val);
    if (isNaN(qty) || qty < 0) qty = 0;
    currentAllocations[index].quantity = qty;
    updateAllocTotal();
}

function updateAllocTotal() {
    const total = currentAllocations.reduce((sum, item) => sum + (item.quantity || 0), 0);
    document.getElementById("allocTotalQty").textContent = total;
}

async function saveAllocations() {
    const variantId = document.getElementById("allocVariantId").value;
    
    try {
        const res = await fetch(`${BASE_SHOP}/api/warehouse-inventory/seller/update-allocations?variantId=${variantId}`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + tokenStock,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentAllocations)
        });

        if (res.ok) {
            toastr.success("Lưu phân bổ kho thành công!");
            
            // Đóng modal
            const modalEl = document.getElementById("modalAllocation");
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) {
                modalInstance.hide();
            }

            // Tải lại dữ liệu
            await loadStockProducts();
        } else {
            toastr.error("Không thể lưu phân bổ!");
        }
    } catch(e) {
        console.error(e);
        toastr.error("Lỗi kết nối server!");
    }
}
