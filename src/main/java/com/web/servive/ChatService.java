package com.web.servive;

import com.google.gson.*;
import com.web.entity.Product;
import com.web.repository.ProductRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.servlet.http.HttpSession;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import java.util.regex.*;
import java.util.stream.Collectors;

@Service
public class ChatService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    @Autowired
    private ProductRepository productRepository;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    private static final String GROQ_MODEL = "llama-3.1-8b-instant";

    private static final Pattern IMAGE_URL_PATTERN = Pattern.compile("\\[URL_IMAGE:\\s*(https?://\\S+)\\]");

    private static final int MAX_HISTORY = 5;

    private static final int MAX_PRODUCTS = 40;

    public String chatWithGemini(String userMessage, HttpSession session) {
        // --- Quản lý lịch sử hội thoại ---
        @SuppressWarnings("unchecked")
        List<String[]> history = (List<String[]>) session.getAttribute("groq-history");
        if (history == null)
            history = new ArrayList<>();

        try {
            // --- 1. Chuẩn bị dữ liệu sản phẩm (tối ưu token) ---
            List<Product> products = productRepository.findAllApprovedForAI();
            String productData = products.stream()
                    .sorted(Comparator.comparingLong(p -> -(p.getSold() != null ? p.getSold() : 0L)))
                    .limit(MAX_PRODUCTS)
                    .map(p -> String.format(
                            "%d. %s | Giá: %,.0fđ | Thương hiệu: %s | Danh mục: %s | ⭐%.1f | Đã bán: %d",
                            p.getId(),
                            nvl(p.getName()),
                            p.getPrice() != null ? p.getPrice() : 0,
                            p.getTradeMark() != null ? nvl(p.getTradeMark().getName()) : "N/A",
                            p.getCategory() != null ? nvl(p.getCategory().getName()) : "N/A",
                            p.getAvgStar() != null ? p.getAvgStar() : 0.0,
                            p.getSold() != null ? p.getSold() : 0L))
                    .collect(Collectors.joining("\n"));

            // --- 2. Xử lý URL ảnh ---
            String imageUrl = null;
            String cleanMsg = userMessage;
            Matcher m = IMAGE_URL_PATTERN.matcher(userMessage);
            if (m.find()) {
                imageUrl = m.group(1);
                cleanMsg = userMessage.replaceAll("\\[URL_IMAGE:\\s*https?://\\S+\\]", "").trim();
                if (cleanMsg.isEmpty())
                    cleanMsg = "Mô tả điện thoại trong ảnh này cho tôi";
            }

            // --- 3. Xây dựng nội dung tin nhắn user (kèm ảnh nếu có) ---
            String userContent = cleanMsg;
            if (imageUrl != null) {
                userContent += "\n[Ảnh đính kèm: " + imageUrl + "]";
            }

            // --- 4. Tạo system prompt ---
            String systemPrompt = "Bạn là trợ lý AI tư vấn bán hàng của sàn thương mại điện tử Sellora. Hãy trả lời bằng tiếng Việt, ngắn gọn, thân thiện và chuyên nghiệp.\n\n"
                    + "CHÍNH SÁCH CỦA SÀN SELLORA:\n"
                    + "- **Vận chuyển**: Tích hợp vận chuyển toàn quốc qua Giao Hàng Nhanh (GHN). Phí vận chuyển được tính tự động dựa trên khoảng cách từ địa chỉ của từng cửa hàng đến địa chỉ nhận hàng.\n"
                    + "- **Thanh toán**: Hỗ trợ COD (Thanh toán khi nhận hàng) và thanh toán điện tử MoMo. Với đơn hàng chứa sản phẩm của nhiều shop, khách hàng có thể thanh toán MoMo gộp 1 lần duy nhất, hệ thống sẽ tự động tách thành các đơn hàng độc lập cho từng shop xử lý.\n"
                    + "- **Đổi trả & Hoàn tiền**: Hỗ trợ đổi trả/hoàn tiền trong vòng 7 ngày kể từ khi nhận hàng nếu sản phẩm lỗi từ nhà cung cấp hoặc sai mô tả. Khách hàng vui lòng quay video mở hộp để được hỗ trợ tốt nhất.\n"
                    + "- **Mã giảm giá (Voucher)**: Voucher của cửa hàng nào chỉ có giá trị áp dụng cho sản phẩm thuộc cửa hàng đó.\n"
                    + "- **Kiểm duyệt sản phẩm**: Tất cả sản phẩm do Người bán đăng tải đều phải qua quy trình kiểm duyệt của Quản trị viên trước khi hiển thị công khai.\n\n"
                    + "QUY TẮC:\n"
                    + "- Dùng **text** để in đậm từ quan trọng\n"
                    + "- Dùng danh sách với dấu - cho nhiều mục\n"
                    + "- Link sản phẩm bắt buộc dùng định dạng: http://localhost:8080/detail?id=[ID]\n"
                    + "- Hãy tư vấn dựa trên danh sách sản phẩm hiện có bên dưới. Nếu khách hàng hỏi về các chính sách của sàn, hãy giải thích rõ ràng dựa trên thông tin chính sách ở trên.\n"
                    + "- Trả lời ngắn gọn, tối đa 300 từ\n\n"
                    + "DANH SÁCH SẢN PHẨM HIỆN CÓ:\n"
                    + (productData.isEmpty() ? "(Chưa có sản phẩm)" : productData);

            // --- 5. Xây dựng messages array (OpenAI format) ---
            JsonArray messages = new JsonArray();

            // System message
            JsonObject sysMsg = new JsonObject();
            sysMsg.addProperty("role", "system");
            sysMsg.addProperty("content", systemPrompt);
            messages.add(sysMsg);

            // Lịch sử hội thoại (giới hạn MAX_HISTORY lượt gần nhất)
            int start = Math.max(0, history.size() - MAX_HISTORY);
            for (int i = start; i < history.size(); i++) {
                JsonObject msg = new JsonObject();
                msg.addProperty("role", history.get(i)[0]);
                msg.addProperty("content", history.get(i)[1]);
                messages.add(msg);
            }

            // Tin nhắn hiện tại của user
            JsonObject curMsg = new JsonObject();
            curMsg.addProperty("role", "user");
            curMsg.addProperty("content", userContent);
            messages.add(curMsg);

            // --- 6. Tạo request body ---
            JsonObject body = new JsonObject();
            body.addProperty("model", GROQ_MODEL);
            body.add("messages", messages);
            body.addProperty("max_tokens", 600);
            body.addProperty("temperature", 0.7);

            // --- 7. Gửi request tới Groq ---
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GROQ_URL))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + groqApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                    .build();

            HttpClient client = HttpClient.newHttpClient();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            // --- 8. Xử lý phản hồi ---
            JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();

            if (json.has("choices")) {
                String reply = json.getAsJsonArray("choices")
                        .get(0).getAsJsonObject()
                        .getAsJsonObject("message")
                        .get("content").getAsString();

                // Lưu lịch sử: user + assistant
                history.add(new String[] { "user", userContent });
                history.add(new String[] { "assistant", reply });
                // Giới hạn lịch sử tổng
                while (history.size() > MAX_HISTORY * 2)
                    history.remove(0);
                session.setAttribute("groq-history", history);

                return reply;

            } else if (json.has("error")) {
                JsonObject err = json.getAsJsonObject("error");
                String errMsg = err.has("message") ? err.get("message").getAsString() : "Lỗi không xác định";
                return "❌ Lỗi Groq: " + errMsg;
            } else {
                return "⚠️ Không nhận được phản hồi hợp lệ.";
            }

        } catch (Exception e) {
            e.printStackTrace();
            return "❌ Lỗi hệ thống: " + e.getMessage();
        }
    }

    private String nvl(String s) {
        return s != null ? s : "";
    }
}