package com.web.api;

import com.web.config.Environment;
import com.web.constants.LogUtils;
import com.web.constants.RequestType;
import com.web.dto.request.PaymentDto;
import com.web.dto.response.ResponsePayment;
import com.web.entity.Voucher;
import com.web.exception.MessageException;
import com.web.models.PaymentResponse;
import com.web.models.QueryStatusTransactionResponse;
import com.web.processor.CreateOrderMoMo;
import com.web.processor.QueryTransactionStatus;
import com.web.servive.CartService;
import com.web.servive.VoucherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class MomoApi {

    @Autowired
    private CartService cartService;

    @Autowired
    private VoucherService voucherService;

    @PostMapping("/urlpayment")
    public ResponsePayment getUrlPayment(@RequestBody PaymentDto paymentDto) {
        LogUtils.init();

        // ── Tính số tiền thanh toán ──
        double totalAmount;

        if (paymentDto.getTotalAmount() != null && paymentDto.getTotalAmount() > 0) {
            // Multi-shop: frontend gửi grand total đã tính sẵn (subtotal + ship - voucher)
            totalAmount = paymentDto.getTotalAmount();
        } else {
            // Single-shop (backward compat): server tự tính từ cart
            totalAmount = cartService.totalAmountCart();
            if (paymentDto.getShipCost() != null) {
                totalAmount += paymentDto.getShipCost();
            }
            if (paymentDto.getCodeVoucher() != null && !paymentDto.getCodeVoucher().isEmpty()) {
                Optional<Voucher> voucher = voucherService.findByCode(paymentDto.getCodeVoucher(), totalAmount);
                if (voucher.isPresent()) {
                    totalAmount -= voucher.get().getDiscount();
                }
            }
        }

        if (totalAmount <= 0) {
            throw new MessageException("Số tiền thanh toán không hợp lệ");
        }

        Long td = Math.round(totalAmount);
        String orderId   = String.valueOf(System.currentTimeMillis());
        String requestId = String.valueOf(System.currentTimeMillis());

        Environment environment = Environment.selectEnv("dev");
        PaymentResponse captureATMMoMoResponse = null;

        try {
            captureATMMoMoResponse = CreateOrderMoMo.process(
                    environment, orderId, requestId,
                    Long.toString(td),
                    paymentDto.getContent(),
                    paymentDto.getReturnUrl(),
                    paymentDto.getNotifyUrl(),
                    "", RequestType.PAY_WITH_ATM, null);
        } catch (Exception e) {
            e.printStackTrace();
            throw new MessageException("Không tạo được link thanh toán MoMo: " + e.getMessage());
        }

        if (captureATMMoMoResponse == null || captureATMMoMoResponse.getPayUrl() == null) {
            throw new MessageException("MoMo không trả về link thanh toán. Vui lòng thử lại.");
        }

        System.out.println("MoMo payUrl: " + captureATMMoMoResponse.getPayUrl());
        return new ResponsePayment(captureATMMoMoResponse.getPayUrl(), orderId, requestId);
    }

    @GetMapping("/checkPayment")
    public Integer checkPayment(
            @RequestParam("orderId")   String orderId,
            @RequestParam("requestId") String requestId) throws Exception {
        Environment environment = Environment.selectEnv("dev");
        QueryStatusTransactionResponse resp = QueryTransactionStatus.process(environment, orderId, requestId);
        System.out.println("MoMo checkPayment: " + resp.getMessage());
        return resp.getResultCode() == 0 ? 0 : 1;
    }
}
