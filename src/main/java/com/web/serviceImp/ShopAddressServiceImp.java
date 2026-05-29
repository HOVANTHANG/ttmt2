package com.web.serviceImp;

import com.web.entity.Shop;
import com.web.entity.ShopAddress;
import com.web.entity.User;
import com.web.exception.MessageException;
import com.web.repository.ShopAddressRepository;
import com.web.repository.ShopRepository;
import com.web.servive.ShopAddressService;
import com.web.utils.UserUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.util.List;
import java.util.Optional;

@Component
public class ShopAddressServiceImp implements ShopAddressService {

    @Autowired
    private ShopAddressRepository shopAddressRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private UserUtils userUtils;

    private Shop getMyShop() {
        User user = userUtils.getUserWithAuthority();
        return shopRepository.findFirstByOwnerId(user.getId())
                .orElseThrow(() -> new MessageException("Shop not found"));
    }

    @Override
    public List<ShopAddress> findByShop() {
        Shop shop = getMyShop();
        return shopAddressRepository.findByShop(shop.getId());
    }

    @Override
    public ShopAddress findById(Long id) {
        ShopAddress address = shopAddressRepository.findById(id)
                .orElseThrow(() -> new MessageException("Address not found"));
        Shop shop = getMyShop();
        if (!address.getShop().getId().equals(shop.getId())) {
            throw new MessageException("Access denied");
        }
        return address;
    }

    @Override
    public ShopAddress create(ShopAddress shopAddress) {
        if (shopAddress.getId() != null) {
            throw new MessageException("id must be null for create");
        }
        Shop shop = getMyShop();
        shopAddress.setShop(shop);
        shopAddress.setCreatedDate(new Date(System.currentTimeMillis()));
        if (Boolean.TRUE.equals(shopAddress.getPrimaryAddres())) {
            shopAddressRepository.unSetPrimary(shop.getId());
        }
        return shopAddressRepository.save(shopAddress);
    }

    @Override
    public ShopAddress update(ShopAddress shopAddress) {
        if (shopAddress.getId() == null) {
            throw new MessageException("id is required for update");
        }
        ShopAddress existing = shopAddressRepository.findById(shopAddress.getId())
                .orElseThrow(() -> new MessageException("Address not found"));
        Shop shop = getMyShop();
        if (!existing.getShop().getId().equals(shop.getId())) {
            throw new MessageException("Access denied");
        }
        shopAddress.setShop(existing.getShop());
        shopAddress.setCreatedDate(existing.getCreatedDate());
        // if (Boolean.TRUE.equals(shopAddress.getPrimaryAddres())) {
        // shopAddressRepository.unSetPrimary(shop.getId());
        // }
        return shopAddressRepository.save(shopAddress);
    }

    @Override
    public void delete(Long id) {
        ShopAddress existing = shopAddressRepository.findById(id)
                .orElseThrow(() -> new MessageException("Address not found"));
        Shop shop = getMyShop();
        if (!existing.getShop().getId().equals(shop.getId())) {
            throw new MessageException("Access denied");
        }
        shopAddressRepository.deleteById(id);
    }
}
