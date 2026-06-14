package com.web.serviceImp;

import com.web.config.Environment;
import com.web.dto.request.InvoiceRequest;
import com.web.dto.response.CartResponse;
import com.web.dto.response.InvoiceResponse;
import com.web.entity.*;
import com.web.enums.PayType;
import com.web.enums.StatusInvoice;
import com.web.exception.MessageException;
import com.web.mapper.InvoiceMapper;
import com.web.models.QueryStatusTransactionResponse;
import com.web.processor.QueryTransactionStatus;
import com.web.repository.*;
import com.web.servive.CartService;
import com.web.servive.InvoiceService;
import com.web.servive.VoucherService;
import com.web.utils.CommonPage;
import com.web.utils.UserUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.sql.Time;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.List;
import java.util.Optional;

import javax.transaction.Transactional;

@Component
public class InvoiceServiceImp implements InvoiceService {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private HistoryPayRepository historyPayRepository;

    @Autowired
    private UserUtils userUtils;

    @Autowired
    private UserAddressRepository userAddressRepository;

    @Autowired
    private InvoiceDetailRepository invoiceDetailRepository;

    @Autowired
    private VoucherRepository voucherRepository;

    @Autowired
    private VoucherService voucherService;

    @Autowired
    private CommonPage commonPage;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CartService cartService;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private InvoiceMapper invoiceMapper;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Override
    @Transactional
    public InvoiceResponse create(InvoiceRequest invoiceRequest) {

        // ================= MOMO CHECK =================
        if (invoiceRequest.getPayType().equals(PayType.MOMO)) {

            if (invoiceRequest.getRequestIdMomo() == null || invoiceRequest.getOrderIdMomo() == null) {
                throw new MessageException("orderid and requestid require");
            }

            // Nếu HistoryPay đã tồn tại → đây là invoice thứ 2+ trong cùng giao dịch MoMo
            // (trường hợp multi-shop). Bỏ qua check trùng, chỉ xác minh lần đầu.
            boolean alreadyRecorded = historyPayRepository
                    .findByOrderIdAndRequestId(invoiceRequest.getOrderIdMomo(), invoiceRequest.getRequestIdMomo())
                    .isPresent();

            if (!alreadyRecorded) {
                // Xác minh thanh toán với MoMo server (chỉ lần đầu)
                try {
                    Environment environment = Environment.selectEnv("dev");
                    QueryStatusTransactionResponse res = QueryTransactionStatus.process(
                            environment,
                            invoiceRequest.getOrderIdMomo(),
                            invoiceRequest.getRequestIdMomo());

                    if (res.getResultCode() != 0) {
                        throw new MessageException("Đơn hàng chưa được thanh toán");
                    }
                } catch (MessageException me) {
                    throw me;
                } catch (Exception e) {
                    throw new MessageException("Đơn hàng chưa được thanh toán");
                }
            }
        }

        // ================= ADDRESS =================
        if (invoiceRequest.getUserAddressId() == null) {
            throw new MessageException("Hãy thêm địa chỉ của bạn vào tài khoản ");
        }

        UserAddress address = userAddressRepository.findById(invoiceRequest.getUserAddressId())
                .orElseThrow(() -> new MessageException("Hãy thêm địa chỉ của bạn vào tài khoản"));

        User currentUser = userUtils.getUserWithAuthority();

        if (!address.getUser().getId().equals(currentUser.getId())) {
            throw new MessageException("access denied");
        }

        // ================= CART (lọc theo shopId nếu có) =================
        Long shopId = invoiceRequest.getShopId();

        List<Cart> carts = (shopId != null)
                ? cartRepository.findByUserAndShopId(currentUser.getId(), shopId)
                : cartRepository.findByUser(currentUser.getId());

        if (carts.isEmpty()) {
            throw new MessageException("Giỏ hàng trống hoặc không có sản phẩm của shop này");
        }

        // ================= TÍNH TOTAL (chỉ cho các cart được chọn) =================
        double totalAmount = carts.stream().mapToDouble(c -> {
            ProductVariant v = c.getProductVariant();
            double price = (v != null && v.getPrice() != null) ? v.getPrice() : 0;
            int qty = (c.getQuantity() != null) ? c.getQuantity() : 0;
            return price * qty;
        }).sum();

        if (invoiceRequest.getShipCost() != null) {
            totalAmount += invoiceRequest.getShipCost();
        }

        // ================= TẠO INVOICE =================
        Invoice invoice = new Invoice();
        invoice.setShipCost(invoiceRequest.getShipCost());
        invoice.setCreatedDate(new Date(System.currentTimeMillis()));
        invoice.setCreatedTime(new Time(System.currentTimeMillis()));
        invoice.setUserAddress(address);
        invoice.setNote(invoiceRequest.getNote());
        invoice.setPhone(address.getPhone());
        invoice.setReceiverName(address.getFullname());
        invoice.setPayType(invoiceRequest.getPayType());
        invoice.setStatusInvoice(StatusInvoice.DANG_CHO_XAC_NHAN);

        invoice.setAddress(
                address.getStreetName() + ", " +
                        address.getWards().getName() + ", " +
                        address.getWards().getDistricts().getName() + ", " +
                        address.getWards().getDistricts().getProvince().getName());

        // ================= VOUCHER =================
        if (invoiceRequest.getVoucherCode() != null && !invoiceRequest.getVoucherCode().isEmpty()) {
            double subtotalAmount = totalAmount;
            if (invoiceRequest.getShipCost() != null) {
                subtotalAmount -= invoiceRequest.getShipCost();
            }
            Optional<Voucher> voucher = voucherService.findByCode(invoiceRequest.getVoucherCode(), subtotalAmount, shopId);
            if (voucher.isPresent()) {
                Double discount = voucher.get().getCalculatedDiscount();
                if (discount == null) {
                    discount = voucher.get().getDiscount();
                }
                totalAmount -= discount;
                invoice.setVoucher(voucher.get());
            }
        }

        invoice.setTotalAmount(totalAmount);
        Invoice savedInvoice = invoiceRepository.save(invoice);

        // ================= CART ITEMS → INVOICE DETAILS =================
        for (Cart c : carts) {

            ProductVariant variant = c.getProductVariant();
            if (variant == null)
                throw new MessageException("Không tìm thấy biến thể sản phẩm");
            if (variant.getProduct() == null)
                throw new MessageException("Không tìm thấy sản phẩm");

            int cartQty = (c.getQuantity() != null) ? c.getQuantity() : 0;
            int currentQty = (variant.getQuantity() != null) ? variant.getQuantity() : 0;

            if (currentQty < cartQty) {
                throw new MessageException("Sản phẩm \"" + variant.getProduct().getName() + "\" không đủ hàng");
            }

            InvoiceDetail detail = new InvoiceDetail();
            detail.setInvoice(savedInvoice);
            detail.setPrice(variant.getPrice());
            detail.setImportPrice(variant.getImportPrice());
            detail.setQuantity(cartQty);
            detail.setProductVariant(variant);
            invoiceDetailRepository.save(detail);

            variant.setQuantity(currentQty - cartQty);
            productVariantRepository.save(variant);
        }

        // ================= MOMO SAVE =================
        // Chỉ lưu HistoryPay 1 lần cho cùng 1 giao dịch MoMo
        // (invoice thứ 2+ trong multi-shop bỏ qua bước này)
        if (invoiceRequest.getPayType().equals(PayType.MOMO)) {
            boolean historyExists = historyPayRepository
                    .findByOrderIdAndRequestId(invoiceRequest.getOrderIdMomo(), invoiceRequest.getRequestIdMomo())
                    .isPresent();

            if (!historyExists) {
                HistoryPay hp = new HistoryPay();
                hp.setInvoice(savedInvoice);
                hp.setRequestId(invoiceRequest.getRequestIdMomo());
                hp.setOrderId(invoiceRequest.getOrderIdMomo());
                hp.setCreatedTime(new Time(System.currentTimeMillis()));
                hp.setCreatedDate(new Date(System.currentTimeMillis()));
                hp.setTotalAmount(totalAmount);
                historyPayRepository.save(hp);
            }
        }

        // ================= XÓA CART =================
        // Nếu có shopId: xóa đúng các cart item đã fetch (tránh lỗi MySQL DELETE+JOIN)
        // Nếu không: xóa toàn bộ
        if (shopId != null) {
            cartRepository.deleteAll(carts); // deleteAll(Iterable) → DELETE by ID, không dùng JOIN
        } else {
            cartService.removeCart();
        }

        // ================= RESPONSE =================
        InvoiceResponse res = new InvoiceResponse();
        res.setId(savedInvoice.getId());
        res.setTotalAmount(savedInvoice.getTotalAmount());
        res.setStatusInvoice(savedInvoice.getStatusInvoice());
        res.setCreatedDate(savedInvoice.getCreatedDate());
        res.setCreatedTime(savedInvoice.getCreatedTime());

        return res;
    }

