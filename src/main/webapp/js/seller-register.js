const BASE_URL = "http://localhost:8080";
const UPLOAD_API = BASE_URL + "/api/public/upload-file";

let avatarUrl = "";
let isUploadingAvatar = false;

// ─────────────────────────────────────────────
// Helpers: Inline field error
// ─────────────────────────────────────────────
function showFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errEl = document.getElementById(fieldId + "Error");
    if (input) {
        input.classList.add("sr-input-error");
        input.classList.remove("sr-input-ok");
    }
    if (errEl) {
        errEl.textContent = message;
        errEl.removeAttribute("style");     // xóa inline style=display:none
        errEl.classList.add("visible");     // hiện qua class .visible
    }
}

function clearFieldError(fieldId) {
    const input = document.getElementById(fieldId);
    const errEl = document.getElementById(fieldId + "Error");
    if (input) input.classList.remove("sr-input-error");
    if (errEl) {
        errEl.textContent = "";
        errEl.classList.remove("visible");  // ẩn lại
        errEl.style.display = "none";      // đảm bảo ẩn
    }
}

function showFieldOk(fieldId) {
    const input = document.getElementById(fieldId);
    if (input) {
        input.classList.remove("sr-input-error");
        input.classList.add("sr-input-ok");
    }
    clearFieldError(fieldId);
}

function clearAllErrors() {
    ["shopName", "shopSlug", "phone", "email"].forEach(clearFieldError);
}

// ─────────────────────────────────────────────
// Toast helpers (dùng toastr)
// ─────────────────────────────────────────────
function configToastr() {
    if (typeof toastr === "undefined") return;
    toastr.options = {
        positionClass: "toast-top-right",
        timeOut: 4000,
        closeButton: true,
        progressBar: true,
        newestOnTop: true,
        preventDuplicates: true
    };
}

// ─────────────────────────────────────────────
// Realtime validation khi blur từng field
// ─────────────────────────────────────────────
function initRealtimeValidation() {
    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    const emailRegex = /^[\w.+\-]+@[\w\-]+(\.[\w\-]+)+$/;
    const slugRegex  = /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/;

    document.getElementById("shopName").addEventListener("blur", function () {
        const v = this.value.trim();
        if (!v) return showFieldError("shopName", "⚠ Tên shop không được để trống.");
        if (v.length < 3) return showFieldError("shopName", "⚠ Tên shop phải có ít nhất 3 ký tự.");
        if (v.length > 100) return showFieldError("shopName", "⚠ Tên shop không được vượt quá 100 ký tự.");
        showFieldOk("shopName");
    });
    document.getElementById("shopName").addEventListener("input", function () {
        clearFieldError("shopName");
    });

    document.getElementById("shopSlug").addEventListener("blur", function () {
        const v = this.value.trim();
        if (!v) return showFieldError("shopSlug", "⚠ Slug không được để trống.");
        if (!slugRegex.test(v)) return showFieldError("shopSlug", "⚠ Slug chỉ gồm chữ thường, số, dấu '-'. Không bắt đầu/kết thúc bằng '-'.");
        if (v.length > 80) return showFieldError("shopSlug", "⚠ Slug không được vượt quá 80 ký tự.");
        showFieldOk("shopSlug");
    });
    document.getElementById("shopSlug").addEventListener("input", function () {
        clearFieldError("shopSlug");
    });

    document.getElementById("phone").addEventListener("blur", function () {
        const v = this.value.trim();
        if (!v) return showFieldError("phone", "⚠ Số điện thoại không được để trống.");
        if (!phoneRegex.test(v)) return showFieldError("phone", "⚠ Số điện thoại không đúng định dạng (VD: 0912345678).");
        showFieldOk("phone");
    });
    document.getElementById("phone").addEventListener("input", function () {
        clearFieldError("phone");
    });

    document.getElementById("email").addEventListener("blur", function () {
        const v = this.value.trim();
        if (!v) { clearFieldError("email"); return; }
        if (!emailRegex.test(v)) return showFieldError("email", "⚠ Email không đúng định dạng.");
        showFieldOk("email");
    });
    document.getElementById("email").addEventListener("input", function () {
        clearFieldError("email");
    });
}

