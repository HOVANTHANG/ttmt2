// ==================== SHOP ADDRESS ====================

var tokenShop = localStorage.getItem("token");
var BASE_SHOP = "http://localhost:8080";

async function loadAddressShop() {
    try {
        const res = await fetch(BASE_SHOP + '/api/shop-address/seller/my-address', {
            headers: { 'Authorization': 'Bearer ' + tokenShop }
        });
        if (!res.ok) throw new Error("Không tải được địa chỉ");
        const list = await res.json();

        let html = '';
        for (let i = 0; i < list.length; i++) {
            const a = list[i];
            const defaultBadge = a.primaryAddres
                ? '<span class="address-card-default"><i class="fas fa-check-circle"></i> Mặc định</span>'
                : '';
            html += `
            <div class="address-card">
                <div class="address-card-header">
                    <div>
                        <span class="address-card-name">${a.fullname}</span>
                        ${defaultBadge}
                    </div>
                    <div class="address-card-actions">
                        <button onclick="loadShopAddressById(${a.id})" data-bs-toggle="modal"
                            data-bs-target="#modalShopAdd" class="btn-action btn-edit">
                            <i class="fas fa-pen"></i> Sửa
                        </button>
                        <button onclick="deleteShopAddress(${a.id})" class="btn-action btn-delete">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                    </div>
                </div>
                <div class="address-card-info">
                    <div class="info-item">
                        <i class="fas fa-home"></i>
                        <span>${a.streetName}, ${a.wards.name}, ${a.wards.districts.name}, ${a.wards.districts.province.name}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-phone"></i>
                        <span>${a.phone}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-calendar"></i>
                        <span>${a.createdDate}</span>
                    </div>
                </div>
            </div>`;
        }
        document.getElementById("listShopAddress").innerHTML = html ||
            '<p class="text-muted text-center py-4">Chưa có địa chỉ nào. Hãy thêm địa chỉ kho hàng!</p>';
    } catch (e) {
        console.error("Lỗi loadAddressShop:", e);
    }
}

async function loadShopAddressById(id) {
    try {
        const res = await fetch(BASE_SHOP + '/api/shop-address/seller/findById?id=' + id, {
            headers: { 'Authorization': 'Bearer ' + tokenShop }
        });
        const a = await res.json();
        document.getElementById("shopAddId").value      = a.id;
        document.getElementById("shopAddName").value    = a.fullname;
        document.getElementById("shopAddPhone").value   = a.phone;
        document.getElementById("shopAddStreet").value  = a.streetName;
        document.getElementById("shopAddPrimary").checked = a.primaryAddres === true;

        // Load dropdowns
        document.getElementById("shopAddTinh").value = a.wards.districts.province.id;
        await loadShopHuyen(a.wards.districts.province.id);
        document.getElementById("shopAddHuyen").value = a.wards.districts.id;
        await loadShopXa(a.wards.districts.id);
        document.getElementById("shopAddXa").value = a.wards.id;
    } catch (e) {
        console.error("Lỗi loadShopAddressById:", e);
        toastr.error("Không tải được địa chỉ");
    }
}

function clearShopAddressForm() {
    document.getElementById("shopAddId").value      = "";
    document.getElementById("shopAddName").value    = "";
    document.getElementById("shopAddPhone").value   = "";
    document.getElementById("shopAddStreet").value  = "";
    document.getElementById("shopAddPrimary").checked = false;
    document.getElementById("shopAddTinh").value    = 0;
    document.getElementById("shopAddHuyen").innerHTML = '<option value="" hidden>---</option>';
    document.getElementById("shopAddXa").innerHTML   = '<option value="" hidden>---</option>';
}

async function saveShopAddress() {
    const id     = document.getElementById("shopAddId").value;
    const name   = document.getElementById("shopAddName").value.trim();
    const phone  = document.getElementById("shopAddPhone").value.trim();
    const street = document.getElementById("shopAddStreet").value.trim();
    const ward   = document.getElementById("shopAddXa").value;
    const primary = document.getElementById("shopAddPrimary").checked;

    if (!name || !phone || !street || !ward) {
        toastr.warning("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    const body = {
        id: id ? Number(id) : null,
        fullname: name,
        phone: phone,
        streetName: street,
        primaryAddres: primary,
        wards: { id: Number(ward) }
    };

    const url = (id && id !== "")
        ? BASE_SHOP + '/api/shop-address/seller/update'
        : BASE_SHOP + '/api/shop-address/seller/create';

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + tokenShop,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (res.status < 300) {
            toastr.success("Lưu địa chỉ thành công!");
            bootstrap.Modal.getInstance(document.getElementById("modalShopAdd"))?.hide();
            await loadAddressShop();
        } else {
            const err = await res.json().catch(() => ({}));
            toastr.warning(err.defaultMessage || "Lưu thất bại");
        }
    } catch (e) {
        console.error("Lỗi saveShopAddress:", e);
        toastr.error("Lỗi kết nối server");
    }
}

async function deleteShopAddress(id) {
    if (!confirm("Bạn chắc chắn muốn xóa địa chỉ này?")) return;
    try {
        const res = await fetch(BASE_SHOP + '/api/shop-address/seller/delete?id=' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + tokenShop }
        });
        if (res.status < 300) {
            toastr.success("Xóa địa chỉ thành công!");
            await loadAddressShop();
        } else {
            const err = await res.json().catch(() => ({}));
            toastr.warning(err.defaultMessage || "Xóa thất bại");
        }
    } catch (e) {
        console.error("Lỗi deleteShopAddress:", e);
        toastr.error("Lỗi kết nối server");
    }
}

// ── Province / District / Ward dropdowns cho Shop Address ──

var shopAddressList = [];

async function loadShopTinh() {
    const res = await fetch('http://localhost:8080/api/address/public/province');
    shopAddressList = await res.json();
    let html = '<option value="" disabled selected>-- Chọn tỉnh --</option>';
    shopAddressList.forEach(p => { html += `<option value="${p.id}">${p.name}</option>`; });
    document.getElementById("shopAddTinh").innerHTML = html;
}

async function loadShopHuyen(provinceId) {
    for (let p of shopAddressList) {
        if (p.id == provinceId) {
            let html = '<option value="" hidden>-- Chọn huyện --</option>';
            p.districts.forEach(d => { html += `<option value="${d.id}">${d.name}</option>`; });
            document.getElementById("shopAddHuyen").innerHTML = html;
            document.getElementById("shopAddXa").innerHTML = '<option value="" hidden>-- Chọn xã --</option>';
            return;
        }
    }
}

async function loadShopXa(districtId) {
    const provinceId = document.getElementById("shopAddTinh").value;
    for (let p of shopAddressList) {
        if (p.id == provinceId) {
            for (let d of p.districts) {
                if (d.id == districtId) {
                    let html = '<option value="" hidden>-- Chọn xã --</option>';
                    d.wards.forEach(w => { html += `<option value="${w.id}">${w.name}</option>`; });
                    document.getElementById("shopAddXa").innerHTML = html;
                    return;
                }
            }
        }
    }
}