    @Override
    public InvoiceResponse updateStatus(Long invoiceId, StatusInvoice statusInvoice) {
        Optional<Invoice> invoice = invoiceRepository.findById(invoiceId);
        if (invoice.isEmpty()) {
            throw new MessageException("invoice id not found");
        }
        invoice.get().setStatusInvoice(statusInvoice);
        Date d = new Date(System.currentTimeMillis());
        try {
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd hh:mm:ss");
            java.util.Date parsedDate = dateFormat.parse(d.toString() + " 00:00:00");
            Timestamp timestamp = new java.sql.Timestamp(parsedDate.getTime());
            invoice.get().setStatusUpdateDate(timestamp);
        } catch (Exception e) { // this generic but you can control another types of exception
            // look the origin of excption
        }

        invoiceRepository.save(invoice.get());
        return null;
    }

    @Override
    public List<InvoiceResponse> findByUser() {
        User user = userUtils.getUserWithAuthority();
        List<Invoice> invoices = invoiceRepository.findByUser(user.getId());
        List<InvoiceResponse> list = invoiceMapper.invoiceListToInvoiceResponseList(invoices);
        return list;
    }

    @Override
    public Page<InvoiceResponse> findAll(Date from, Date to, Pageable pageable) {
        if (from == null || to == null) {
            from = Date.valueOf("2000-01-01");
            to = Date.valueOf("2200-01-01");
        }
        Page<Invoice> page = invoiceRepository.findByDate(from, to, pageable);
        // List<InvoiceResponse> list =
        // invoiceMapper.invoiceListToInvoiceResponseList(page.getContent());
        // Page<InvoiceResponse> result = commonPage.restPage(page,list);
        return null;
    }

