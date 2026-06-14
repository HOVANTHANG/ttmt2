package com.web.serviceImp;

import com.web.entity.Voucher;
import com.web.entity.VoucherProduct;
import com.web.entity.Product;
import com.web.entity.ProductVariant;
import com.web.entity.Cart;
import com.web.entity.User;
import com.web.exception.MessageException;
import com.web.repository.InvoiceRepository;
import com.web.repository.VoucherRepository;
import com.web.repository.CartRepository;
import com.web.repository.ProductRepository;
import com.web.servive.VoucherService;
import com.web.utils.UserUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
public class VoucherServiceimp implements VoucherService {

    @Autowired
    private VoucherRepository voucherRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserUtils userUtils;

    @Override
    public Voucher create(Voucher voucher) {
        Optional<Voucher> ex = voucherRepository.findByCode(voucher.getCode());
        if (ex.isPresent()) {
            throw new MessageException("Mã voucher đã tồn tại");
        }
        Voucher result = voucherRepository.save(voucher);
        return result;
    }

    @Override
    public Voucher update(Voucher voucher) {
        Optional<Voucher> ex = voucherRepository.findByCode(voucher.getCode());
        if (ex.isPresent()) {
            if (ex.get().getId() != voucher.getId()) {
                throw new MessageException("Mã voucher đã tồn tại");
            }
        }
        Voucher result = voucherRepository.save(voucher);
        return result;
    }

    @Override
    public void delete(Long id) {
        invoiceRepository.setNullVoucher(id);
        voucherRepository.deleteById(id);
    }

    @Override
    public List<Voucher> findAll(Date start, Date end) {
        if (start == null || end == null) {
            start = Date.valueOf("2000-01-01");
            end = Date.valueOf("2200-01-01");
        }
        List<Voucher> list = voucherRepository.findByDate(start, end);
        return list;
    }

    @Override
    public Page<Voucher> findAll(Date start, Date end, Pageable pageable) {
        if (start == null || end == null) {
            start = Date.valueOf("2000-01-01");
            end = Date.valueOf("2200-01-01");
        }
        Page<Voucher> page = voucherRepository.findByDate(start, end, pageable);
        return page;
    }

    @Override
    public Optional<Voucher> findById(Long id) {
        Optional<Voucher> ex = voucherRepository.findById(id);
        if (ex.isEmpty()) {
            throw new MessageException("Not found");
        }
        return ex;
    }

    @Override
    public void block(Long id) {
        Optional<Voucher> ex = voucherRepository.findById(id);
        if (ex.isEmpty()) {
            throw new MessageException("Not found");
        }
        if (ex.get().getBlock() == true) {
            ex.get().setBlock(false);
        } else {
            ex.get().setBlock(true);
        }
        voucherRepository.save(ex.get());
    }

    @Override
    public Optional<Voucher> findByCode(String code, Double amount) {
        return findByCode(code, amount, null);
    }

