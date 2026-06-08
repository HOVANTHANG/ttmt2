package com.web.repository;

import com.web.entity.Product;

import com.web.enums.CategoryType;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("select p from Product p left join p.tradeMark tm where " +

            "(p.name like ?1 or p.category.name like ?1 or tm.name like ?1 or p.code like ?1) " +

            "and p.deleted <> true and p.status = com.web.enums.ProductStatus.APPROVED and p.locked <> true")

    Page<Product> findByParam(String s, Pageable pageable);

    @Query("select p from Product p left join p.tradeMark tm where " +

            "(p.name like ?1 or p.category.name like ?1 or tm.name like ?1 or p.code like ?1) " +

            "and p.category.id = ?2 and p.deleted <> true and p.status = com.web.enums.ProductStatus.APPROVED and p.locked <> true")

    Page<Product> findByParamAndCate(String s, Long categoryId, Pageable pageable);

    @Query("select p from Product p left join p.tradeMark tm where " +

            "(p.name like ?1 or p.category.name like ?1 or tm.name like ?1 or p.code like ?1) " +

            "and tm.id = ?2 and p.deleted <> true and p.status = com.web.enums.ProductStatus.APPROVED and p.locked <> true")

    Page<Product> findByParamAndTrademark(String s, Long trademarkId, Pageable pageable);

    @Query("select p from Product p left join p.tradeMark tm where " +

            "(p.name like ?1 or p.category.name like ?1 or tm.name like ?1 or p.code like ?1) " +

            "and tm.id = ?2 and p.category.id = ?3 and p.deleted <> true and p.status = com.web.enums.ProductStatus.APPROVED and p.locked <> true")

    Page<Product> findByParamAndTrademarkAndCate(String s, Long trademarkId, Long categoryId, Pageable pageable);

    @Query("select p from Product p where p.deleted <> true and p.status = com.web.enums.ProductStatus.APPROVED and p.locked <> true order by p.createdDate desc, p.createdTime desc")

    Page<Product> newProduct(Pageable pageable);

    @Query("select p from Product p where p.deleted <> true and p.category.id = ?1 and p.status = com.web.enums.ProductStatus.APPROVED and p.locked <> true")

    Page<Product> findByCategoryId(Long categoryId, Pageable pageable);

    @Query("select p from Product p where p.deleted <> true and p.status = com.web.enums.ProductStatus.APPROVED and p.locked <> true order by p.sold desc")

    Page<Product> bestSaler(Pageable pageable);

    @Query("select p from Product p where p.deleted <> true and p.status = com.web.enums.ProductStatus.APPROVED and p.category.categoryType = ?1 and p.locked <> true order by p.sold desc")

    Page<Product> bestSalerByCategory(CategoryType categoryType, Pageable pageable);

    @Query("select p from Product p where p.deleted <> true and p.status = com.web.enums.ProductStatus.APPROVED and p.tradeMark.id = ?1 and p.id <> ?2 and p.locked <> true")

    Page<Product> sanPhamLienQuanByTrademark(Long idTrademark, Long idproduct, Pageable pageable);

    @Query("select p from Product p where p.deleted <> true and p.status = com.web.enums.ProductStatus.APPROVED and p.category.id = ?1 and p.id <> ?2 and p.locked <> true")

    Page<Product> sanPhamLienQuanCate(Long idcategory, Long idproduct, Pageable pageable);

    @Query("select p from Product p where p.deleted <> true and p.status = com.web.enums.ProductStatus.APPROVED and p.locked <> true and p.name like ?1 and p.price >= ?2 and p.price <= ?3")

    Page<Product> locSanPham(String search, Double small, Double large, Pageable pageable);

    @Query("select p from Product p where p.deleted <> true and p.status = com.web.enums.ProductStatus.APPROVED and p.locked <> true and p.name like ?1 and p.price >= ?2 and p.price <= ?3 and p.category.id = ?4")

    Page<Product> locSanPham(String search, Double small, Double large, Long idcategory, Pageable pageable);

    @Query("select p from Product p where p.deleted <> true and p.status = com.web.enums.ProductStatus.APPROVED and p.locked <> true and p.name like ?1 and p.price >= ?2 and p.price <= ?3 and p.tradeMark.name = ?4")

    Page<Product> locSanPham(String search, Double small, Double large, String trademark, Pageable pageable);

    @Query("select p from Product p where p.deleted <> true and p.status = com.web.enums.ProductStatus.APPROVED and p.locked <> true and p.name like ?1 and p.price >= ?2 and p.price <= ?3 "

            +

            "and p.tradeMark.name = ?4 and p.category.id = ?5")

    Page<Product> locSanPham(String search, Double small, Double large, String trademark, Long idCategory,

            Pageable pageable);

    @Query(value = "select * from product p " +
            "where p.deleted = false and p.status = 'APPROVED' and p.locked = false order by p.sold desc limit 10", nativeQuery = true)

    List<Product> findTop10Selling();

    @Query("select count(p) from Product p where p.shop.id = ?1 and p.deleted <> true and p.status = com.web.enums.ProductStatus.APPROVED")

    Long countByShopIdAndDeletedFalse(Long shopId);

    @Query(value = "select * from product p " +
            "where p.shop_id = ?1 and p.deleted = false and p.status = 'APPROVED' and p.locked = false " +
            "order by p.sold desc limit 10", nativeQuery = true)
    List<Product> findTopSellingByShop(Long shopId);

    @Query("select p from Product p left join p.tradeMark tm where p.deleted <> true  and p.locked = false  and p.shop.id = ?1 "
            +

            "and (p.name like ?2 or p.category.name like ?2 or tm.name like ?2 or p.code like ?2)")

    Page<Product> findByShop(Long shopId, String search, Pageable pageable);

    @Query("select p from Product p left join p.tradeMark tm where p.deleted <> true and p.status = 'APPROVED' and p.locked = false  and p.shop.id = ?1 "
            +

            "and (p.name like ?2 or p.category.name like ?2 or tm.name like ?2 or p.code like ?2) "

            + "and p.category.id = ?3")

    Page<Product> findByShopAndCategory(Long shopId, String search, Long categoryId, Pageable pageable);

    @Query("select p from Product p left join p.tradeMark tm where p.deleted <> true and p.status = 'APPROVED' and p.locked = false  and p.shop.id = ?1 "
            +

            "and (p.name like ?2 or p.category.name like ?2 or tm.name like ?2 or p.code like ?2) "

            +

            "and tm.id = ?3")

    Page<Product> findByShopAndTrademark(Long shopId, String search, Long trademarkId, Pageable pageable);

    @Query("select p from Product p left join p.tradeMark tm where p.deleted <> true and p.status = 'APPROVED' and p.locked = false  and p.shop.id = ?1 "
            +

            "and (p.name like ?2 or p.category.name like ?2 or tm.name like ?2 or p.code like ?2) "

            +

            "and p.category.id = ?3 and tm.id = ?4")

    Page<Product> findByShopAndCategoryAndTrademark(Long shopId, String search, Long categoryId, Long trademarkId,

            Pageable pageable);

    /** Trang shop công khai – chỉ hiện sản phẩm APPROVED */

    @Query("select p from Product p where p.shop.id = ?1 and p.deleted = false and p.status = com.web.enums.ProductStatus.APPROVED and p.locked = false")

    Page<Product> findByShopIdAndDeletedFalse(Long shopId, Pageable pageable);

    Page<Product> findByCategoryIdAndDeletedFalse(Long categoryId, Pageable pageable);

    /**
     * 
     * Tìm sản phẩm theo danh mục CHA hoặc danh mục CON của nó.
     * 
     * LEFT JOIN để không loại sản phẩm có category không có parent.
     * 
     */

    @Query(value = """

                select distinct p

                from Product p

                join fetch p.category c

                left join fetch c.parent parent

                join fetch p.shop s

                where p.deleted = false

                and s.status = com.web.enums.ShopStatus.APPROVED

                and p.status = com.web.enums.ProductStatus.APPROVED

                and p.locked = false

                and (c.id = :categoryId or parent.id = :categoryId)

                order by

                case

                    when c.id = :categoryId then 100

                    else 50

                end desc,

                s.avgStar desc,

                s.reviewCount desc,

                p.avgStar desc,

                p.reviewCount desc,

                p.sold desc,

                p.price asc

            """, countQuery = """

                select count(distinct p)

                from Product p

                join p.category c

                left join c.parent parent

                join p.shop s

                where p.deleted = false

                and s.status = com.web.enums.ShopStatus.APPROVED

                and p.status = com.web.enums.ProductStatus.APPROVED

                and (c.id = :categoryId or parent.id = :categoryId)

            """)

    Page<Product> findByCategoryIdIncludingChildren(@Param("categoryId") Long categoryId, Pageable pageable);

    @Query(value = """
                select distinct p
                from Product p
                join fetch p.category c
                left join fetch c.parent parent
                join fetch p.shop s
                where p.deleted = false
                and s.status = com.web.enums.ShopStatus.APPROVED
                and p.status = com.web.enums.ProductStatus.APPROVED
                and p.locked = false
                and (c.id = :categoryId or parent.id = :categoryId)
            """, countQuery = """
                select count(distinct p)
                from Product p
                join p.category c
                left join c.parent parent
                join p.shop s
                where p.deleted = false
                and s.status = com.web.enums.ShopStatus.APPROVED
                and p.status = com.web.enums.ProductStatus.APPROVED
                and (c.id = :categoryId or parent.id = :categoryId)
            """)
    Page<Product> findByCategoryIdIncludingChildrenWithDynamicSort(@Param("categoryId") Long categoryId, Pageable pageable);

    Long countByShopId(Long shopId);

    /** Lấy tất cả sản phẩm của shop (dùng khi khóa/mở khóa shop) */

    List<Product> findByShopId(Long shopId);

    @Query(value = """
                select p
                from Product p
                left join p.tradeMark tm
                where p.deleted = false
                and p.shop is not null
                and p.shop.status = com.web.enums.ShopStatus.APPROVED
                and p.status = com.web.enums.ProductStatus.APPROVED
                and p.locked = false
                and (:keyword is null or :keyword = '' or (
                    lower(p.name) like lower(concat('%', :keyword, '%'))
                    or lower(p.code) like lower(concat('%', :keyword, '%'))
                    or lower(p.category.name) like lower(concat('%', :keyword, '%'))
                    or lower(tm.name) like lower(concat('%', :keyword, '%'))
                ))
                and (:categoryId is null or p.category.id = :categoryId or p.category.parent.id = :categoryId)
                and (:trademarkName is null or :trademarkName = '' or tm.name = :trademarkName)
                and (:small is null or p.price >= :small)
                and (:large is null or p.price <= :large)
                order by
                case
                    when :keyword is null or :keyword = '' then 1
                    when lower(p.name) = lower(:keyword) then 100
                    when lower(p.name) like lower(concat(:keyword, '%')) then 80
                    when lower(p.name) like lower(concat('%', :keyword, '%')) then 60
                    else 40
                end desc,
                p.avgStar desc,
                p.reviewCount desc,
                p.sold desc,
                p.shop.avgStar desc,
                p.shop.reviewCount desc,
                p.price asc
            """, countQuery = """
                select count(p)
                from Product p
                left join p.tradeMark tm
                where p.deleted = false
                and p.shop is not null
                and p.shop.status = com.web.enums.ShopStatus.APPROVED
                and p.status = com.web.enums.ProductStatus.APPROVED
                and p.locked = false
                and (:keyword is null or :keyword = '' or (
                    lower(p.name) like lower(concat('%', :keyword, '%'))
                    or lower(p.code) like lower(concat('%', :keyword, '%'))
                    or lower(p.category.name) like lower(concat('%', :keyword, '%'))
                    or lower(tm.name) like lower(concat('%', :keyword, '%'))
                ))
                and (:categoryId is null or p.category.id = :categoryId or p.category.parent.id = :categoryId)
                and (:trademarkName is null or :trademarkName = '' or tm.name = :trademarkName)
                and (:small is null or p.price >= :small)
                and (:large is null or p.price <= :large)
            """)
    Page<Product> searchMarketplaceWithRelevance(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("trademarkName") String trademarkName,
            @Param("small") Double small,
            @Param("large") Double large,
            Pageable pageable);

    @Query(value = """
                select p
                from Product p
                left join p.tradeMark tm
                where p.deleted = false
                and p.shop is not null
                and p.shop.status = com.web.enums.ShopStatus.APPROVED
                and p.status = com.web.enums.ProductStatus.APPROVED
                and p.locked = false
                and (:keyword is null or :keyword = '' or (
                    lower(p.name) like lower(concat('%', :keyword, '%'))
                    or lower(p.code) like lower(concat('%', :keyword, '%'))
                    or lower(p.category.name) like lower(concat('%', :keyword, '%'))
                    or lower(tm.name) like lower(concat('%', :keyword, '%'))
                ))
                and (:categoryId is null or p.category.id = :categoryId or p.category.parent.id = :categoryId)
                and (:trademarkName is null or :trademarkName = '' or tm.name = :trademarkName)
                and (:small is null or p.price >= :small)
                and (:large is null or p.price <= :large)
            """, countQuery = """
                select count(p)
                from Product p
                left join p.tradeMark tm
                where p.deleted = false
                and p.shop is not null
                and p.shop.status = com.web.enums.ShopStatus.APPROVED
                and p.status = com.web.enums.ProductStatus.APPROVED
                and p.locked = false
                and (:keyword is null or :keyword = '' or (
                    lower(p.name) like lower(concat('%', :keyword, '%'))
                    or lower(p.code) like lower(concat('%', :keyword, '%'))
                    or lower(p.category.name) like lower(concat('%', :keyword, '%'))
                    or lower(tm.name) like lower(concat('%', :keyword, '%'))
                ))
                and (:categoryId is null or p.category.id = :categoryId or p.category.parent.id = :categoryId)
                and (:trademarkName is null or :trademarkName = '' or tm.name = :trademarkName)
                and (:small is null or p.price >= :small)
                and (:large is null or p.price <= :large)
            """)
    Page<Product> searchMarketplaceWithDynamicSort(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("trademarkName") String trademarkName,
            @Param("small") Double small,
            @Param("large") Double large,
            Pageable pageable);

    // ===================== PRODUCT APPROVAL =====================

    /** Lấy tất cả sản phẩm chờ duyệt (PENDING) */

    @Query("select p from Product p where p.deleted = false  and p.status = com.web.enums.ProductStatus.PENDING order by p.createdDate desc, p.createdTime desc")

    Page<Product> findAllPending(Pageable pageable);

    /** Tìm kiếm sản phẩm chờ duyệt theo tên/mã */

    @Query("select p from Product p where p.deleted = false and p.status = com.web.enums.ProductStatus.PENDING " +

            "and (lower(p.name) like lower(concat('%', :keyword, '%')) or lower(p.code) like lower(concat('%', :keyword, '%'))) "

            +

            "order by p.createdDate desc, p.createdTime desc")

    Page<Product> searchPending(@Param("keyword") String keyword, Pageable pageable);

    /** Đếm số sản phẩm đang chờ duyệt */

    @Query("select count(p) from Product p where p.deleted = false and p.status = com.web.enums.ProductStatus.PENDING")

    Long countPending();

    /**
     * 
     * Lấy tất cả sản phẩm APPROVED cho AI chatbot (tránh lỗi enum khi có dữ liệu
     * 
     * không hợp lệ trong DB)
     * 
     */

    @Query(value = "SELECT * FROM product WHERE deleted = 0 AND status = 'APPROVED'", nativeQuery = true)

    List<Product> findAllApprovedForAI();

    // ===================== SHOP LOCK / UNLOCK =====================

    /**
     * Khóa tất cả sản phẩm của shop (dùng khi khóa shop).
     * Chỉ set locked = true, KHÔNG đụng vào cờ deleted.
     * Trả về số bản ghi được cập nhật.
     */
    @Modifying
    @Query("update Product p set p.locked = true where p.shop.id = :shopId and p.deleted = false")
    int lockAllByShopId(@Param("shopId") Long shopId);

    /**
     * Mở khóa tất cả sản phẩm của shop (dùng khi mở khóa shop).
     * Chỉ reset locked = false cho những sp bị locked vì shop.
     * Sản phẩm đã deleted thật sự (deleted = true) vẫn giữ nguyên.
     */
    @Modifying
    @Query("update Product p set p.locked = false where p.shop.id = :shopId and p.locked = true")
    int unlockAllByShopId(@Param("shopId") Long shopId);

    @Query("select count(p) from Product p where p.deleted = false and p.status = :status and p.id > :lastSeenId")
    Long countPendingProductsSince(@Param("status") com.web.enums.ProductStatus status,
            @Param("lastSeenId") Long lastSeenId);

    @Query("select coalesce(max(p.id), 0) from Product p where p.deleted = false and p.status = :status")
    Long maxPendingProductId(@Param("status") com.web.enums.ProductStatus status);

}
