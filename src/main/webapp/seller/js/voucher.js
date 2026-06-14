var token = localStorage.getItem("token");
var size = 10;
async function loadVoucher(page, start, end) {


    var url = 'http://localhost:8080/api/voucher/seller/findAll-page?page=' + page + '&size=' + size;
    if (start != null && start != "" && end != null && end != "" && start != 'null' && end != 'null') {
        url += '&start=' + start + '&end=' + end
    }
    const response = await fetch(url, {
        method: 'GET',
        headers: new Headers({
            'Authorization': 'Bearer ' + token,
        }),
    });
    var result = await response.json();
    console.log(result)
    var list = result.content;
    var totalPage = result.totalPages;
    var main = '';

    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const today = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);

    for (i = 0; i < list.length; i++) {
        var isPerc = list[i].isPercentage || false;
        var typeBadge = isPerc 
            ? `<span class="badge bg-info" style="font-size: 11.5px; font-weight: 600; padding: 5px 10px; border-radius: 6px;">Phần trăm (%)</span>`
            : `<span class="badge bg-secondary" style="font-size: 11.5px; font-weight: 600; padding: 5px 10px; border-radius: 6px;">Tiền mặt (đ)</span>`;
            
        var discDisplay = "-";
        if (list[i].discount != null) {
            discDisplay = isPerc ? list[i].discount + '%' : formatmoney(list[i].discount);
        }
        
        var applyAll = list[i].applyAll !== false;
        var applyCount = list[i].voucherProducts ? list[i].voucherProducts.length : 0;
        var applyBadge = applyAll
            ? `<span class="badge bg-success" style="font-size: 11.5px; font-weight: 600; padding: 5px 10px; border-radius: 6px;">Tất cả sản phẩm</span>`
            : `<span class="badge bg-warning text-dark" style="font-size: 11.5px; font-weight: 600; padding: 5px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="showVoucherProductsModal(${list[i].id})"><i class="fas fa-eye"></i> Sản phẩm (${applyCount})</span>`;

        main += `<tr>
                    <td>${list[i].id}</td>
                    <td>${list[i].code}</td>
                    <td>${list[i].name}</td>
                    <td>${formatmoney(list[i].minAmount)}</td>
                    <td>${typeBadge}</td>
                    <td>${discDisplay}</td>
                    <td>${applyBadge}</td>
                    <td>${list[i].startDate}</td>
                    <td>${list[i].endDate}</td>
                    <td>${list[i].block == true || list[i].endDate <= today ? '<span class="locked">Đã khóa</span>' : '<span class="actived">Đang hoạt động</span>'}</td>
                    <td class="sticky-col">
                        <div class="act-group">
                            <button onclick="deleteVoucher(${list[i].id})" class="btn-act btn-act-red" data-tip="Xóa">
                                <i class="fa fa-trash"></i>
                            </button>
                            <a href="addvoucher?id=${list[i].id}" class="btn-act btn-act-teal" data-tip="Sửa">
                                <i class="fa fa-edit"></i>
                            </a>
                        </div>
                    </td>
                </tr>`
    }
    document.getElementById("listvoucher").innerHTML = main
    var mainpage = ''
    for (i = 1; i <= totalPage; i++) {
        mainpage += `<li onclick="loadVoucher(${(Number(i) - 1)},'${start}','${end}')" class="page-item"><a class="page-link" href="#listsp">${i}</a></li>`
    }
    document.getElementById("pageable").innerHTML = mainpage
}


async function filter() {
    var start = document.getElementById("start").value
    var end = document.getElementById("end").value
    if (start != "" && end != "") {
        loadVoucher(0, start, end);
    }
}


var allProducts = [];

function updateDiscountLabel() {
    var isPercentage = document.getElementById("type_percentage").checked;
    document.getElementById("discount-label").textContent = isPercentage ? "Giảm giá (%)" : "Giảm giá (đ)";
    document.getElementById("prod-discount-type-hint").textContent = isPercentage ? "%" : "đ";
}

function toggleProductSelection() {
    var show = document.getElementById("apply_specific").checked;
    document.getElementById("product-selection-container").style.display = show ? "block" : "none";
}

async function loadShopProductsForVoucher() {
    try {
        var url = 'http://localhost:8080/api/product/seller/my-shop-products?size=1000';
        const response = await fetch(url, {
            method: 'GET',
            headers: new Headers({
                'Authorization': 'Bearer ' + token
            })
        });
        if (response.ok) {
            var result = await response.json();
            allProducts = result.content || [];
            renderProductCheckboxes();
        }
    } catch (e) {
        console.error("Lỗi tải danh sách sản phẩm: ", e);
    }
}

