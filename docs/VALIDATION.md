# Ghi nhận kiểm tra

## Bằng chứng trước lần dọn giao diện cũ

[Snapshot UI/auth trước dọn dẹp](validation/ui-baseline.json): 103 unit tests, 29 kịch bản browser trên local Supabase/Mailpit đã qua; sau đó kiểm tra tập trung editor/draft doanh nghiệp cũng qua. Đây là kết quả của lượt phát triển trước, không phải các suite vừa được chạy lại ở lần sửa master plan này.

Fixture kết quả dùng để xác nhận hiển thị và thao tác; không chứng minh provider AI đã chấm bài thật. Chưa có xác nhận hosted migration, live AI acceptance hoặc Vercel deployment trong các bản ghi này.

## Lượt cập nhật master plan và dọn UI ngày 17/10/2026

Phạm vi: đối chiếu PDF, viết lại kế hoạch, bỏ mã/assets và tài liệu đối chiếu của giao diện cũ không còn dùng. Giữ nguyên giao diện đang chạy và lõi backend.

Đã qua: scan import/asset references, 15 link tài liệu, 19 đường dẫn asset tĩnh, đối chiếu bản sao PDF bằng SHA-256 và production build một lần (bao gồm TypeScript). Không chạy lại unit/auth/browser/AI suites vì không có thay đổi nghiệp vụ.

Các lượt làm tiếp áp dụng [Master Plan §9](../career_platform_ai_agent_master_plan.md#9-kiểm-tra-vừa-đủ-có-điểm-dừng): chỉ kiểm tra vùng thay đổi và dừng sau khi đạt điều kiện liên quan.

## Cấu hình Vercel và Supabase Cloud ngày 17/10/2026

Vercel đã build thành công commit `adf3474`; các trang công khai và health endpoint trả HTTP 200. Supabase Cloud đã áp dụng đủ 8 migration; kiểm tra chỉ đọc xác nhận các bảng mới và hai bucket riêng tư. Xem [trạng thái triển khai và phần còn thiếu](DEPLOYMENT.md). Site URL và hai redirect Production đã lưu thành công trên Supabase. SMTP đang tắt; mẫu email mặc định chưa khớp token-hash callback của ứng dụng. Dashboard yêu cầu SMTP riêng hoặc Pro để chỉnh mẫu. Chưa xác nhận đăng ký/email/đăng nhập hoặc phân tích CV bằng AI trên production.

## Hoàn thiện Report và dashboard

16 kiểm tra tập trung cho Report/gợi ý đã qua. Đã kiểm tra PDF từ dữ liệu fixture đủ/thiếu đầu vào và nhận xét dài: font tiếng Việt, số trang, phân trang, tên nhiệm vụ, gauge, radar và trạng thái chưa có dữ liệu. Route kiểm tra phiên/tài khoản và chỉ tải dữ liệu chủ phiên; lỗi không lộ thông tin nội bộ. Một kịch bản browser trên production build local đã xác nhận đăng nhập → gợi ý vị trí CV → tải PDF thật, và HTTP 401 khi tải không đăng nhập. Tài khoản fixture chỉ được tạo/xóa ở local Supabase; không ghi cloud hay gọi AI.

Build Next.js 16.4.2 và lint phần thay đổi đã qua. Font TTF xuất hiện trong output tracing của route PDF. Các binding Linux GNU cần cho Vercel được giữ trong lockfile. Không chạy lại toàn bộ unit/browser/auth suites và không coi fixture là nghiệm thu live AI. Kết quả deploy cuối được ghi trong DEPLOYMENT.md.

## Dọn điều hướng cũ và sửa gợi ý dashboard

Đã bỏ các lối vào bốn mục cũ ở giao diện đang dùng; gợi ý và hoạt động mô phỏng trên dashboard dùng nhãn vị trí thay vì toàn bộ `brief`. Một kịch bản browser local đã xác nhận menu/tìm kiếm không còn các lối vào đó, nhãn gợi ý ngắn, tìm kiếm phỏng vấn vẫn hoạt động và bố cục desktop/mobile không tràn. Đã xem ảnh hai viewport, build, typecheck và lint phần thay đổi. Không chạy lại toàn bộ suite, gọi AI hay sửa dữ liệu cloud.
