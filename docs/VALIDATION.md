# Ghi nhận kiểm tra

## Chat R2W AI và nơi sinh sống — 18/10/2026

API chat có 33 kiểm tra tập trung qua xác thực, nguồn yêu cầu, định dạng/giới hạn hội thoại và lỗi provider; 5 kiểm tra adapter Gemini qua. TypeScript và lint phần thay đổi qua. Một flow Chromium local xác nhận tỉnh/thành phố bắt buộc, bản nháp qua reload, lưu đúng `profiles.city` và metadata; chat nhiều lượt tại dashboard, Enter/Shift+Enter, lỗi giữ câu hỏi, thử lại không nhân đôi và giới hạn lịch sử. Đã xem giao diện desktop/390px, không tràn ngang. API chat được mock trong flow browser; cập nhật hồ sơ dùng quyền user local thật.

Một câu hỏi hướng dẫn phỏng vấn giả đã gọi qua `/api/assistant` local tới Gemini thật: HTTP 200, phản hồi 241 ký tự, khoảng 6,1 giây gồm lần compile đầu. Tài khoản thử local đã xóa; không gửi CV, hồ sơ hoặc bài làm người dùng. Không cần migration hay thay đổi key. Không chạy lại toàn bộ suite.

## Chỉ dùng nội dung Google Docs — 18/10/2026

Nguồn live được tải lại sau gián đoạn và đối chiếu đủ 520 khối; không có thay đổi so với snapshot đã sửa. Đủ năm ngành × ba đề/ba vị trí, 120 câu phỏng vấn nguyên văn 3/3/2. IT03 dùng đúng bảng lồng năm cột trong Docs; benchmark riêng tư. Marketing tự tạo đã bị gỡ khỏi tệp nguồn và reference data mới, ba tài liệu chưa có vẫn được ghi là thiếu.

Hai agent code/kiểm định chạy các kiểm tra tập trung riêng (không cộng hai số lượng trùng nhau thành tổng nghiệm thu). 11 content-import contracts, kiểm định 11 migration trong PostgreSQL cô lập, typecheck và lint phần đổi đã qua. Kiểm tra dữ liệu xác nhận không đổi câu hỏi/đáp án lịch sử, điểm đã lưu, quyền tài khoản và đường xuất bản doanh nghiệp thật. Một Chromium flow trên production build local qua: 15 đề, mỗi ngành ba thẻ, 15 bộ phỏng vấn nguồn, loại demo doanh nghiệp, bảng IT03, Marketing thiếu tài liệu, nháp/refresh/đăng nhập lại, bảng FA và nhập TXT. Fixture local đã xóa.

Production build qua; NFT `/simulations/[slug]` có đủ 20 PNG nguồn, không có ảnh đáp án 14/20. Lần build sandbox đứng ở compile đã dừng; build với quyền process cần thiết qua, không dùng kết quả đứng đó làm bằng chứng thành công. Không chạy lại toàn bộ suite hoặc provider cho các chỉnh sửa tài liệu.

API Gemini thật: một bài Business Analyst với ảnh Excel nguồn, barem nguyên bản và câu trả lời giả đã qua đúng ID, label, maxScore, điểm thành phần và phản hồi không rỗng. Quyền gửi ảnh được người dùng xác nhận sau khi auto-review chặn phạm vi ảnh chưa được nêu ở quyền văn bản cũ. Không gửi CV/feedback/tài khoản hay ghi database ở phép thử này. Không coi một ca API qua là nghiệm thu toàn bộ chất lượng chấm. Kết quả chi tiết và các vấn đề nguồn còn chờ: [feedback audit](feedback-audit.md).

Migration source-only thứ mười một đã áp dụng cloud sau dry-run. Đối chiếu chỉ đọc bằng nguồn sinh chuẩn xác nhận đầy đủ dữ liệu của 15 mô phỏng, 120 câu hỏi/đáp án/barem và 15 bộ phỏng vấn; 17 demo cũ đã lưu trữ. Không đọc hồ sơ hoặc bài làm người dùng khi xác nhận cloud. Chín mô phỏng và bảy bộ phỏng vấn đủ điều kiện chấm, các phần còn thiếu vẫn cho xem nội dung.

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

## Thêm tab Báo cáo năng lực cạnh Luyện phỏng vấn

Đã kiểm tra một kịch bản browser local trên bản build: tab Report là mục kế tiếp Luyện phỏng vấn, tìm kiếm có Report, bấm tab mở `/report` và có trạng thái active. Desktop 1440px, tablet 1024px và mobile 390px không tràn chiều ngang. Đã xem ảnh desktop/mobile, typecheck/lint và build; không chạy lại scoring/auth/PDF suites vì không đổi logic tương ứng.