function renderProductCheckboxes() {
    const container = document.getElementById("product-list-checkboxes");
    if (!container) return;
    
    let html = "";
    if (allProducts.length === 0) {
        html = `<div style="font-size: 12px; color: var(--tx2); padding: 10px; text-align: center;">Không có sản phẩm nào</div>`;
    } else {
        allProducts.forEach(prod => {
            html += `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                    <input type="checkbox" class="product-voucher-chk" value="${prod.id}" id="prod_chk_${prod.id}" style="cursor: pointer; width: 16px; height: 16px;" onchange="toggleProductDiscountInput(${prod.id})">
                    <label for="prod_chk_${prod.id}" style="cursor: pointer; font-size: 13px; color: var(--tx); display: flex; align-items: center; gap: 8px; margin: 0; font-weight: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <img src="${prod.imageBanner || '/image/product1.webp'}" style="width: 30px; height: 30px; border-radius: 4px; object-fit: contain; border: 1px solid #e2e8f0; background: #fff;" onerror="this.src='/image/product1.webp'">
                        <span>${prod.name}</span>
                    </label>
                </div>
                <div style="flex-shrink: 0; display: flex; align-items: center; gap: 5px;">
                    <input type="number" class="form-control form-control-sm product-voucher-discount-input" id="prod_disc_${prod.id}" placeholder="Nhập mức giảm..." style="width: 100px; padding: 4px 8px !important; font-size: 12px !important; display: none;" min="0">
                </div>
            </div>
            `;
        });
    }
    container.innerHTML = html;
}

function toggleProductDiscountInput(prodId) {
    var checked = document.getElementById("prod_chk_" + prodId).checked;
    var input = document.getElementById("prod_disc_" + prodId);
    if (input) {
        input.style.display = checked ? "block" : "none";
        if (checked && !input.value) {
            input.value = document.getElementById("discount").value || 0;
        }
    }
}

function setSelectedProducts(voucherProductsList) {
    if (!voucherProductsList) return;
    voucherProductsList.forEach(vp => {
        if (vp.product && vp.product.id) {
            var chk = document.getElementById("prod_chk_" + vp.product.id);
            if (chk) {
                chk.checked = true;
                toggleProductDiscountInput(vp.product.id);
                var input = document.getElementById("prod_disc_" + vp.product.id);
                if (input) {
                    input.value = vp.discount;
                }
            }
        }
    });
}

async function loadAVoucher() {
    var uls = new URL(document.URL)
    var id = uls.searchParams.get("id");
    if (id != null) {
        var url = 'http://localhost:8080/api/voucher/seller/findById?id=' + id;
        const response = await fetch(url, {
            method: 'GET',
            headers: new Headers({
                'Authorization': 'Bearer ' + token
            })
        });
        var result = await response.json();
        document.getElementById("code").value = result.code
        document.getElementById("namevoucher").value = result.name
        document.getElementById("minamount").value = result.minAmount
        document.getElementById("discount").value = result.discount
        document.getElementById("from").value = result.startDate
        document.getElementById("to").value = result.endDate
        result.block == true ? document.getElementById("lockvoucher").checked = true : false;

        var titleEl = document.getElementById("page-title");
        if (titleEl) {
            titleEl.textContent = "Cập nhật Voucher: " + result.code;
        }

        if (result.isPercentage) {
            document.getElementById("type_percentage").checked = true;
        } else {
            document.getElementById("type_flat").checked = true;
        }
        updateDiscountLabel();

        if (result.applyAll === false) {
            document.getElementById("apply_specific").checked = true;
            document.getElementById("product-selection-container").style.display = "block";
            setSelectedProducts(result.voucherProducts || []);
        } else {
            document.getElementById("apply_all").checked = true;
            document.getElementById("product-selection-container").style.display = "none";
        }
    }
}