    @Override
    public Optional<Voucher> findByCode(String code, Double amount, Long shopId) {
        Optional<Voucher> ex = voucherRepository.findByCode(code);
        if (ex.isEmpty()) {
            throw new MessageException("Mã voucher không khả dụng");
        }
        Voucher voucher = ex.get();
        if (voucher.getBlock() == true) {
            throw new MessageException("Mã voucher không thể sử dụng");
        }
        Date now = new Date(System.currentTimeMillis());
        if (!((voucher.getStartDate().before(now) || voucher.getStartDate().equals(now))
                && (voucher.getEndDate().after(now) || voucher.getEndDate().equals(now)))) {
            throw new MessageException("Mã voucher đã hết hạn");
        }

        // ── Kiểm tra shop ──
        if (shopId != null && voucher.getShop() != null) {
            if (!voucher.getShop().getId().equals(shopId)) {
                throw new MessageException("Mã voucher này không áp dụng cho shop đã chọn");
            }
        }

        // Lấy giỏ hàng của người dùng để tính toán
        User currentUser = userUtils.getUserWithAuthority();
        double eligibleSubtotal = amount; // fallback
        double shopSubtotal = amount;      // fallback

        if (currentUser != null && shopId != null) {
            List<Cart> carts = cartRepository.findByUserAndShopId(currentUser.getId(), shopId);
            if (carts != null && !carts.isEmpty()) {
                shopSubtotal = carts.stream().mapToDouble(c -> {
                    ProductVariant v = c.getProductVariant();
                    double price = (v != null && v.getPrice() != null) ? v.getPrice() : 0;
                    int qty = (c.getQuantity() != null) ? c.getQuantity() : 0;
                    return price * qty;
                }).sum();

                if (voucher.getApplyAll() != null && !voucher.getApplyAll()) {
                    List<VoucherProduct> voucherProducts = voucher.getVoucherProducts();
                    eligibleSubtotal = carts.stream()
                        .filter(c -> c.getProductVariant() != null && c.getProductVariant().getProduct() != null)
                        .mapToDouble(c -> {
                            Long productId = c.getProductVariant().getProduct().getId();
                            boolean hasProduct = voucherProducts.stream()
                                    .anyMatch(vp -> vp.getProduct() != null && vp.getProduct().getId().equals(productId));

                            if (hasProduct) {
                                ProductVariant v = c.getProductVariant();
                                double price = (v != null && v.getPrice() != null) ? v.getPrice() : 0;
                                int qty = (c.getQuantity() != null) ? c.getQuantity() : 0;
                                return price * qty;
                            }
                            return 0.0;
                        }).sum();
                } else {
                    eligibleSubtotal = shopSubtotal;
                }
            }
        }

        if (voucher.getMinAmount() > shopSubtotal) {
            throw new MessageException("Số tiền đơn hàng chưa đủ điều kiện áp dụng voucher này (Tối thiểu " + String.format("%.0f", voucher.getMinAmount()) + "đ)");
        }

        // Tính tiền giảm giá thực tế
        double calculatedDiscount = 0;
        if (voucher.getApplyAll() != null && !voucher.getApplyAll()) {
            if (currentUser != null && shopId != null) {
                List<Cart> carts = cartRepository.findByUserAndShopId(currentUser.getId(), shopId);
                if (carts != null && !carts.isEmpty()) {
                    List<VoucherProduct> voucherProducts = voucher.getVoucherProducts();
                    calculatedDiscount = carts.stream()
                        .filter(c -> c.getProductVariant() != null && c.getProductVariant().getProduct() != null)
                        .mapToDouble(c -> {
                            Long productId = c.getProductVariant().getProduct().getId();
                            Optional<VoucherProduct> vpOpt = voucherProducts.stream()
                                    .filter(vp -> vp.getProduct() != null && vp.getProduct().getId().equals(productId))
                                    .findFirst();

                            if (vpOpt.isPresent()) {
                                double prodDiscountVal = vpOpt.get().getDiscount() != null ? vpOpt.get().getDiscount() : 0.0;
                                ProductVariant v = c.getProductVariant();
                                double price = (v != null && v.getPrice() != null) ? v.getPrice() : 0;
                                int qty = (c.getQuantity() != null) ? c.getQuantity() : 0;
                                double itemSubtotal = price * qty;

                                if (voucher.getIsPercentage() != null && voucher.getIsPercentage()) {
                                    return itemSubtotal * (prodDiscountVal / 100.0);
                                } else {
                                    double itemDisc = prodDiscountVal * qty;
                                    return itemDisc > itemSubtotal ? itemSubtotal : itemDisc;
                                }
                            }
                            return 0.0;
                        }).sum();
                }
            } else {
                if (voucher.getIsPercentage() != null && voucher.getIsPercentage()) {
                    calculatedDiscount = eligibleSubtotal * (voucher.getDiscount() / 100.0);
                } else {
                    calculatedDiscount = voucher.getDiscount();
                }
            }
        } else {
            if (voucher.getIsPercentage() != null && voucher.getIsPercentage()) {
                calculatedDiscount = eligibleSubtotal * (voucher.getDiscount() / 100.0);
            } else {
                calculatedDiscount = voucher.getDiscount();
            }
        }

        if (calculatedDiscount > eligibleSubtotal) {
            calculatedDiscount = eligibleSubtotal;
        }

        voucher.setCalculatedDiscount(calculatedDiscount);
        return ex;
    }

    @Override
    public Voucher createForSeller(Voucher voucher) {
        com.web.entity.User currentUser = userUtils.getUserWithAuthority();
        if (currentUser == null || currentUser.getShop() == null) {
            throw new MessageException("Tài khoản seller chưa có shop");
        }
        if (currentUser.getShop().getStatus() == com.web.enums.ShopStatus.LOCKED) {
            throw new MessageException("Cửa hàng của bạn đang bị khóa bởi Admin. Không thể thực hiện thao tác này.");
        }
        Optional<Voucher> ex = voucherRepository.findByCode(voucher.getCode());
        if (ex.isPresent()) {
            throw new MessageException("Mã voucher đã tồn tại");
        }

        Voucher newVoucher = new Voucher();
        newVoucher.setCode(voucher.getCode());
        newVoucher.setName(voucher.getName());
        newVoucher.setDiscount(voucher.getDiscount());
        newVoucher.setMinAmount(voucher.getMinAmount());
        newVoucher.setStartDate(voucher.getStartDate());
        newVoucher.setEndDate(voucher.getEndDate());
        newVoucher.setBlock(voucher.getBlock());
        newVoucher.setIsPercentage(voucher.getIsPercentage());
        newVoucher.setApplyAll(voucher.getApplyAll());
        newVoucher.setShop(currentUser.getShop());
        newVoucher.setQuantity(voucher.getQuantity());

        if (voucher.getApplyAll() != null && !voucher.getApplyAll() && voucher.getVoucherProducts() != null) {
            for (VoucherProduct vp : voucher.getVoucherProducts()) {
                if (vp.getProduct() != null && vp.getProduct().getId() != null) {
                    Product prod = productRepository.findById(vp.getProduct().getId()).orElse(null);
                    if (prod != null) {
                        VoucherProduct newVp = new VoucherProduct();
                        newVp.setVoucher(newVoucher);
                        newVp.setProduct(prod);
                        newVp.setDiscount(vp.getDiscount());
                        newVoucher.getVoucherProducts().add(newVp);
                    }
                }
            }
        }

        return voucherRepository.save(newVoucher);
    }

