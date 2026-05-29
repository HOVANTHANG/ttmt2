package com.web.api;

import com.web.entity.ShopAddress;
import com.web.repository.ShopAddressRepository;
import com.web.servive.ShopAddressService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shop-address")
@CrossOrigin
public class ShopAddressApi {

    @Autowired
    private ShopAddressService shopAddressService;

    @Autowired
    private ShopAddressRepository shopAddressRepository;

    /**
     * Public endpoint — checkout dùng để lấy tên tỉnh/huyện/xã của địa chỉ mặc định shop.
     * Trả về Map nhỏ gọn { provinceName, districtName, wardName } để frontend fuzzy-match với GHN.
     */
    @GetMapping("/public/primary")
    public ResponseEntity<?> getPublicPrimary(@RequestParam("shopId") Long shopId) {
        // Dùng JPQL trả về đúng 3 trường cần thiết — tránh serialize toàn bộ Province.districts
        List<Object[]> rows = shopAddressRepository.findPrimaryAddressNames(shopId);

        if (rows.isEmpty()) {
            // Fallback: lấy địa chỉ đầu tiên nếu chưa có địa chỉ mặc định
            rows = shopAddressRepository.findFirstAddressNames(shopId);
        }

        if (rows.isEmpty()) return new ResponseEntity<>(HttpStatus.NOT_FOUND);

        Object[] row = rows.get(0);
        java.util.Map<String, String> result = new java.util.HashMap<>();
        result.put("provinceName", row[0] != null ? row[0].toString() : "");
        result.put("districtName", row[1] != null ? row[1].toString() : "");
        result.put("wardName",     row[2] != null ? row[2].toString() : "");
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    @GetMapping("/seller/my-address")
    public ResponseEntity<?> findAll() {
        List<ShopAddress> result = shopAddressService.findByShop();
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    @GetMapping("/seller/findById")
    public ResponseEntity<?> findById(@RequestParam("id") Long id) {
        ShopAddress result = shopAddressService.findById(id);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    @PostMapping("/seller/create")
    public ResponseEntity<?> create(@RequestBody ShopAddress shopAddress) {
        ShopAddress result = shopAddressService.create(shopAddress);
        return new ResponseEntity<>(result, HttpStatus.CREATED);
    }

    @PostMapping("/seller/update")
    public ResponseEntity<?> update(@RequestBody ShopAddress shopAddress) {
        ShopAddress result = shopAddressService.update(shopAddress);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    @DeleteMapping("/seller/delete")
    public ResponseEntity<?> delete(@RequestParam("id") Long id) {
        shopAddressService.delete(id);
        return new ResponseEntity<>(HttpStatus.OK);
    }
}
