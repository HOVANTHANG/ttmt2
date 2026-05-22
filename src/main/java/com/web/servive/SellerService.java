package com.web.servive;

import com.web.dto.request.SellerRegisterRequest;
import com.web.entity.Shop;
import com.web.entity.User;
import com.web.enums.ShopStatus;
import com.web.exception.MessageException;
import com.web.repository.AuthorityRepository;
import com.web.repository.ShopRepository;
import com.web.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SellerService {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final AuthorityRepository authorityRepository;

    public SellerService(UserRepository userRepository,
            ShopRepository shopRepository,
            AuthorityRepository authorityRepository) {
        this.userRepository = userRepository;
        this.shopRepository = shopRepository;
        this.authorityRepository = authorityRepository;
    }

    @Transactional
    public Shop registerSeller(Long userId, SellerRegisterRequest request) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new MessageException("Không tìm thấy tài khoản người dùng."));

        // ── Kiểm tra đã có shop chưa ──
        if (shopRepository.existsByOwnerId(userId)) {
            throw new MessageException("Tài khoản này đã đăng ký shop. Mỗi tài khoản chỉ được tạo một shop.");
        }

        // ── Validate Tên shop ──
        String shopName = request.getShopName();
        if (shopName == null || shopName.isBlank()) {
            throw new MessageException("Tên shop không được để trống.");
        }
        if (shopName.trim().length() < 3) {
            throw new MessageException("Tên shop phải có ít nhất 3 ký tự.");
        }
        if (shopName.trim().length() > 100) {
            throw new MessageException("Tên shop không được vượt quá 100 ký tự.");
        }

        // ── Validate Slug ──
        String shopSlug = request.getShopSlug();
        if (shopSlug == null || shopSlug.isBlank()) {
            throw new MessageException("Slug shop không được để trống.");
        }
        if (!shopSlug.matches("^[a-z0-9][a-z0-9\\-]*[a-z0-9]$")) {
            throw new MessageException("Slug chỉ được chứa chữ thường, số và dấu gạch ngang (-). Không bắt đầu/kết thúc bằng dấu gạch ngang.");
        }
        if (shopSlug.length() > 80) {
            throw new MessageException("Slug không được vượt quá 80 ký tự.");
        }
        if (shopRepository.existsByShopSlug(shopSlug)) {
            throw new MessageException("Slug \"" + shopSlug + "\" đã được sử dụng. Vui lòng chọn slug khác.");
        }

        // ── Validate Số điện thoại ──
        String phone = request.getPhone();
        if (phone == null || phone.isBlank()) {
            throw new MessageException("Số điện thoại không được để trống.");
        }
        if (!phone.matches("^(0[3|5|7|8|9])[0-9]{8}$")) {
            throw new MessageException("Số điện thoại không đúng định dạng Việt Nam (VD: 0912345678).");
        }
        if (shopRepository.existsByPhone(phone)) {
            throw new MessageException("Số điện thoại này đã được đăng ký cho một shop khác.");
        }

        // ── Validate Email (không bắt buộc) ──
        String email = request.getEmail();
        if (email != null && !email.isBlank()) {
            if (!email.matches("^[\\w.+\\-]+@[\\w\\-]+(\\.[\\w\\-]+)+$")) {
                throw new MessageException("Địa chỉ email không đúng định dạng.");
            }
            if (shopRepository.existsByEmail(email)) {
                throw new MessageException("Email này đã được đăng ký cho một shop khác.");
            }
        }

        // ── Tạo shop ──
        Shop shop = new Shop();
        shop.setShopName(shopName.trim());
        shop.setShopSlug(shopSlug.trim());
        shop.setPhone(phone.trim());
        shop.setEmail(email != null ? email.trim() : null);
        shop.setDescription(request.getDescription());
        shop.setAvatar(request.getAvatar());
        shop.setOwner(user);
        shop.setStatus(ShopStatus.PENDING);

        return shopRepository.save(shop);
    }
}