async function saveVoucher() {
    var uls = new URL(document.URL)
    var id = uls.searchParams.get("id");
    id = id ? Number(id) : null;
    var code = document.getElementById("code").value
    var namevoucher = document.getElementById("namevoucher").value
    var minamount = document.getElementById("minamount").value
    var discount = document.getElementById("discount").value
    var from = document.getElementById("from").value
    var to = document.getElementById("to").value
    var lockvoucher = document.getElementById("lockvoucher").checked

    var isPercentage = document.getElementById("type_percentage").checked;
    var applyAll = document.getElementById("apply_all").checked;

    var selectedProducts = [];
    if (!applyAll) {
        var checkboxes = document.querySelectorAll(".product-voucher-chk:checked");
        checkboxes.forEach(chk => {
            var prodId = Number(chk.value);
            var discInput = document.getElementById("prod_disc_" + prodId);
            var prodDisc = discInput ? Number(discInput.value) : 0;
            selectedProducts.push({
                "product": { "id": prodId },
                "discount": prodDisc
            });
        });
        if (selectedProducts.length === 0) {
            toastr.warning("Vui lòng chọn ít nhất một sản phẩm và nhập mức giảm!");
            return;
        }
    }

    var url = 'http://localhost:8080/api/voucher/seller/create';
    if (id != null) {
        url = 'http://localhost:8080/api/voucher/seller/update';
    }
    var voucher = {
        "id": id,
        "code": code,
        "name": namevoucher,
        "discount": discount === "" ? null : Number(discount),
        "minAmount": minamount === "" ? null : Number(minamount),
        "startDate": from === "" ? null : from,
        "endDate": to === "" ? null : to,
        "block": lockvoucher,
        "isPercentage": isPercentage,
        "applyAll": applyAll,
        "voucherProducts": selectedProducts
    }
    const response = await fetch(url, {
        method: 'POST',
        headers: new Headers({
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify(voucher)
    });
    if (response.status < 300) {
        swal({
            title: "Thông báo",
            text: "thêm/sửa voucher thành công!",
            type: "success"
        },
            function () {
                window.location.href = 'voucher'
            });
    }
    if (response.status == exceptionCode) {
        var result = await response.json()
        toastr.warning(result.defaultMessage);
    }
}

async function deleteVoucher(id) {
    var con = confirm("Bạn chắc chắn muốn xóa voucher này?");
    if (con == false) {
        return;
    }
    var url = 'http://localhost:8080/api/voucher/seller/delete?id=' + id;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: new Headers({
            'Authorization': 'Bearer ' + token
        })
    });
    if (response.status < 300) {
        toastr.success("xóa voucher thành công!");
        loadVoucher(null, document.getElementById("start").value, document.getElementById("end").value)
    }
    if (response.status == exceptionCode) {
        var result = await response.json()
        toastr.warning(result.defaultMessage);
    }
}

async function showVoucherProductsModal(voucherId) {
    var modalList = document.getElementById("modal-products-list");
    if (!modalList) return;
    
    modalList.innerHTML = `<div style="text-align: center; padding: 20px;"><i class="fa fa-spinner fa-spin" style="font-size: 20px; color: var(--p);"></i> Đang tải...</div>`;
    
    var myModal = new bootstrap.Modal(document.getElementById('voucherProductsModal'));
    myModal.show();
    
    try {
        var url = 'http://localhost:8080/api/voucher/seller/findById?id=' + voucherId;
        const response = await fetch(url, {
            method: 'GET',
            headers: new Headers({
                'Authorization': 'Bearer ' + token
            })
        });
        if (response.ok) {
            var result = await response.json();
            var list = result.voucherProducts || [];
            if (list.length === 0) {
                modalList.innerHTML = `<div style="text-align: center; color: var(--tx2); font-size: 13px;">Không có sản phẩm nào được chỉ định.</div>`;
            } else {
                let html = "";
                list.forEach(vp => {
                    if (vp.product) {
                        html += `
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff;">
                            <img src="${vp.product.imageBanner || '/image/product1.webp'}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: contain; background: #f8fafc; border: 1px solid #e2e8f0;" onerror="this.src='/image/product1.webp'">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 13px; font-weight: 600; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${vp.product.name}</div>
                                <div style="font-size: 11px; color: var(--tx2); margin-top: 2px;">Mã SP: ${vp.product.code || vp.product.id}</div>
                            </div>
                            <div style="font-size: 12px; font-weight: 700; color: var(--p); background: rgba(13,148,136,0.1); padding: 4px 8px; border-radius: 8px;">
                                Giảm: ${result.isPercentage ? vp.discount + '%' : formatmoney(vp.discount)}
                            </div>
                        </div>`;
                    }
                });
                modalList.innerHTML = html;
            }
        } else {
            modalList.innerHTML = `<div style="text-align: center; color: var(--tx2); font-size: 13px;">Không tải được thông tin sản phẩm.</div>`;
        }
    } catch (e) {
        modalList.innerHTML = `<div style="text-align: center; color: var(--tx2); font-size: 13px;">Lỗi kết nối server.</div>`;
    }
}