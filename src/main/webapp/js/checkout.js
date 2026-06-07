/**
 * checkout.js — Multi-shop checkout
 * Mỗi shop có voucher riêng, phí ship riêng, tạm tính riêng.
 * Tổng thanh toán = Σ(subtotal + ship - discount) của tất cả shop.
 */

var token = localStorage.getItem("token");
var exceptionCode = 417;

// shopMap[shopId] = { subtotal, ship, discount, qty, voucherCode }
var shopMap = {};

// ─── Cache địa chỉ GHN để không gọi lại nhiều lần ───
var _ghnCache = null; // { tinh, huyen, xa }

// ==================== UTILITIES ====================

async function checkroleUser() {
    try {
        const res = await fetch('http://localhost:8080/api/user/check-role-user', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status > 300) window.location.replace('login');
    } catch (e) {
        window.location.replace('login');
    }
}

function formatmoneyCheck(money) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(money || 0));
}

function getVariantDisplayName(variant) {
    if (!variant) return "Mặc định";
    const t1 = variant.tier1value || "", t2 = variant.tier2value || "";
    if (t1 && t2) return `${t1} / ${t2}`;
    if (t1) return t1;
    if (t2) return t2;
    return "Mặc định";
}

function getCheckoutImage(product, variant) {
    if (variant?.image?.trim()) return variant.image;
    if (product?.imageBanner?.trim()) return product.imageBanner;
    return "image/product1.webp";
}

// ==================== GRAND TOTAL ====================

function updateGrandTotal() {
    let grandTotal = 0, totalQty = 0;
    Object.values(shopMap).forEach(s => {
        grandTotal += Math.max(0, (s.subtotal || 0) + (s.ship || 0) - (s.discount || 0));
        totalQty += (s.qty || 0);
    });
    const elG = document.getElementById("grandTotal");
    if (elG) elG.textContent = formatmoneyCheck(grandTotal);
    const elQ = document.getElementById("slcartcheckout");
    if (elQ) elQ.textContent = totalQty;
}

// ==================== PER-SHOP UI ====================

function updateShopUI(sid) {
    const s = shopMap[String(sid)];
    if (!s) return;

    const get = id => document.getElementById(id);
    const shopTotal = Math.max(0, (s.subtotal || 0) + (s.ship || 0) - (s.discount || 0));

    if (get(`sub_${sid}`)) get(`sub_${sid}`).textContent = formatmoneyCheck(s.subtotal);

    if (get(`ship_${sid}`)) {
        const el = get(`ship_${sid}`);
        if (s.ship === null || s.ship === undefined) {
            el.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang tính...';
            el.style.color = '#94a3b8';
        } else if (s.ship === 0) {
            el.textContent = 'Miễn phí';
            el.style.color = '#059669';
        } else {
            el.textContent = formatmoneyCheck(s.ship);
            el.style.color = '#1e293b';
        }
    }

    if (get(`disc_${sid}`)) {
        get(`disc_${sid}`).textContent = s.discount > 0 ? '- ' + formatmoneyCheck(s.discount) : '—';
    }

    if (get(`shopTotal_${sid}`)) {
        get(`shopTotal_${sid}`).textContent = formatmoneyCheck(shopTotal);
    }

    updateGrandTotal();
}

// ==================== LOAD CART ====================

