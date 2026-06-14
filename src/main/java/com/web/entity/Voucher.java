package com.web.entity;

import lombok.Getter;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.ArrayList;

import javax.persistence.*;
import java.sql.Date;

@Entity
@Table(name = "voucher")
@Getter
@Setter
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    private String code;

    private String name;

    private Double discount;

    private Double minAmount;

    private Date startDate;

    private Date endDate;

    private Boolean block;

    private Integer quantity;

    private Boolean isPercentage = false;

    private Boolean applyAll = true;

    @OneToMany(mappedBy = "voucher", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("voucher")
    private List<VoucherProduct> voucherProducts = new ArrayList<>();

    @Transient
    private Double calculatedDiscount;

    @ManyToOne
    @JoinColumn(name = "shop_id")
    private Shop shop;
}
