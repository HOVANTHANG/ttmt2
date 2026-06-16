package com.web.controller;

import com.web.repository.InvoiceDetailRepository;
import com.web.repository.InvoiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/seller")
public class SellerController {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private InvoiceDetailRepository invoiceDetailRepository;

    @RequestMapping(value = { "/index" }, method = RequestMethod.GET)
    public String dashboard() {
        return "seller/index";
    }

    @RequestMapping(value = { "/addproduct" }, method = RequestMethod.GET)
    public String addproduct() {
        return "seller/addproduct";
    }

    @RequestMapping(value = { "/addvoucher" }, method = RequestMethod.GET)
    public String addvoucher() {
        return "seller/addvoucher";
    }

    @RequestMapping(value = { "/seller-chat" }, method = RequestMethod.GET)
    public String chat() {
        return "seller/seller-chat";
    }

    @RequestMapping(value = { "/danhmuc" }, method = RequestMethod.GET)
    public String danhmuc() {
        return "seller/danhmuc";
    }

    @RequestMapping(value = { "/doanhthu" }, method = RequestMethod.GET)
    public String doanhthu() {
        return "seller/doanhthu";
    }

    @RequestMapping(value = { "/invoice" }, method = RequestMethod.GET)
    public String invoice() {
        return "seller/invoice";
    }

    @RequestMapping(value = { "/product" }, method = RequestMethod.GET)
    public String product() {
        return "seller/product";
    }

    @RequestMapping(value = { "/thuonghieu" }, method = RequestMethod.GET)
    public String thuonghieu() {
        return "seller/thuonghieu";
    }

    @RequestMapping(value = { "/voucher" }, method = RequestMethod.GET)
    public String voucher() {
        return "seller/voucher";
    }

    @RequestMapping(value = { "/baohanh" }, method = RequestMethod.GET)
    public String baohanh() {
        return "seller/baohanh";
    }

    @RequestMapping(value = { "/diachi" }, method = RequestMethod.GET)
    public String diachi() {
        return "seller/diachi";
    }

    @RequestMapping(value = { "/tonkho" }, method = RequestMethod.GET)
    public String tonkho() {
        return "seller/tonkho";
    }

    @RequestMapping(value = { "/in-don" }, method = RequestMethod.GET)
    public String indon(Model model, @RequestParam Long id) {
        model.addAttribute("hoaDon", invoiceRepository.findById(id).get());
        model.addAttribute("ctHoaDon", invoiceDetailRepository.findByInvoiceId(id));
        return "seller/indon";
    }

}
