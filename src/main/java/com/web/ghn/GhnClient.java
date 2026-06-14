package com.web.ghn;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.Map;

@Service
public class GhnClient {

    @Value("${ghn.api.key}")
    private String apiKey;

    @Value("${ghn.shopId}")
    private String shopId;

    @Value("${ghn.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;

    public GhnClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    private String getBaseUrl() {
        if (apiUrl != null && apiUrl.contains("/v2/shipping-order/fee")) {
            return apiUrl.replace("/v2/shipping-order/fee", "");
        }

        return "https://dev-online-gateway.ghn.vn/shiip/public-api";
    }

    public Map<String, Object> calculateShippingFee(Integer weight, Integer toDistrictId, String toWardCode,
            Integer fromDistrictId, String fromWardCode) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Token", apiKey);
        headers.set("ShopId", shopId);
        headers.set("Content-Type", "application/json");

        Map<String, Object> shippingData = new HashMap<>();
        shippingData.put("from_district_id", fromDistrictId != null ? fromDistrictId : 3440);
        shippingData.put("from_ward_code", fromWardCode != null ? fromWardCode : "21005");
        shippingData.put("to_district_id", toDistrictId);
        shippingData.put("to_ward_code", toWardCode);
        shippingData.put("weight", weight != null ? weight : 200);

        shippingData.put("service_type_id", 2);
        shippingData.put("length", 20);
        shippingData.put("width", 15);
        shippingData.put("height", 10);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(shippingData, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    apiUrl,
                    HttpMethod.POST,
                    request,
                    Map.class);
            return response.getBody();
        } catch (Exception e) {
            System.err.println("Error calling GHN calculateShippingFee: " + e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("code", 500);
            errorMap.put("message", "Error: " + e.getMessage());
            return errorMap;
        }
    }

    public Map<String, Object> getProvince() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Token", apiKey);
        headers.set("Content-Type", "application/json");

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    getBaseUrl() + "/master-data/province",
                    HttpMethod.POST,
                    request,
                    Map.class);
            return response.getBody();
        } catch (Exception e) {
            System.err.println("Error calling GHN getProvince: " + e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("code", 500);
            errorMap.put("message", e.getMessage());
            return errorMap;
        }
    }

    public Map<String, Object> getDistrict(Integer provinceId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Token", apiKey);
        headers.set("Content-Type", "application/json");
        Map<String, Object> data = new HashMap<>();
        data.put("province_id", provinceId);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(data, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    getBaseUrl() + "/master-data/district",
                    HttpMethod.POST,
                    request,
                    Map.class);
            return response.getBody();
        } catch (Exception e) {
            System.err.println("Error calling GHN getDistrict: " + e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("code", 500);
            errorMap.put("message", e.getMessage());
            return errorMap;
        }
    }

    public Map<String, Object> getWard(Integer districtId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Token", apiKey);
        headers.set("Content-Type", "application/json");
        Map<String, Object> data = new HashMap<>();
        data.put("district_id", districtId);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(data, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    getBaseUrl() + "/master-data/ward",
                    HttpMethod.POST,
                    request,
                    Map.class);
            return response.getBody();
        } catch (Exception e) {
            System.err.println("Error calling GHN getWard: " + e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("code", 500);
            errorMap.put("message", e.getMessage());
            return errorMap;
        }
    }
}
