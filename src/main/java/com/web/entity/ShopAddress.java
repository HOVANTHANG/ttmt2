package com.web.entity;

import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.sql.Date;

@Entity
@Table(name = "shop_address")
@Getter
@Setter
public class ShopAddress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fullname;

    private String phone;

    private String streetName;

    private Boolean primaryAddres = false;

    private Date createdDate;

    @ManyToOne
    @JoinColumn(name = "ward_id")
    private Wards wards;

    @ManyToOne
    @JoinColumn(name = "shop_id")
    private Shop shop;
}
