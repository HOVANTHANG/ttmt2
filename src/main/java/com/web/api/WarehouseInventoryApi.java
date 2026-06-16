package com.web.api;

import com.web.servive.WarehouseInventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/warehouse-inventory")
@CrossOrigin
public class WarehouseInventoryApi {

    @Autowired
    private WarehouseInventoryService warehouseInventoryService;

    @GetMapping("/public/check-stock")
    public ResponseEntity<?> checkStockForShop(@RequestParam("shopId") Long shopId) {
        List<WarehouseInventoryService.WarehouseStockResponse> result =
                warehouseInventoryService.checkStockForShop(shopId);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    @GetMapping("/seller/allocations")
    public ResponseEntity<?> getAllocationsByVariant(@RequestParam("variantId") Long variantId) {
        List<WarehouseInventoryService.WarehouseAllocationDto> result =
                warehouseInventoryService.getAllocationsByVariant(variantId);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    @PostMapping("/seller/update-allocations")
    public ResponseEntity<?> updateAllocations(
            @RequestParam("variantId") Long variantId,
            @RequestBody List<WarehouseInventoryService.WarehouseAllocationDto> allocations) {
        warehouseInventoryService.updateAllocations(variantId, allocations);
        return new ResponseEntity<>(HttpStatus.OK);
    }
}
