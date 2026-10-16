# Giao diện Ready2Work hiện tại

Phiên bản trong `platform/` là chuẩn giao diện duy nhất từ ngày 17/10/2026. Không tiếp tục duy trì hoặc so khớp với bản render cũ trong project khác.

Thành phần đang dùng:

- `platform/app/`: các route và workspace B2C/B2B hiện tại.
- `platform/components/reference/`: các thành phần và stylesheet của giao diện đang chạy.
- `platform/public/reference/`, `platform/public/fonts/`, `platform/public/theme/logo.png`, `platform/public/theme/interview.png`: assets còn được sử dụng.
- Trang Report và print layout đang có tiếp tục được giữ.

Tên thư mục `reference` là tên kỹ thuật hiện hữu, không phải một phiên bản UI cũ. Không đổi tên hàng loạt khi không cần thiết.

Đã bỏ landing HTML/CSS/JS ở root, component landing cũ, auth stylesheet không dùng, assets cũ không được tham chiếu, ảnh audit/so sánh và lệnh `legacy:dev`. Danh sách chính xác nằm trong [manifest dọn dẹp](ui-cleanup.json).

Không xóa các module nghiệp vụ vẫn chạy, database, lịch sử, schema hoặc test bảo vệ dữ liệu. Yêu cầu chức năng và phần còn cần quyết định được quản lý tại [Master Plan 2.0](../career_platform_ai_agent_master_plan.md), không suy ra từ các nút demo trong thiết kế cũ.
