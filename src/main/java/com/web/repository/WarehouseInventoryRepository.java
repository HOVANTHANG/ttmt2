package com.web.repository;

import com.web.entity.WarehouseInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface WarehouseInventoryRepository extends JpaRepository<WarehouseInventory, Long> {

    List<WarehouseInventory> findByProductVariantId(Long productVariantId);

    List<WarehouseInventory> findByShopAddressId(Long shopAddressId);

    Optional<WarehouseInventory> findByShopAddressIdAndProductVariantId(Long shopAddressId, Long productVariantId);

    @Query("select wi from WarehouseInventory wi where wi.productVariant.product.shop.id = :shopId")
    List<WarehouseInventory> findByShopId(@Param("shopId") Long shopId);

    @Modifying
    @Transactional
    @Query("delete from WarehouseInventory wi where wi.productVariant.id = :productVariantId")
    void deleteByProductVariantId(@Param("productVariantId") Long productVariantId);
}