    @Override
    @Transactional
    public InvoiceResponse cancelInvoice(Long invoiceId, String reason) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new MessageException("invoice id not found"));

        if (!invoice.getUserAddress().getUser().getId().equals(userUtils.getUserWithAuthority().getId())) {
            throw new MessageException("access denied");
        }

        if (invoice.getStatusInvoice() == null) {
            throw new MessageException("Trạng thái đơn hàng không hợp lệ");
        }

        // chỉ cho hủy khi đơn chưa giao
        if (!(invoice.getStatusInvoice().equals(StatusInvoice.DANG_CHO_XAC_NHAN)
                || invoice.getStatusInvoice().equals(StatusInvoice.DA_XAC_NHAN))) {
            throw new MessageException("Đơn hàng ở trạng thái " + invoice.getStatusInvoice() + " không thể hủy");
        }

        // nếu momo và bạn không muốn cho hủy thì mở lại đoạn này
        // if (invoice.getPayType().equals(PayType.MOMO)) {
        // throw new MessageException("Đơn hàng đã thanh toán MOMO, không thể hủy");
        // }

        List<InvoiceDetail> details = invoiceDetailRepository.findByInvoiceId(invoiceId);

        for (InvoiceDetail d : details) {
            ProductVariant variant = d.getProductVariant();
            if (variant != null) {
                Integer currentQty = variant.getQuantity() == null ? 0 : variant.getQuantity();
                Integer detailQty = d.getQuantity() == null ? 0 : d.getQuantity();

                variant.setQuantity(currentQty + detailQty);
                productVariantRepository.save(variant);
            }

            try {
                Product product = d.getProductVariant() != null ? d.getProductVariant().getProduct() : null;
                if (product != null) {
                    Long sold = product.getSold() == null ? 0 : product.getSold();
                    Long detailQty = d.getQuantity() == null ? 0L : d.getQuantity();

                    Long newSold = sold - detailQty;
                    product.setSold(Math.max(newSold, 0));
                    productRepository.save(product);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        invoice.setStatusInvoice(StatusInvoice.DA_HUY);
        invoice.setReasonCancel(reason);
        Invoice result = invoiceRepository.save(invoice);

        InvoiceResponse response = new InvoiceResponse();
        response.setId(result.getId());
        response.setCreatedDate(result.getCreatedDate());
        response.setCreatedTime(result.getCreatedTime());
        response.setStatusInvoice(result.getStatusInvoice());
        response.setTotalAmount(result.getTotalAmount());
        response.setAddress(result.getAddress());
        response.setPhone(result.getPhone());
        response.setReceiverName(result.getReceiverName());
        response.setPayType(result.getPayType());
        response.setReasonCancel(result.getReasonCancel());

        return response;
    }

    @Override
    public InvoiceResponse findById(Long invoiceId) {
        Optional<Invoice> invoice = invoiceRepository.findById(invoiceId);
        if (invoice.isEmpty()) {
            throw new MessageException("invoice id not found");
        }
        // if(invoice.get().getUserAddress().getUser().getId() !=
        // userUtils.getUserWithAuthority().getId()){
        // throw new MessageException("access denied");
        // }
        return invoiceMapper.invoiceToInvoiceResponse(invoice.get());
    }

    @Override
    public InvoiceResponse findByIdForAdmin(Long invoiceId) {
        Optional<Invoice> invoice = invoiceRepository.findById(invoiceId);
        if (invoice.isEmpty()) {
            throw new MessageException("invoice id not found");
        }
        return null;
    }

    @Override
    public InvoiceResponse timKiemDonHang(Long id, String phone) {
        Optional<Invoice> invoice = invoiceRepository.findById(id);
        if (invoice.isEmpty()) {
            throw new MessageException("Không tìm thấy đơn hàng");
        }
        if (!invoice.get().getUserAddress().getUser().getPhone().equals(phone)
                && !invoice.get().getPhone().equals(phone)) {
            throw new MessageException("Số điện thoại hoặc mã đơn hàng không chính xác");
        }
        return invoiceMapper.invoiceToInvoiceResponse(invoice.get());
    }

    @Override
    public Page<InvoiceResponse> searchInvoice(String q, Pageable pageable) {
        Page<Invoice> page = invoiceRepository.searchInvoice(q, pageable);
        List<InvoiceResponse> list = invoiceMapper.invoiceListToInvoiceResponseList(page.getContent());
        return commonPage.restPage(page, list);
    }

    @Override
    public Page<InvoiceResponse> findAllFull(Date from, Date to, PayType payType, StatusInvoice statusInvoice,
            Pageable pageable) {
        if (from == null || to == null) {
            from = Date.valueOf("2000-01-01");
            to = Date.valueOf("2200-01-01");
        }
        Page<Invoice> page = null;
        if (payType == null && statusInvoice == null) {
            page = invoiceRepository.findByDate(from, to, pageable);
        }
        if (payType == null && statusInvoice != null) {
            page = invoiceRepository.findByDateAndStatus(from, to, statusInvoice, pageable);
        }
        if (payType != null && statusInvoice == null) {
            page = invoiceRepository.findByDateAndPaytype(from, to, payType, pageable);
        }
        if (payType != null && statusInvoice != null) {
            page = invoiceRepository.findByDateAndPaytypeAndStatus(from, to, payType, statusInvoice, pageable);
        }

        List<InvoiceResponse> list = invoiceMapper.invoiceListToInvoiceResponseList(page.getContent());
        Page<InvoiceResponse> result = commonPage.restPage(page, list);
        return result;
    }

    private Long getCurrentSellerShopId() {
        User currentUser = userUtils.getUserWithAuthority();

        if (currentUser == null) {
            throw new MessageException("Bạn chưa đăng nhập");
        }

        if (currentUser.getAuthorities() == null || currentUser.getAuthorities().getName() == null) {
            throw new MessageException("Không xác định được quyền");
        }

        if (!"ROLE_SELLER".equals(currentUser.getAuthorities().getName())) {
            throw new MessageException("Chỉ seller mới được phép");
        }

        if (currentUser.getShop() == null) {
            throw new MessageException("Tài khoản seller chưa có shop");
        }

        return currentUser.getShop().getId();
    }

    @Override
    public Page<Invoice> findInvoiceBySellerShop(String from, String to, PayType payType, StatusInvoice status,
            Pageable pageable, String sort) {
        Long shopId = getCurrentSellerShopId();

        if (from == null && to == null && payType == null && status == null) {
            return invoiceRepository.findBySellerShop(shopId, pageable);
        }

        return invoiceRepository.findBySellerShopFilter(shopId, payType, status, pageable);
    }

    @Override
    public Invoice findByIdForSeller(Long idInvoice) {
        Long shopId = getCurrentSellerShopId();

        Invoice invoice = invoiceRepository.findById(idInvoice)
                .orElseThrow(() -> new MessageException("Không tìm thấy hóa đơn"));

        boolean hasShopProduct = invoiceDetailRepository.existsByInvoiceIdAndShopId(idInvoice, shopId);
        if (!hasShopProduct) {
            throw new MessageException("Bạn không có quyền xem hóa đơn này");
        }

        return invoice;
    }

    @Override
    @Transactional
    public void updateStatusForSeller(Long idInvoice, StatusInvoice status) {

        Long shopId = getCurrentSellerShopId();

        Invoice invoice = invoiceRepository.findById(idInvoice)
                .orElseThrow(() -> new MessageException("Không tìm thấy hóa đơn"));

        boolean hasShopProduct = invoiceDetailRepository.existsByInvoiceIdAndShopId(
                idInvoice,
                shopId);

        if (!hasShopProduct) {
            throw new MessageException("Bạn không có quyền cập nhật hóa đơn này");
        }

        // trạng thái cũ
        StatusInvoice oldStatus = invoice.getStatusInvoice();

        invoice.setStatusInvoice(status);
        invoice.setStatusUpdateDate(new Timestamp(System.currentTimeMillis()));

        invoiceRepository.save(invoice);

        // chỉ cộng sold khi chuyển sang DA_NHAN lần đầu
        if (oldStatus != StatusInvoice.DA_NHAN
                && status == StatusInvoice.DA_NHAN) {

            List<InvoiceDetail> details = invoiceDetailRepository.findByInvoiceId(idInvoice);

            for (InvoiceDetail detail : details) {

                Product product = detail.getProductVariant().getProduct();

                Shop shop = product.getShop();

                // ===== PRODUCT SOLD =====
                if (product.getSold() == null) {
                    product.setSold(0L);
                }

                product.setSold(
                        product.getSold()
                                + detail.getQuantity());

                productRepository.save(product);

                // ===== SHOP SOLD =====
                if (shop != null) {

                    if (shop.getTotalSold() == null) {
                        shop.setTotalSold(0L);
                    }

                    shop.setTotalSold(
                            shop.getTotalSold()
                                    + detail.getQuantity());

                    shopRepository.save(shop);
                }
            }
        }
    }

    @Override
    public Page<Invoice> searchInvoiceForSeller(String q, Pageable pageable) {
        Long shopId = getCurrentSellerShopId();
        return invoiceRepository.searchBySellerShop(shopId, "%" + q + "%", pageable);
    }

    @Override
    public Long getLatestIdForSeller() {
        Long shopId = getCurrentSellerShopId();
        Long latestId = invoiceRepository.findLatestIdByShopId(shopId);
        return latestId != null ? latestId : 0L;
    }

    @Override
    public java.util.Map<String, Object> getAdminPendingInfo(Long lastSeenId) {
        Long count = invoiceRepository.countPendingForAdminSince(StatusInvoice.DANG_CHO_XAC_NHAN, lastSeenId);
        Long latestId = invoiceRepository.maxPendingIdForAdmin(StatusInvoice.DANG_CHO_XAC_NHAN);

        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("count", count);
        response.put("latestId", latestId);
        return response;
    }

    @Override
    public java.util.Map<String, Object> getSellerPendingInfo(Long lastSeenId) {
        Long shopId = getCurrentSellerShopId();
        Long count = invoiceRepository.countPendingForSellerSince(shopId, StatusInvoice.DANG_CHO_XAC_NHAN, lastSeenId);
        Long latestId = invoiceRepository.maxPendingIdBySellerShopAndStatus(shopId, StatusInvoice.DANG_CHO_XAC_NHAN);

        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("count", count);
        response.put("latestId", latestId);
        return response;
    }

}
