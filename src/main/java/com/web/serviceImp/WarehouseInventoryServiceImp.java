package com.web.serviceImp;

import com.web.entity.*;
import com.web.exception.MessageException;
import com.web.repository.*;
import com.web.servive.WarehouseInventoryService;
import com.web.utils.UserUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class WarehouseInventoryServiceImp implements WarehouseInventoryService {

    @Autowired
    private WarehouseInventoryRepository warehouseInventoryRepository;

    @Autowired
    private ShopAddressRepository shopAddressRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private UserUtils userUtils;

    @Override
    public List<WarehouseStockResponse> checkStockForShop(Long shopId) {
        User currentUser = userUtils.getUserWithAuthority();
        if (currentUser == null) {
            throw new MessageException("Bạn chưa đăng nhập");
        }

        List<Cart> carts = cartRepository.findByUserAndShopId(currentUser.getId(), shopId);
        List<ShopAddress> warehouses = shopAddressRepository.findByShop(shopId);

        List<WarehouseStockResponse> responses = new ArrayList<>();

        for (ShopAddress warehouse : warehouses) {
            WarehouseStockResponse resp = new WarehouseStockResponse();
            resp.setWarehouseId(warehouse.getId());
            resp.setFullname(warehouse.getFullname());
            resp.setPhone(warehouse.getPhone());
            resp.setStreetName(warehouse.getStreetName());
            if (warehouse.getWards() != null) {
                resp.setWardName(warehouse.getWards().getName());
                if (warehouse.getWards().getDistricts() != null) {
                    resp.setDistrictName(warehouse.getWards().getDistricts().getName());
                    if (warehouse.getWards().getDistricts().getProvince() != null) {
                        resp.setProvinceName(warehouse.getWards().getDistricts().getProvince().getName());
                    }
                }
            }

            // check if this warehouse has enough quantity for all items in the cart
            boolean hasStock = true;
            for (Cart c : carts) {
                ProductVariant variant = c.getProductVariant();
                if (variant != null) {
                    Optional<WarehouseInventory> inventoryOpt =
                            warehouseInventoryRepository.findByShopAddressIdAndProductVariantId(warehouse.getId(), variant.getId());
                    int stockQty = 0;
                    if (inventoryOpt.isPresent()) {
                        stockQty = inventoryOpt.get().getQuantity();
                    } else {
                        // Legacy variant backward compatibility:
                        // If there are no entries in WarehouseInventory for this variant at all,
                        // and this is the primary warehouse, fallback to variant.getQuantity()
                        List<WarehouseInventory> allAllocs = warehouseInventoryRepository.findByProductVariantId(variant.getId());
                        if (allAllocs.isEmpty() && (warehouse.getPrimaryAddres() != null && warehouse.getPrimaryAddres())) {
                            stockQty = variant.getQuantity() != null ? variant.getQuantity() : 0;
                        }
                    }
                    int cartQty = c.getQuantity() != null ? c.getQuantity() : 0;
                    if (stockQty < cartQty) {
                        hasStock = false;
                        break;
                    }
                }
            }
            resp.setHasStock(hasStock);
            responses.add(resp);
        }

        return responses;
    }

    @Override
    public List<WarehouseAllocationDto> getAllocationsByVariant(Long variantId) {
        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new MessageException("Không tìm thấy biến thể sản phẩm"));
        Product product = variant.getProduct();
        if (product == null || product.getShop() == null) {
            throw new MessageException("Biến thể hoặc sản phẩm không có thông tin cửa hàng");
        }
        
        Long shopId = product.getShop().getId();
        List<ShopAddress> warehouses = shopAddressRepository.findByShop(shopId);
        List<WarehouseAllocationDto> list = new ArrayList<>();
        
        for (ShopAddress warehouse : warehouses) {
            WarehouseAllocationDto dto = new WarehouseAllocationDto();
            dto.setWarehouseId(warehouse.getId());
            dto.setWarehouseName(warehouse.getFullname());
            
            // Build address string
            StringBuilder addressBuilder = new StringBuilder(warehouse.getStreetName() != null ? warehouse.getStreetName() : "");
            if (warehouse.getWards() != null) {
                addressBuilder.append(", ").append(warehouse.getWards().getName());
                if (warehouse.getWards().getDistricts() != null) {
                    addressBuilder.append(", ").append(warehouse.getWards().getDistricts().getName());
                    if (warehouse.getWards().getDistricts().getProvince() != null) {
                        addressBuilder.append(", ").append(warehouse.getWards().getDistricts().getProvince().getName());
                    }
                }
            }
            dto.setAddress(addressBuilder.toString());
            
            Optional<WarehouseInventory> inventoryOpt =
                    warehouseInventoryRepository.findByShopAddressIdAndProductVariantId(warehouse.getId(), variant.getId());
            dto.setQuantity(inventoryOpt.map(WarehouseInventory::getQuantity).orElse(0));
            list.add(dto);
        }
        return list;
    }

    @Override
    @Transactional
    public void updateAllocations(Long variantId, List<WarehouseAllocationDto> allocations) {
        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new MessageException("Không tìm thấy biến thể sản phẩm"));
        
        // Delete all old allocations first
        warehouseInventoryRepository.deleteByProductVariantId(variantId);
        warehouseInventoryRepository.flush(); // Flush is important to ensure deletes execute before inserts
        
        int totalQty = 0;
        for (WarehouseAllocationDto dto : allocations) {
            if (dto.getQuantity() != null && dto.getQuantity() > 0) {
                ShopAddress warehouse = shopAddressRepository.findById(dto.getWarehouseId())
                        .orElseThrow(() -> new MessageException("Không tìm thấy kho hàng id: " + dto.getWarehouseId()));
                
                WarehouseInventory wi = new WarehouseInventory();
                wi.setProductVariant(variant);
                wi.setShopAddress(warehouse);
                wi.setQuantity(dto.getQuantity());
                
                warehouseInventoryRepository.save(wi);
                totalQty += dto.getQuantity();
            }
        }
        
        // Sync variant total quantity
        variant.setQuantity(totalQty);
        productVariantRepository.save(variant);
    }
}