async function loadCartCheckOut() {
    if (!token) { window.location.replace("login"); return; }

    // Kiểm tra cart trống
    const resCount = await fetch('http://localhost:8080/api/cart/user/count-cart', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const count = Number(await resCount.text());
    if (count === 0) {
        alert("Bạn chưa có sản phẩm nào trong giỏ hàng!");
        window.location.replace("giohang");
        return;
    }

    // Lấy danh sách cart
    const res = await fetch('http://localhost:8080/api/cart/user/my-cart', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) { toastr.error("Không tải được giỏ hàng"); return; }

    const list = await res.json();

    // ── Nhóm theo shop ──
    const byShop = {}; // shopId → { shopName, avatar, items[] }
    list.forEach(item => {
        const product = item.product || {};
        const shop = product.shop || {};
        const sid = String(shop.id || 0);

        if (!byShop[sid]) {
            byShop[sid] = {
                shopId: sid,
                shopName: shop.shopName || shop.name || ("Shop #" + sid),
                avatar: shop.avatar || "",
                items: []
            };
        }
        byShop[sid].items.push(item);
    });

    // ── Build HTML ──
    shopMap = {};
    let allHtml = "";

    Object.values(byShop).forEach(shopData => {
        const sid = String(shopData.shopId);
        let subtotal = 0, totalQty = 0;
        let itemsHtml = "";

        shopData.items.forEach(item => {
            const product = item.product || {};
            const variant = item.productVariant || {};
            const qty = Number(item.quantity || 0);
            const price = Number(variant.price || product.price || 0);
            const img = getCheckoutImage(product, variant);
            const vName = getVariantDisplayName(variant);
            subtotal += qty * price;
            totalQty += qty;

            itemsHtml += `
            <div style="display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid #e2e8f0;">
                <div style="position:relative;flex-shrink:0;">
                    <img src="${img}" style="width:54px;height:54px;border-radius:8px;object-fit:contain;padding:3px;background:#f8fafc;border:1px solid #e2e8f0;" onerror="this.src='image/product1.webp'">
                    <span style="position:absolute;top:-6px;right:-6px;background:#475569;color:#fff;font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;">${qty}</span>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${product.name || ''}">${product.name || ''}</div>
                    <div style="font-size:11.5px;color:#64748b;margin-top:3px;">${vName}</div>
                </div>
                <div style="font-size:13px;font-weight:700;color:#1e293b;white-space:nowrap;">${formatmoneyCheck(qty * price)}</div>
            </div>`;
        });

        // Khởi tạo shopMap entry, ship=null (chưa tính)
        shopMap[sid] = { subtotal, ship: null, discount: 0, qty: totalQty, voucherCode: null };

        const initial = (shopData.shopName || "S")[0].toUpperCase();
        const avatarHtml = shopData.avatar
            ? `<img src="${shopData.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : `<span style="color:#fff;font-weight:800;font-size:15px;">${initial}</span>`;

        allHtml += `
        <div style="background:#fff;border-radius:14px;border:1px solid #e2e8f0;box-shadow:0 2px 12px rgba(0,0,0,.07);margin-bottom:16px;overflow:hidden;">

            <!-- HEADER SHOP -->
            <div style="padding:14px 18px;border-bottom:1px solid #e2e8f0;background:#f8fafc;display:flex;align-items:center;gap:10px;">
                <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#0d9488,#065f46);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
                    ${avatarHtml}
                </div>
                <span style="font-size:14px;font-weight:700;color:#0f172a;">${shopData.shopName}</span>
                <span style="margin-left:auto;font-size:11px;color:#94a3b8;">${totalQty}&nbsp;sản phẩm</span>
            </div>

            <!-- PRODUCTS -->
            <div>${itemsHtml}</div>

            <!-- VOUCHER -->
            <div style="padding:14px 18px;border-top:1px solid #e2e8f0;background:#fafbfc;">
                <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">
                    <i class="fa-solid fa-tag" style="color:#0d9488;margin-right:4px;"></i>Mã giảm giá shop này
                </div>
                <div style="display:flex;gap:8px;">
                    <input id="voucher_${sid}"
                        placeholder="Nhập mã voucher..."
                        style="flex:1;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:inherit;color:#1e293b;outline:none;background:#fff;"
                        onkeydown="if(event.key==='Enter') applyVoucher('${sid}')">
                    <button onclick="applyVoucher('${sid}')"
                        style="padding:9px 16px;background:linear-gradient(135deg,#0d9488,#065f46);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit;">
                        Áp dụng
                    </button>
                </div>
                <div id="vouOk_${sid}" style="display:none;margin-top:7px;font-size:12px;color:#059669;font-weight:600;align-items:center;gap:6px;">
                    <i class="fa-solid fa-circle-check"></i> <span id="vouOkTxt_${sid}"></span>
                </div>
                <div id="vouErr_${sid}" style="display:none;margin-top:7px;font-size:12px;color:#ef4444;font-weight:600;align-items:center;gap:6px;">
                    <i class="fa-solid fa-circle-xmark"></i> <span id="vouErrTxt_${sid}"></span>
                </div>
            </div>

            <!-- PER-SHOP TOTALS -->
            <div style="padding:14px 18px;background:#fff;border-top:1px solid #e2e8f0;">
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:5px 0;border-bottom:1px dashed #e2e8f0;">
                    <span style="color:#64748b;">Tạm tính</span>
                    <span style="font-weight:600;color:#1e293b;" id="sub_${sid}">${formatmoneyCheck(subtotal)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:5px 0;border-bottom:1px dashed #e2e8f0;">
                    <span style="color:#64748b;">Phí vận chuyển</span>
                    <span style="font-weight:600;color:#94a3b8;" id="ship_${sid}">
                        <i class="fa fa-spinner fa-spin"></i> Đang tính...
                    </span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:5px 0;border-bottom:1px dashed #e2e8f0;">
                    <span style="color:#64748b;">Giảm giá voucher</span>
                    <span style="font-weight:600;color:#059669;" id="disc_${sid}">—</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 0;border-top:2px solid #e2e8f0;margin-top:4px;">
                    <span style="font-size:13px;font-weight:600;color:#64748b;">Tổng shop này</span>
                    <span style="font-size:15px;font-weight:800;color:#ef4444;" id="shopTotal_${sid}">—</span>
                </div>
            </div>

        </div>`;
    });

    document.getElementById("shopsContainer").innerHTML = allHtml;
    updateGrandTotal();
}

// ==================== PHÍ VẬN CHUYỂN ====================

function removeAccents(str) {
    if (!str) return "";
    return str.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "d");
}

function cleanStringForMatch(s) {
    if (!s) return "";
    let clean = removeAccents(s).toLowerCase();
    // Replaces dots, hyphens, commas with space
    clean = clean.replace(/[\.\-\,]/g, " ");
    // Clean double spaces
    clean = clean.replace(/\s+/g, " ").trim();
    // Normalize administrative prefixes
    clean = clean.replace(/^(tinh|thanh pho|tp|quan|huyen|thi xa|tx|phuong|xa|thi tran|tt)\s+/g, "");
    // Replace 'k' with 'c' to handle Kạn / Cạn mismatch
    clean = clean.replace(/k/g, "c");
    // Remove non-alphanumeric characters
    clean = clean.replace(/[^a-z0-9]/g, "");
    return clean.trim();
}

function addrMatch(a, b) {
    if (!a || !b) return false;
    const cleanA = cleanStringForMatch(a);
    const cleanB = cleanStringForMatch(b);
    return cleanA.includes(cleanB) || cleanB.includes(cleanA);
}

async function layTinhShip(tenTinh) {
    const res = await fetch('http://localhost:8080/api/shipping/public/province');
    const data = await res.json();
    return (data.data || []).find(p => addrMatch(tenTinh, p.ProvinceName)) || null;
}

async function layHuyenShip(tenHuyen, provinceId) {
    const res = await fetch(`http://localhost:8080/api/shipping/public/district?provinceId=${provinceId}`);
    const data = await res.json();
    return (data.data || []).find(d => addrMatch(tenHuyen, d.DistrictName)) || null;
}

async function layXaShip(tenXa, districtId) {
    const res = await fetch(`http://localhost:8080/api/shipping/public/wards?districtId=${districtId}`);
    const data = await res.json();
    return (data.data || []).find(w => addrMatch(tenXa, w.WardName)) || null;
}

/**
 * Lấy GHN from-codes từ địa chỉ mặc định của shop.
 * Gọi endpoint /api/shop-address/public/primary trả về { provinceName, districtName, wardName }.
 */
async function getShopFromGHN(shopId) {
    try {
        const res = await fetch(`/api/shop-address/public/primary?shopId=${shopId}`);
        if (!res.ok) {
            console.warn(`[Ship] Shop ${shopId} chưa có địa chỉ (${res.status})`);
            return null;
        }

        const addr = await res.json();
        // Response: { provinceName, districtName, wardName }
        const tenTinh = addr?.provinceName;
        const tenHuyen = addr?.districtName;
        const tenXa = addr?.wardName;

        console.log(`[Ship] Shop ${shopId} → tỉnh: "${tenTinh}", huyện: "${tenHuyen}", xã: "${tenXa}"`);

        if (!tenTinh || !tenHuyen || !tenXa) {
            console.warn(`[Ship] Shop ${shopId} thiếu tên địa chỉ`);
            return null;
        }

        const tinh = await layTinhShip(tenTinh);
        if (!tinh) { console.warn(`[Ship] Không match tỉnh GHN: "${tenTinh}"`); return null; }

        const huyen = await layHuyenShip(tenHuyen, tinh.ProvinceID);
        if (!huyen) { console.warn(`[Ship] Không match huyện GHN: "${tenHuyen}"`); return null; }

        const xa = await layXaShip(tenXa, huyen.DistrictID);
        if (!xa) { console.warn(`[Ship] Không match xã GHN: "${tenXa}"`); return null; }

        console.log(`[Ship] Shop ${shopId} GHN from → districtId: ${huyen.DistrictID}, wardCode: ${xa.WardCode}`);
        return { districtId: huyen.DistrictID, wardCode: xa.WardCode };

    } catch (e) {
        console.warn(`[Ship] Lỗi getShopFromGHN(${shopId}):`, e.message);
        return null;
    }
}

async function tinhPhiGHN(fromDistrictId, fromWardCode, toDistrictId, toWardCode, qty) {
    const weight = qty * 500 > 3000 ? 3000 : qty * 500;
    let url = `/api/shipping/tinh-phi?toDistrictId=${toDistrictId}&toWardCode=${toWardCode}&weight=${weight}`;
    if (fromDistrictId) url += `&fromDistrictId=${fromDistrictId}&fromWardCode=${fromWardCode}`;
    const res = await fetch(url);
    const data = await res.json();
    return Number(data?.data?.total || 30000);
}

/**
 * Gọi bởi addressuser.js khi user chọn địa chỉ
 */
async function capNhatPhiShip(address) {
    if (!address) return;

    // Hiển thị spinner cho tất cả shop
    Object.keys(shopMap).forEach(sid => {
        const el = document.getElementById(`ship_${sid}`);
        if (el) el.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang tính...';
    });

    // Tra cứu GHN to-address một lần duy nhất
    let toGHN = null;
    try {
        const tenTinh = address.wards.districts.province.name;
        const tenHuyen = address.wards.districts.name;
        const tenXa = address.wards.name;

        const tinh = await layTinhShip(tenTinh);
        if (!tinh) throw new Error("Không tìm thấy tỉnh: " + tenTinh);

        const huyen = await layHuyenShip(tenHuyen, tinh.ProvinceID);
        if (!huyen) throw new Error("Không tìm thấy huyện: " + tenHuyen);

        const xa = await layXaShip(tenXa, huyen.DistrictID);
        if (!xa) throw new Error("Không tìm thấy xã: " + tenXa);

        toGHN = { districtId: huyen.DistrictID, wardCode: xa.WardCode };
        _ghnCache = toGHN;

    } catch (e) {
        console.warn("[Ship] Không tìm được địa chỉ user:", e.message);
        toastr.warning("Không tính được phí vận chuyển, áp dụng phí mặc định 30.000đ");
        Object.keys(shopMap).forEach(sid => {
            shopMap[sid].ship = 30000;
            updateShopUI(sid);
        });
        return;
    }

    // Tính phí riêng từng shop (from = địa chỉ shop, to = địa chỉ user)
    for (const sid of Object.keys(shopMap)) {
        try {
            const from = await getShopFromGHN(sid);
            const phi = await tinhPhiGHN(
                from?.districtId || null,
                from?.wardCode || null,
                toGHN.districtId,
                toGHN.wardCode,
                shopMap[sid].qty
            );
            shopMap[sid].ship = phi;
        } catch (e) {
            console.warn(`[Ship] Lỗi tính phí shop ${sid}:`, e.message);
            shopMap[sid].ship = 30000;
        }
        updateShopUI(sid);
    }
}

// ==================== VOUCHER ====================

async function applyVoucher(sid) {
    sid = String(sid);
    const inputEl = document.getElementById(`voucher_${sid}`);
    const okEl = document.getElementById(`vouOk_${sid}`);
    const errEl = document.getElementById(`vouErr_${sid}`);
    const okTxtEl = document.getElementById(`vouOkTxt_${sid}`);
    const errTxtEl = document.getElementById(`vouErrTxt_${sid}`);

    const code = inputEl?.value?.trim() || "";
    if (okEl) okEl.style.display = 'none';
    if (errEl) errEl.style.display = 'none';

    // Xóa voucher nếu ô trống
    if (!code) {
        shopMap[sid].discount = 0;
        shopMap[sid].voucherCode = null;
        updateShopUI(sid);
        return;
    }

    const s = shopMap[sid];
    const amount = (s.subtotal || 0) + (s.ship || 0);

    try {
        const res = await fetch(`http://localhost:8080/api/voucher/public/findByCode?code=${code}&amount=${amount}&shopId=${sid}`);

        const result = await res.json();

        if (res.status === exceptionCode) {
            if (errEl) { errEl.style.display = 'flex'; }
            if (errTxtEl) errTxtEl.textContent = result.defaultMessage || "Mã không hợp lệ hoặc chưa đủ điều kiện";
            s.discount = 0;
            s.voucherCode = null;
        } else if (res.ok) {
            if (okEl) { okEl.style.display = 'flex'; }
            if (okTxtEl) okTxtEl.textContent = `Giảm ${formatmoneyCheck(result.discount)}`;
            s.discount = result.discount || 0;
            s.voucherCode = result.code;
        }
        updateShopUI(sid);
    } catch (e) {
        toastr.error("Không kiểm tra được mã giảm giá");
    }
}

// ==================== CHECKOUT ====================

function checkout() {
    const sids = Object.keys(shopMap);
    if (sids.length === 0) { toastr.warning("Giỏ hàng trống!"); return; }

    const addressId = document.getElementById("sodiachi")?.value;
    if (!addressId) { toastr.warning("Vui lòng chọn địa chỉ giao hàng!"); return; }

    // Kiểm tra ship đã tính chưa
    const shipChuaTinh = sids.some(sid => shopMap[sid].ship === null);
    if (shipChuaTinh) { toastr.warning("Vui lòng chọn địa chỉ để tính phí vận chuyển!"); return; }

    const paytype = document.querySelector('input[name=paytype]:checked')?.value;

    const confirmed = confirm(`Xác nhận đặt ${sids.length} đơn hàng?`);
    if (!confirmed) return;

    if (paytype === "momo") requestPayMentMomo();
    else paymentCod();
}

// ─── COD — Tạo 1 invoice per shop ───
async function paymentCod() {
    const sids = Object.keys(shopMap);
    const addressId = document.getElementById("sodiachi").value;
    const note = document.getElementById("ghichudonhang")?.value || "";

    const btn = document.getElementById("btnDatHang");
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang xử lý...'; }

    let successCount = 0;
    const errors = [];

    for (const sid of sids) {
        const s = shopMap[sid];
        const body = {
            payType: "COD",
            userAddressId: Number(addressId),
            voucherCode: s.voucherCode || "",
            note: note,
            shipCost: s.ship || 0,
            shopId: Number(sid)
        };

        try {
            const res = await fetch('http://localhost:8080/api/invoice/user/create', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (res.status < 300) {
                successCount++;
            } else {
                const r = await res.json().catch(() => ({}));
                errors.push(r.defaultMessage || `Lỗi đặt đơn hàng shop #${sid}`);
            }
        } catch (e) {
            errors.push(`Không kết nối được server (shop #${sid})`);
        }
    }

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-lock"></i> Đặt hàng ngay'; }

    if (successCount > 0 && errors.length === 0) {
        swal({ title: "Thành công!", text: `Đặt ${successCount} đơn hàng thành công!`, type: "success" },
            () => window.location.replace("taikhoan#invoice"));
    } else if (successCount > 0) {
        toastr.warning(`${successCount} đơn thành công, ${errors.length} đơn thất bại: ${errors.join('; ')}`);
        setTimeout(() => window.location.replace("taikhoan#invoice"), 3000);
    } else {
        toastr.error("Đặt hàng thất bại: " + errors.join('; '));
    }
}

// ─── MoMo — 1 link với grand total, lưu state vào localStorage ───
async function requestPayMentMomo() {
    const addressId = document.getElementById("sodiachi").value;
    const note = document.getElementById("ghichudonhang")?.value || "";

    // Tính grand total
    let grandTotal = 0;
    Object.values(shopMap).forEach(s => {
        grandTotal += Math.max(0, (s.subtotal || 0) + (s.ship || 0) - (s.discount || 0));
    });

    // Lưu state
    localStorage.setItem('multiShopData', JSON.stringify(shopMap));
    localStorage.setItem('ghichudonhang', note);
    localStorage.setItem('sodiachi', addressId);

    try {
        const res = await fetch('http://localhost:8080/api/urlpayment', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: "Sellora - Thanh toán đơn hàng",
                returnUrl: 'http://localhost:8080/thanhcong',
                notifyUrl: 'http://localhost:8080/thanhcong',
                codeVoucher: "",
                totalAmount: grandTotal   // gửi grand total thực tế, server dùng trực tiếp
            })
        });

        const result = await res.json();
        if (res.status < 300) {
            window.open(result.url, '_blank');
        } else {
            toastr.warning(result.defaultMessage || "Không tạo được link MoMo");
        }
    } catch (e) {
        toastr.error("Không tạo được link thanh toán MoMo");
    }
}

// ─── MoMo callback — tạo invoice từng shop từ localStorage ───
async function paymentMomo() {
    try {
        const uls = new URL(document.URL);
        const orderId = uls.searchParams.get("orderId");
        const requestId = uls.searchParams.get("requestId");
        const note = localStorage.getItem("ghichudonhang") || "";
        const addressId = localStorage.getItem("sodiachi");
        const raw = localStorage.getItem("multiShopData");

        if (!raw) {
            // Fallback: single invoice (backward compat)
            await _paymentMomoSingle(orderId, requestId, note, addressId);
            return;
        }

        const shops = JSON.parse(raw);
        const sids = Object.keys(shops);
        let successCount = 0;

        for (const sid of sids) {
            const s = shops[sid];
            const body = {
                payType: "MOMO",
                userAddressId: Number(addressId),
                voucherCode: s.voucherCode || "",
                note: note,
                shipCost: s.ship || 0,
                shopId: Number(sid),
                requestIdMomo: requestId,
                orderIdMomo: orderId
            };

            try {
                const res = await fetch('http://localhost:8080/api/invoice/user/create', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (res.status < 300) successCount++;
            } catch (e) { /* continue */ }
        }

        localStorage.removeItem('multiShopData');

        const okEl = document.getElementById("thanhcong");
        const failEl = document.getElementById("thatbai");
        if (successCount > 0) {
            if (okEl) okEl.style.display = 'block';
            if (failEl) failEl.style.display = 'none';
            toastr.success("Thanh toán MoMo thành công!");
        } else {
            if (failEl) failEl.style.display = 'block';
            if (okEl) okEl.style.display = 'none';
        }

    } catch (e) {
        console.error(e);
        const failEl = document.getElementById("thatbai");
        if (failEl) failEl.style.display = 'block';
    }
}

async function _paymentMomoSingle(orderId, requestId, note, addressId) {
    const body = {
        payType: "MOMO",
        userAddressId: addressId,
        voucherCode: localStorage.getItem("voucherCode") || "",
        note: note,
        requestIdMomo: requestId,
        orderIdMomo: orderId,
        shipCost: localStorage.getItem("shipCost") || 0
    };

    const res = await fetch('http://localhost:8080/api/invoice/user/create', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const okEl = document.getElementById("thanhcong");
    const failEl = document.getElementById("thatbai");
    if (res.status < 300) {
        if (okEl) okEl.style.display = 'block';
        if (failEl) failEl.style.display = 'none';
    } else {
        const result = await res.json().catch(() => ({}));
        if (failEl) failEl.style.display = 'block';
        const errEl = document.getElementById("errormess");
        if (errEl) errEl.textContent = result?.defaultMessage || "Thanh toán thất bại";
    }
}