    @Override
    public Voucher updateForSeller(Voucher voucher) {
        com.web.entity.User currentUser = userUtils.getUserWithAuthority();
        if (currentUser == null || currentUser.getShop() == null) {
            throw new MessageException("Tài khoản seller chưa có shop");
        }
        if (currentUser.getShop().getStatus() == com.web.enums.ShopStatus.LOCKED) {
            throw new MessageException("Cửa hàng của bạn đang bị khóa bởi Admin. Không thể thực hiện thao tác này.");
        }
        // Kiểm tra voucher này có thuộc shop của seller không
        Voucher exist = voucherRepository.findById(voucher.getId())
                .orElseThrow(() -> new MessageException("Không tìm thấy voucher"));
        if (exist.getShop() == null || !exist.getShop().getId().equals(currentUser.getShop().getId())) {
            throw new MessageException("Bạn không có quyền chỉnh sửa voucher này");
        }
        // Kiểm tra trùng mã
        Optional<Voucher> duplicate = voucherRepository.findByCode(voucher.getCode());
        if (duplicate.isPresent() && !duplicate.get().getId().equals(voucher.getId())) {
            throw new MessageException("Mã voucher đã tồn tại");
        }

        exist.setCode(voucher.getCode());
        exist.setName(voucher.getName());
        exist.setDiscount(voucher.getDiscount());
        exist.setMinAmount(voucher.getMinAmount());
        exist.setStartDate(voucher.getStartDate());
        exist.setEndDate(voucher.getEndDate());
        exist.setBlock(voucher.getBlock());
        exist.setIsPercentage(voucher.getIsPercentage());
        exist.setApplyAll(voucher.getApplyAll());
        exist.setQuantity(voucher.getQuantity());

        exist.getVoucherProducts().clear();
        if (voucher.getApplyAll() != null && !voucher.getApplyAll() && voucher.getVoucherProducts() != null) {
            for (VoucherProduct vp : voucher.getVoucherProducts()) {
                if (vp.getProduct() != null && vp.getProduct().getId() != null) {
                    Product prod = productRepository.findById(vp.getProduct().getId()).orElse(null);
                    if (prod != null) {
                        VoucherProduct newVp = new VoucherProduct();
                        newVp.setVoucher(exist);
                        newVp.setProduct(prod);
                        newVp.setDiscount(vp.getDiscount());
                        exist.getVoucherProducts().add(newVp);
                    }
                }
            }
        }

        return voucherRepository.save(exist);
    }

    @Override
    public void deleteForSeller(Long id) {
        com.web.entity.User currentUser = userUtils.getUserWithAuthority();
        if (currentUser == null || currentUser.getShop() == null) {
            throw new MessageException("Tài khoản seller chưa có shop");
        }
        Voucher exist = voucherRepository.findById(id)
                .orElseThrow(() -> new MessageException("Không tìm thấy voucher"));
        if (exist.getShop() == null || !exist.getShop().getId().equals(currentUser.getShop().getId())) {
            throw new MessageException("Bạn không có quyền xóa voucher này");
        }
        invoiceRepository.setNullVoucher(id);
        voucherRepository.deleteById(id);
    }

    @Override
    public Page<Voucher> findAllBySeller(Date start, Date end, Pageable pageable) {
        com.web.entity.User currentUser = userUtils.getUserWithAuthority();
        if (currentUser == null || currentUser.getShop() == null) {
            throw new MessageException("Tài khoản seller chưa có shop");
        }
        if (start == null || end == null) {
            start = Date.valueOf("2000-01-01");
            end = Date.valueOf("2200-01-01");
        }
        return voucherRepository.findByShopAndDate(currentUser.getShop().getId(), start, end, pageable);
    }

    @Override
    public List<Voucher> findAllListBySeller(Date start, Date end) {
        com.web.entity.User currentUser = userUtils.getUserWithAuthority();
        if (currentUser == null || currentUser.getShop() == null) {
            throw new MessageException("Tài khoản seller chưa có shop");
        }
        if (start == null || end == null) {
            start = Date.valueOf("2000-01-01");
            end = Date.valueOf("2200-01-01");
        }
        return voucherRepository.findByShopAndDate(currentUser.getShop().getId(), start, end);
    }
}