// ─────────────────────────────────────────────
// Upload avatar
// ─────────────────────────────────────────────
document.getElementById("avatarFile").addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;

    // Validate size
    if (file.size > 5 * 1024 * 1024) {
        if (typeof toastr !== "undefined") toastr.error("Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.", "Lỗi ảnh");
        this.value = "";
        return;
    }

    // Local preview ngay lập tức
    const reader = new FileReader();
    reader.onload = function (e) {
        const preview = document.getElementById("avatarPreview");
        const placeholder = document.getElementById("avatarPlaceholder");
        if (preview) { preview.src = e.target.result; preview.style.display = "block"; }
        if (placeholder) placeholder.style.display = "none";
    };
    reader.readAsDataURL(file);

    // Upload lên server
    isUploadingAvatar = true;
    const uploadBox = document.getElementById("uploadBox");
    if (uploadBox) uploadBox.classList.add("uploading");

    const statusEl = document.getElementById("avatarUploadStatus");
    if (statusEl) { statusEl.textContent = "Đang tải ảnh lên..."; statusEl.className = "sr-upload-status uploading"; }

    let formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch(UPLOAD_API, { method: "POST", body: formData });
        if (!res.ok) throw new Error("HTTP " + res.status);
        avatarUrl = (await res.text()).replace(/^"|"$/g, "");
        document.getElementById("avatar").value = avatarUrl;

        // Cập nhật preview bằng URL Cloudinary
        const preview = document.getElementById("avatarPreview");
        if (preview) preview.src = avatarUrl;

        if (statusEl) { statusEl.textContent = "✅ Tải ảnh lên thành công!"; statusEl.className = "sr-upload-status ok"; }
        if (typeof toastr !== "undefined") toastr.success("Ảnh đại diện đã được tải lên!", "Thành công");
    } catch (e) {
        console.error(e);
        avatarUrl = "";
        if (statusEl) { statusEl.textContent = "❌ Tải ảnh thất bại. Vui lòng thử lại."; statusEl.className = "sr-upload-status error"; }
        if (typeof toastr !== "undefined") toastr.error("Không thể tải ảnh lên server. Vui lòng thử lại.", "Lỗi upload");
    } finally {
        isUploadingAvatar = false;
        if (uploadBox) uploadBox.classList.remove("uploading");
    }
});

