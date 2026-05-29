package com.web.repository;

import com.web.entity.ShopAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ShopAddressRepository extends JpaRepository<ShopAddress, Long> {

    @Query("select s from ShopAddress s where s.shop.id = ?1")
    List<ShopAddress> findByShop(Long shopId);

    @Query("select s from ShopAddress s where s.shop.id = ?1 and s.primaryAddres = true")
    java.util.Optional<ShopAddress> findPrimaryByShopId(Long shopId);

    /** Trả về [provinceName, districtName, wardName] của địa chỉ mặc định */
    @Query("select p.name, d.name, w.name " +
           "from ShopAddress sa " +
           "join sa.wards w join w.districts d join d.province p " +
           "where sa.shop.id = ?1 and sa.primaryAddres = true")
    List<Object[]> findPrimaryAddressNames(Long shopId);

    /** Fallback: trả về [provinceName, districtName, wardName] của địa chỉ đầu tiên */
    @Query("select p.name, d.name, w.name " +
           "from ShopAddress sa " +
           "join sa.wards w join w.districts d join d.province p " +
           "where sa.shop.id = ?1 order by sa.id asc")
    List<Object[]> findFirstAddressNames(Long shopId);

    @Modifying
    @Transactional
    @Query("update ShopAddress s set s.primaryAddres = false where s.shop.id = ?1")
    int unSetPrimary(Long shopId);
}
