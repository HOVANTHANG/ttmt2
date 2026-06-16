package com.web.servive;

import java.util.List;

public interface WarehouseInventoryService {

    List<WarehouseStockResponse> checkStockForShop(Long shopId);

    List<WarehouseAllocationDto> getAllocationsByVariant(Long variantId);

    void updateAllocations(Long variantId, List<WarehouseAllocationDto> allocations);

    class WarehouseStockResponse {
        private Long warehouseId;
        private String fullname;
        private String phone;
        private String streetName;
        private String wardName;
        private String districtName;
        private String provinceName;
        private boolean hasStock;

        public Long getWarehouseId() { return warehouseId; }
        public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }

        public String getFullname() { return fullname; }
        public void setFullname(String fullname) { this.fullname = fullname; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getStreetName() { return streetName; }
        public void setStreetName(String streetName) { this.streetName = streetName; }

        public String getWardName() { return wardName; }
        public void setWardName(String wardName) { this.wardName = wardName; }

        public String getDistrictName() { return districtName; }
        public void setDistrictName(String districtName) { this.districtName = districtName; }

        public String getProvinceName() { return provinceName; }
        public void setProvinceName(String provinceName) { this.provinceName = provinceName; }

        public boolean isHasStock() { return hasStock; }
        public void setHasStock(boolean hasStock) { this.hasStock = hasStock; }
    }

    class WarehouseAllocationDto {
        private Long warehouseId;
        private String warehouseName;
        private String address;
        private Integer quantity;

        public Long getWarehouseId() { return warehouseId; }
        public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }

        public String getWarehouseName() { return warehouseName; }
        public void setWarehouseName(String warehouseName) { this.warehouseName = warehouseName; }

        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }

        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }
}
