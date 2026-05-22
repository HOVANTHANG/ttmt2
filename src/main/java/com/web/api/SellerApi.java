package com.web.api;

import com.web.dto.request.SellerRegisterRequest;
import com.web.entity.Shop;
import com.web.entity.User;
import com.web.repository.ShopRepository;
import com.web.repository.UserRepository;
import com.web.servive.SellerService;
import com.web.utils.UserUtils;

import java.util.Optional;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/seller")
@CrossOrigin
public class SellerApi {

    private final SellerService sellerService;
    private final UserRepository userRepository;
    private final UserUtils userUtils;
    private final ShopRepository shopRepository;

    public SellerApi(SellerService sellerService,
            UserRepository userRepository,
            UserUtils userUtils,
            ShopRepository shopRepository) {
        this.sellerService = sellerService;
        this.userRepository = userRepository;
        this.userUtils = userUtils;
        this.shopRepository = shopRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerSeller(@RequestBody SellerRegisterRequest request,
            Authentication authentication) {

        String username = authentication.getName();

        Optional<User> optionalUser = userRepository.findById(Long.valueOf(username));

        if (optionalUser.isEmpty()) {
            throw new RuntimeException("User không tồn tại");
        }

        User user = optionalUser.get();

        Shop shop = sellerService.registerSeller(user.getId(), request);

        return ResponseEntity.ok(shop);
    }

    @GetMapping("/public/my-seller-status")
    public ResponseEntity<?> mySellerStatus() {

        User user = userUtils.getUserWithAuthority();

        if (user == null) {
            return ResponseEntity.ok("NONE");
        }

        Optional<Shop> shopOpt = shopRepository.findFirstByOwnerId(user.getId());

        if (shopOpt.isEmpty()) {
            return ResponseEntity.ok("NONE");
        }

        Shop shop = shopOpt.get();

        return ResponseEntity.ok(shop.getStatus().name());
    }

    /** Lấy thông tin shop của seller đang đăng nhập */
    @GetMapping("/my-shop")
    public ResponseEntity<?> myShop(Authentication authentication) {
        String username = authentication.getName();
        Optional<User> optUser = userRepository.findById(Long.valueOf(username));
        if (optUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User không tồn tại");
        }
        User user = optUser.get();
        Optional<Shop> shopOpt = shopRepository.findFirstByOwnerId(user.getId());
        if (shopOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Chưa có shop");
        }
        Shop shop = shopOpt.get();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", shop.getId());
        result.put("shopName", shop.getShopName());
        result.put("shopSlug", shop.getShopSlug());
        result.put("phone", shop.getPhone());
        result.put("email", shop.getEmail());
        result.put("description", shop.getDescription());
        result.put("avatar", shop.getAvatar());
        result.put("avgStar", shop.getAvgStar());
        result.put("reviewCount", shop.getReviewCount());
        result.put("totalSold", shop.getTotalSold());
        result.put("status", shop.getStatus() != null ? shop.getStatus().name() : "");
        if (shop.getOwner() != null) {
            result.put("ownerFullname", shop.getOwner().getFullname());
        }
        return ResponseEntity.ok(result);
    }

    /** Cập nhật thông tin shop của seller đang đăng nhập */
    @PutMapping("/my-shop")
    public ResponseEntity<?> updateMyShop(@RequestBody SellerRegisterRequest request,
            Authentication authentication) {
        String username = authentication.getName();
        Optional<User> optUser = userRepository.findById(Long.valueOf(username));
        if (optUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User không tồn tại");
        }
        User user = optUser.get();
        Optional<Shop> shopOpt = shopRepository.findFirstByOwnerId(user.getId());
        if (shopOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Chưa có shop");
        }
        Shop shop = shopOpt.get();
        if (request.getShopName() != null && !request.getShopName().isBlank()) {
            shop.setShopName(request.getShopName());
        }
        if (request.getPhone() != null) {
            shop.setPhone(request.getPhone());
        }
        if (request.getEmail() != null) {
            shop.setEmail(request.getEmail());
        }
        if (request.getDescription() != null) {
            shop.setDescription(request.getDescription());
        }
        if (request.getAvatar() != null) {
            shop.setAvatar(request.getAvatar());
        }
        shopRepository.save(shop);
        return ResponseEntity.ok("Cập nhật thông tin shop thành công");
    }
}