// ─────────────────────────────────────────────
// Submit form
// ─────────────────────────────────────────────
document.getElementById("sellerForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    configToastr();
    clearAllErrors();

    const token = localStorage.getItem("token");
    if (!token) {
        if (typeof toastr !== "undefined") toastr.warning("Bạn cần đăng nhập để đăng ký bán hàng.", "Chưa đăng nhập");
        setTimeout(() => { window.location.href = "/dangnhap"; }, 1500);
        return;
    }

    const shopName = document.getElementById("shopName").value.trim();
    const shopSlug = document.getElementById("shopSlug").value.trim();
    const phone    = document.getElementById("phone").value.trim();
    const email    = document.getElementById("email").value.trim();
    const desc     = document.getElementById("description").value.trim();

    // ── Frontend validation ──
    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    const emailRegex = /^[\w.+\-]+@[\w\-]+(\.[\w\-]+)+$/;
    const slugRegex  = /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/;
    let hasError = false;

    if (!shopName) {
        showFieldError("shopName", "⚠ Tên shop không được để trống."); hasError = true;
    } else if (shopName.length < 3) {
        showFieldError("shopName", "⚠ Tên shop phải có ít nhất 3 ký tự."); hasError = true;
    } else if (shopName.length > 100) {
        showFieldError("shopName", "⚠ Tên shop không được vượt quá 100 ký tự."); hasError = true;
    }

    if (!shopSlug) {
        showFieldError("shopSlug", "⚠ Slug shop không được để trống."); hasError = true;
    } else if (!slugRegex.test(shopSlug)) {
        showFieldError("shopSlug", "⚠ Slug chỉ gồm chữ thường, số, dấu '-'. Không bắt đầu/kết thúc bằng '-'."); hasError = true;
    } else if (shopSlug.length > 80) {
        showFieldError("shopSlug", "⚠ Slug không được vượt quá 80 ký tự."); hasError = true;
    }

    if (!phone) {
        showFieldError("phone", "⚠ Số điện thoại không được để trống."); hasError = true;
    } else if (!phoneRegex.test(phone)) {
        showFieldError("phone", "⚠ Số điện thoại không đúng định dạng (VD: 0912345678)."); hasError = true;
    }

    if (email && !emailRegex.test(email)) {
        showFieldError("email", "⚠ Email không đúng định dạng."); hasError = true;
    }

    if (hasError) {
        if (typeof toastr !== "undefined") toastr.warning("Vui lòng kiểm tra lại thông tin trong form.", "Thông tin chưa hợp lệ");
        // Scroll lên lỗi đầu tiên
        const firstErr = document.querySelector(".sr-input-error");
        if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
    }

    if (isUploadingAvatar) {
        if (typeof toastr !== "undefined") toastr.warning("Vui lòng chờ ảnh tải lên xong!", "Đang tải ảnh");
        return;
    }

    // ── Loading state ──
    const submitBtn = document.getElementById("submitBtn");
    const btnText = submitBtn.querySelector(".sr-btn-text");
    const spinner = submitBtn.querySelector(".sr-spinner");
    submitBtn.disabled = true;
    if (spinner) spinner.style.display = "inline-block";
    if (btnText) btnText.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang đăng ký...';

    const data = { shopName, shopSlug, phone, email, description: desc, avatar: avatarUrl };

    try {
        const response = await fetch(BASE_URL + "/api/seller/register", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            if (typeof toastr !== "undefined") {
                toastr.success("Đăng ký thành công! Shop của bạn đang chờ admin phê duyệt.", "🎉 Thành công");
            }
            submitBtn.innerHTML = '<span class="sr-btn-text"><i class="fa-solid fa-check"></i> Đăng ký thành công!</span>';
            submitBtn.style.background = "linear-gradient(135deg, #059669, #047857)";
            setTimeout(() => { window.location.href = "/index"; }, 2000);
        } else {
            // Backend trả JSON { errorCode, defaultMessage } hoặc plain text
            let errMsg = "Đăng ký thất bại. Vui lòng thử lại.";
            try {
                const errJson = await response.json();
                errMsg = errJson.defaultMessage || errJson.message || errMsg;
            } catch (_) {
                // Không phải JSON — đọc text
                try { errMsg = await response.text() || errMsg; } catch (_2) {}
            }

            if (typeof toastr !== "undefined") toastr.error(errMsg, "Đăng ký thất bại");

            // Map lỗi về đúng field
            const lower = errMsg.toLowerCase();
            if (lower.includes("slug")) {
                showFieldError("shopSlug", "⚠ " + errMsg);
            } else if (lower.includes("điện thoại")) {
                showFieldError("phone", "⚠ " + errMsg);
            } else if (lower.includes("email")) {
                showFieldError("email", "⚠ " + errMsg);
            } else if (lower.includes("tên shop")) {
                showFieldError("shopName", "⚠ " + errMsg);
            }

            submitBtn.disabled = false;
            if (spinner) spinner.style.display = "none";
            if (btnText) btnText.innerHTML = '<i class="fa-solid fa-store"></i> Đăng ký ngay';
        }
    } catch (error) {
        console.error(error);
        if (typeof toastr !== "undefined") toastr.error("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.", "Lỗi kết nối");
        submitBtn.disabled = false;
        if (spinner) spinner.style.display = "none";
        if (btnText) btnText.innerHTML = '<i class="fa-solid fa-store"></i> Đăng ký ngay';
    }

});

// ─────────────────────────────────────────────
// Khởi động
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
    configToastr();
    initRealtimeValidation();
});