## Feedback/source synchronization — 17/10/2026

Hai agent được dùng theo chỉ định: code và kiểm thử/kiểm định. Agent chính tiếp nhận phần tích hợp khi agent hết hạn mức. Đối chiếu câu hỏi/Golden Profiles với từng ô snapshot nguồn, 20 checksum ảnh, 10 content-import contracts, schema/RLS và bảo toàn lịch sử trong PostgreSQL cô lập. Không dùng toàn bộ suite làm vòng lặp sau mỗi thay đổi.

Đã sửa: OCR cho PDF không có text layer; callback PKCE của email mặc định; lỗi đánh giá/lưu phỏng vấn; bản nháp; tách ngôn ngữ đọc thuật ngữ; định dạng đề; tài liệu ảnh/bảng thay JSON; nhập bảng và đọc tài liệu bài làm. Bộ câu hỏi nguồn có đủ 15 vị trí/120 câu. Hai ảnh đáp án không public, CV cá nhân không vào repository/log. Source v2 chấm điểm thành phần với bằng chứng nguyên văn, không dùng quy tắc phạt/band cũ ngoài nguồn.

Một kịch bản production build local đã kiểm tra đăng nhập lại giữ dữ liệu, đúng ba thẻ IT/ngân hàng, QA câu 2 và bản nháp qua tab/refresh, tài liệu không JSON, nhập/sửa/khôi phục bảng gốc/custom và tải TXT. Fixture đã xóa. Xem ảnh phát hiện vùng bảng dài cần cuộn riêng, đã sửa và kiểm tra lại trước phát hành. Bổ sung Marketing theo phép mới của người dùng có kiểm tra tổng số liệu và bảng 12 từ khóa; không giả nhận là số liệu gốc/thực tế.

API thật: OCR riêng nhận dạng được 2.740 ký tự từ CV đã được cho phép; các lần khác có provider 503/429. QA vòng 1 câu 2 với câu trả lời ngắn trả đủ ba tiêu chí hợp lệ; Financial tiếp theo 429, dừng và không ghi DB. Không tuyên bố phân tích CV thật, chấm Financial hay chất lượng âm thanh đã nghiệm thu đầy đủ.

Còn chờ: bảng trọng số CV; các điểm source không khớp của ba mô phỏng ngân hàng/bảy bộ phỏng vấn; câu hỏi Trợ lý thuế có dấu hiệu dán nhầm tiêu chí. Những phần này cho xem/soạn thử và giữ trạng thái chưa mở chấm, không tự bịa barem. Chi tiết đối chiếu: [feedback audit](feedback-audit.md).

Rà soát cuối phát hiện phần giải thích ba nguyên nhân trong barem Digital Marketing bị ghép sang mục tính CPL; đã gắn lại đúng mục 15 điểm và giữ mục tính CPL 10 điểm riêng, không thay điểm nguồn. Kiểm tra hồi quy tương ứng, typecheck và 10 content-import contracts đã qua. Migration thứ chín đã áp dụng trên cloud; phép đọc chỉ kiểm tra danh mục xác nhận 15 mô phỏng/12 mở chấm, 15 bộ phỏng vấn/7 mở chấm, 120 câu và dữ liệu Marketing bổ sung đúng phiên bản. Không đọc bài làm hoặc hồ sơ thật khi xác nhận cloud.

Commit ứng dụng `161edad` đã push GitHub và deployment `dpl_H3p9wb8tRrMiDA5DgNaxGtdmv7Xw` Ready trên tên miền hiện tại; function ở Singapore. Kiểm tra trang công khai sau deploy nhận 200 cho trang chủ, đăng ký, đăng nhập, health và ảnh đầu vào; checksum ảnh khớp repository. URL ảnh đáp án nội bộ trả 404. Không tạo tài khoản cloud hoặc gửi lại CV cá nhân trong lượt xác nhận phát hành này.

Phát hiện và sửa dữ liệu Marketing bị sao chép trong manifest tài liệu: generator nay đọc trực tiếp tệp bổ sung chuẩn, kiểm tra mỗi tài liệu xuất hiện đúng một lần và khớp nội dung tiếng Việt. Migration thứ mười chỉ sửa `reference_data.public_materials` của ba bài Marketing; migration đã phát hành, điểm, câu hỏi và lịch sử giữ nguyên. Bảy kiểm tra Marketing/materials, content contracts, typecheck/lint và toàn bộ chuỗi migration trong PostgreSQL cô lập đã qua. Không chạy lại browser hoặc gọi AI cho thay đổi đường đồng bộ này.
