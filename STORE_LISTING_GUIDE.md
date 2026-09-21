# Hướng Dẫn & Thông Tin Đăng Tải Chrome Web Store - WebShield v3.7.8

Tài liệu này chuẩn bị sẵn toàn bộ nội dung để bạn sao chép trực tiếp lên **Chrome Web Store Developer Dashboard**, giải quyết triệt để 2 lỗi từ chối:
1. **Red Potassium**: Mô tả và siêu dữ liệu không khớp với chức năng code thực tế.
2. **Purple Nickel**: Link Chính sách quyền riêng tư (Privacy Policy) không hợp lệ hoặc không trỏ trực tiếp đến tài liệu chính sách.

---

## 1. Thông Tin Store Listing (Sẵn Sàng Copy Lên Dashboard)

### Tên Tiện Ích (Name):
```text
WebShield - Content & Popup Filter
```

### Tóm Tắt (Summary / Short Description - Dưới 132 ký tự):
```text
Công cụ hỗ trợ chặn cửa sổ bật lên tự động và quản lý quy tắc lọc mạng cục bộ.
```

### Mô Tả Chi Tiết (Detailed Description):
*(Lưu ý: Không dùng các từ ngữ phóng đại như "bảo mật tuyệt đối", "chặn 100% tất cả quảng cáo", "tốt nhất thị trường" để tránh vi phạm chính sách Red Potassium).*

```text
WebShield là tiện ích mở rộng gọn nhẹ hỗ trợ người dùng kiểm soát và lọc các nội dung bật lên gây phiền toái, giúp trải nghiệm duyệt web liền mạch và tập trung hơn.

Các tính năng chính:

1. Ngăn chặn cửa sổ bật lên (Pop-ups & Pop-unders):
- Tự động nhận diện và chặn các hành vi tự mở tab mới, cửa sổ phụ ngầm ngoài ý muốn khi người dùng tương tác trên trang web.

2. Quản lý và thực thi quy tắc lọc mạng cục bộ (declarativeNetRequest):
- Áp dụng các quy tắc lọc mạng định sẵn trực tiếp trong trình duyệt thông qua API declarativeNetRequest của Manifest V3, giúp xử lý nhanh và tiết kiệm tài nguyên hệ thống.

3. Giao diện trực quan, dễ sử dụng:
- Cung cấp bảng điều khiển (popup) cho phép bật/tắt nhanh bộ lọc bất cứ lúc nào.
- Hỗ trợ danh sách trắng (whitelist) cho phép người dùng tùy ý loại trừ các trang web tin cậy.

Chính sách bảo mật:
WebShield hoạt động hoàn toàn trên thiết bị của bạn, không thu thập, không theo dõi và không truyền tải bất kỳ dữ liệu cá nhân hay lịch sử duyệt web nào ra máy chủ bên ngoài.
```

---

## 2. Link Chính Sách Quyền Riêng Tư (Khắc Phục Lỗi Purple Nickel)

Google yêu cầu link Privacy Policy phải:
- Là một đường link truy cập công khai trực tiếp (không yêu cầu đăng nhập).
- Nội dung trang hiển thị rõ ràng tài liệu chính sách quyền riêng tư của WebShield.

**Link chính sách trực tiếp khuyến nghị sử dụng:**
```text
https://github.com/HuyTran1002/adblocker/blob/main/PRIVACY_POLICY.md
```
*(File `PRIVACY_POLICY.md` đã được tạo hoàn chỉnh trong repository của bạn. Khi push code lên GitHub, link trên sẽ hoạt động công khai 24/7 và đạt chuẩn 100% của Google).*

---

## 3. Khai Báo Mục Quyền Riêng Tư Trên Dashboard (Privacy Practices Tab)

Khi vào tab **Privacy practices** trên Chrome Web Store Developer Dashboard, chọn như sau:

1. **Single Purpose:**
   ```text
   The single purpose of WebShield is to block automatic unwanted pop-ups/pop-unders and filter network requests using local declarativeNetRequest rules.
   ```
2. **Permission Justification:**
   - **`declarativeNetRequest`**:
     *Justification:* "Required to match and block unwanted pop-up and tracker network requests locally without inspecting user traffic."
   - **`storage`**:
     *Justification:* "Used exclusively to store user preferences (toggle on/off state and custom whitelisted domains) locally on the device."
   - **`Host Permissions (*://*/*)` / Content Scripts**:
     *Justification:* "Required to detect and prevent clickjacking overlays and script-injected pop-under windows on web pages."
   - **`contextMenus`**:
     *Justification:* "Allows users to right-click on an unwanted element to manually hide it on the current page."
   - **`activeTab`**:
     *Justification:* "Provides access to the active tab only when the user invokes the context menu action to select an element."
   - **`alarms`**:
     *Justification:* "Used to schedule periodic local housekeeping of temporary cached states."

3. **Data Usage Checkbox:**
   - Chọn **"I do not collect or use user data"** (Không thu thập hay sử dụng dữ liệu người dùng).
   - Tích xác nhận tuân thủ Developer Program Policy.

---

## 4. Hướng Dẫn Chụp Screenshots Đạt Chuẩn (Tránh Cờ Red Potassium)

Google đánh giá rất nghiêm ngặt mục Screenshots:
- **Kích thước chuẩn bắt buộc:** **1280 x 800 px** hoặc **640 x 400 px**.
- **Không dùng ảnh đồ họa mockup dựng sẵn** (không ghép vào khung laptop 3D, không vẽ hình minh họa trừu tượng). Ảnh chụp **phải là giao diện thực tế của trình duyệt**.

### Các bước chụp 3 ảnh thực tế đạt chuẩn 1280x800 px:

1. **Ảnh 1 - Giao diện chính của WebShield:**
   - Mở trình duyệt Chrome ở kích thước cửa sổ bình thường.
   - Mở một trang web thông thường (ví dụ: `google.com` hoặc `wikipedia.org`).
   - Bấm vào icon WebShield trên thanh toolbar để mở giao diện popup.
   - Chụp toàn màn hình hoặc chụp cửa sổ trình duyệt rồi căn chỉnh/crop đúng kích thước **1280x800 px**.

2. **Ảnh 2 - Bảng điều khiển Cài đặt / Whitelist:**
   - Trong popup WebShield, bấm vào icon bánh răng cài đặt.
   - Chọn tab **Trang bỏ qua (Whitelist)** hoặc **Bộ lọc**.
   - Chụp lại màn hình để cho thấy tính năng quản lý danh sách trang web loại trừ thực tế.

3. **Ảnh 3 - Menu chuột phải (Context Menu) trên trang web:**
   - Nhấp chuột phải trên bất kỳ trang web nào để hiển thị menu ngữ cảnh với mục `"🎯 Chặn phần tử này... (WebShield)"`.
   - Chụp lại ảnh để minh chứng cho quyền `contextMenus` và `activeTab`.
