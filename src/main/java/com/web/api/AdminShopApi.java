package com.web.api;

import com.web.dto.response.ShopStatisticResponse;
import com.web.entity.Product;
import com.web.entity.Shop;
import com.web.enums.ProductStatus;
import com.web.enums.ShopStatus;
import com.web.repository.InvoiceDetailRepository;
import com.web.repository.ProductRepository;
import com.web.repository.ShopRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/shop")
@CrossOrigin
public class AdminShopApi {

    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final InvoiceDetailRepository invoiceDetailRepository;

    public AdminShopApi(
            ShopRepository shopRepository,
            ProductRepository productRepository,
            InvoiceDetailRepository invoiceDetailRepository) {
        this.shopRepository = shopRepository;
        this.productRepository = productRepository;
        this.invoiceDetailRepository = invoiceDetailRepository;
    }

    /** Lấy TẤT CẢ shop (bao gồm APPROVED, PENDING, REJECTED) */
    @GetMapping("/all")
    public ResponseEntity<?> findAllShop() {
        return ResponseEntity.ok(shopRepository.findAll());
    }

    /** Khóa shop: status → REJECTED + lock toàn bộ sản phẩm của shop */
    @Transactional
    @PostMapping("/{id}/lock")
    public ResponseEntity<?> lockShop(@PathVariable Long id) {
        Shop shop = shopRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy shop"));
        shop.setStatus(ShopStatus.REJECTED);
        shopRepository.save(shop);
        // Khóa tất cả sản phẩm của shop (dùng locked, KHÔNG đụng vào deleted)
        long count = productRepository.lockAllByShopId(id);
        return ResponseEntity.ok(Map.of(
                "message", "Đã khóa shop và khóa " + count + " sản phẩm"));
    }

    /**
     * Mở khóa shop: status → APPROVED + unlock sản phẩm (chỉ những sp bị locked vì
     * shop)
     */
    @Transactional
    @PostMapping("/{id}/unlock")
    public ResponseEntity<?> unlockShop(@PathVariable Long id) {
        Shop shop = shopRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy shop"));
        shop.setStatus(ShopStatus.APPROVED);
        shopRepository.save(shop);
        // Mở khóa sản phẩm (chỉ reset locked=false, sản phẩm deleted thật vẫn giữ
        // nguyên)
        long count = productRepository.unlockAllByShopId(id);
        return ResponseEntity.ok(Map.of(
                "message", "Đã mở khóa shop và khôi phục " + count + " sản phẩm"));
    }

    @GetMapping("/statistic")
    public ResponseEntity<?> statisticShop() {
        List<ShopStatisticResponse> result = shopRepository.findAllByStatus(ShopStatus.APPROVED)
                .stream()
                .map(shop -> {
                    ShopStatisticResponse dto = new ShopStatisticResponse();
                    dto.setShopId(shop.getId());
                    dto.setShopName(shop.getShopName());
                    dto.setAvatar(shop.getAvatar());
                    dto.setStatus(shop.getStatus() != null ? shop.getStatus().name() : "");
                    dto.setTotalProduct(productRepository.countByShopId(shop.getId()));
                    dto.setTotalOrder(invoiceDetailRepository.countOrderByShop(shop.getId()));
                    dto.setRevenue(invoiceDetailRepository.revenueByShop(shop.getId()));
                    dto.setProfit(invoiceDetailRepository.profitByShop(shop.getId()));
                    return dto;
                })
                .toList();
        return ResponseEntity.ok(result);
    }

    // ===================== PRODUCT APPROVAL =====================

    @GetMapping("/product/pending")
    public ResponseEntity<?> getPendingProducts(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Product> result;
        if (keyword != null && !keyword.trim().isEmpty()) {
            result = productRepository.searchPending(keyword.trim(), pageable);
        } else {
            result = productRepository.findAllPending(pageable);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/product/pending/count")
    public ResponseEntity<?> countPendingProducts() {
        Long count = productRepository.countPending();
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PostMapping("/product/{id}/approve")
    public ResponseEntity<?> approveProduct(@PathVariable Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));
        product.setStatus(ProductStatus.APPROVED);
        product.setRejectedReason(null);
        productRepository.save(product);
        return ResponseEntity.ok(Map.of("message", "Sản phẩm đã được duyệt thành công"));
    }

    @PostMapping("/product/{id}/reject")
    public ResponseEntity<?> rejectProduct(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));
        String reason = (body != null) ? body.getOrDefault("reason", "") : "";
        product.setStatus(ProductStatus.REJECTED);
        product.setRejectedReason(reason);
        productRepository.save(product);
        return ResponseEntity.ok(Map.of("message", "Sản phẩm đã bị từ chối"));
    }

    @GetMapping("/product/pending-info")
    public ResponseEntity<?> getPendingProductsInfo(@RequestParam(value = "lastSeenId", defaultValue = "0") Long lastSeenId) {
        Long count = productRepository.countPendingProductsSince(ProductStatus.PENDING, lastSeenId);
        Long latestId = productRepository.maxPendingProductId(ProductStatus.PENDING);
        return ResponseEntity.ok(Map.of("count", count, "latestId", latestId));
    }
}