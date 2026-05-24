package com.web.dto.request;

import com.web.enums.PayType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InvoiceRequest {

    private PayType payType;

    private String requestIdMomo;

    private String orderIdMomo;

    private Long userAddressId;

    private String voucherCode;

    private Double shipCost;

    private String note;

    /**
     * ID của shop cần tạo invoice.
     * Khi có giá trị: chỉ lấy cart items của shop này và xóa cart của shop này sau khi tạo.
     * Khi null: lấy toàn bộ cart (backward compatible với flow cũ).
     */
    private Long shopId;

}
