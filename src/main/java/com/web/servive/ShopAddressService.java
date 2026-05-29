package com.web.servive;

import com.web.entity.ShopAddress;

import java.util.List;

public interface ShopAddressService {
    List<ShopAddress> findByShop();
    ShopAddress findById(Long id);
    ShopAddress create(ShopAddress shopAddress);
    ShopAddress update(ShopAddress shopAddress);
    void delete(Long id);
}
