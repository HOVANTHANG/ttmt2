package com.web.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaymentDto {
    private String codeVoucher;
    private String content;
    private Double shipCost;
    private String returnUrl;
    private String notifyUrl;

    /**
     * Nếu có giá trị: dùng trực tiếp làm số tiền MoMo (multi-shop).
     * Nếu null: server tự tính từ cart + shipCost (backward compat).
     */
    private Double totalAmount;
}
