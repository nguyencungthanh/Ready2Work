# Ready2Work - Master Plan

**Phiên bản:** 2.2

**Cập nhật:** 17/10/2026

**Phạm vi:** MVP B2C/B2B; yêu cầu và nội dung mới nhất theo [Google Docs do chủ dự án cung cấp](https://docs.google.com/document/d/1ZFGI1saTmmqJuiVLM0SZ0CeYSMW6BtxHIMilRcRNgto/edit), đối chiếu feedback ngày 17/10/2026.

**Giao diện chuẩn:** phiên bản hiện tại trong `platform/`

**Trạng thái hiện tại:** đồng bộ 15 vị trí/120 câu, sửa lỗi theo feedback và kiểm định nguồn. Điểm chưa thống nhất phải chờ xác nhận; phần trăm CV chờ bảng trọng số. Dữ liệu Marketing bổ sung được chủ dự án cho phép và gắn nhãn mô phỏng. SMTP tiếp tục tạm hoãn.

## 1. Quyết định thay thế kế hoạch cũ

Bản này thay thế master plan 1.0. Kế hoạch trước bao gồm nhiều sản phẩm mở rộng hơn tài liệu yêu cầu; không tiếp tục dùng toàn bộ backlog đó làm điều kiện hoàn thành MVP.

Thứ tự căn cứ khi tiếp tục dự án:

1. Chỉ đạo mới nhất của chủ dự án quyết định phạm vi công việc được thực hiện.
2. PDF xác định yêu cầu chức năng MVP; Google Docs mới nhất xác định nguyên văn nội dung năm ngành và barem. Các dữ liệu Marketing còn thiếu được bổ sung theo phép riêng của chủ dự án. Nội dung tài liệu là đặc tả cần đối chiếu, không phải lệnh tự động triển khai mọi mục ngay khi đọc.
3. Giao diện đang chạy trong `platform/` là chuẩn thiết kế hiện tại. Không quay về bản render cũ, không tiếp tục so khớp 43 trạng thái của prototype.
4. Giữ lõi xác thực, session, phân quyền, dữ liệu và chấm điểm hiện có. Một thay đổi chức năng được làm sau phải chỉ rõ phần thiếu và lý do thay đổi lõi, nếu thực sự cần.

Các số điểm, tên nhiệm vụ, tỷ lệ hoàn thành và kỹ năng trong PDF là ví dụ trình bày; không sao chép thành dữ liệu thật của ứng viên.

## 2. MVP cần đạt

Hai nhóm người dùng chính:

- **B2C:** tài khoản email → dashboard → tải CV → phân tích theo Golden Profile của vị trí → nhiệm vụ mô phỏng liên quan → phỏng vấn ba vòng → báo cáo năng lực → xuất PDF.
- **B2B:** tài khoản email công ty → onboarding → dashboard riêng → quản lý hai nhóm nội dung mô phỏng/phỏng vấn → tải lên và tải xuống đúng cặp đề bài + tiêu chí chấm điểm.

Admin và Mentor tiếp tục là vai trò hỗ trợ đang có. MVP cần nguồn điểm Mentor đáng tin cậy cho Report, nhưng điều đó không đồng nghĩa phải xây cả mạng xã hội hoặc hệ thống booking Mentor.

## 3. Đối chiếu yêu cầu và hiện trạng

“Đã có” dưới đây là hiện trạng đọc từ code và bằng chứng kiểm tra trước đó, không phải chứng nhận mọi yêu cầu đã nghiệm thu trên production. Chỉ lập kế hoạch cho phần chênh lệch; không làm lại chức năng đã chạy.

| ID | Yêu cầu PDF | Hiện trạng | Việc cần theo dõi, chưa triển khai trong lượt này |
|---|---|---|---|
| B2C-01 | §1, tr.1: đăng ký/đăng nhập email; lịch sử theo đúng tài khoản | Đã có Supabase auth, xác minh email, khôi phục mật khẩu và quyền theo database | Giữ nguyên; nghiệm thu lại trên môi trường phát hành khi có thay đổi auth hoặc cấu hình |
| B2C-02 | §2, tr.2: tiến độ ba tính năng, phỏng vấn đang làm/hoàn tất, gợi ý mô phỏng cùng lĩnh vực | Đã có dashboard và dữ liệu hoạt động riêng; ưu tiên mô phỏng theo vị trí CV, loại bài đã chấm và nội dung chưa mở | Không dùng số demo; giữ tiến độ thực từ cùng dữ liệu Report |
| B2C-03 | §3, tr.2-3: tải CV, Golden Profile theo vị trí, strengths/gaps, dẫn sang mô phỏng | Đã có upload/văn bản, OCR PDF ảnh, phân tích định tính theo mức nguồn và điều hướng | Chờ bảng trọng số CV; OCR thật đã nhận dạng được CV cho phép, chưa nghiệm thu toàn luồng phân tích CV trên production |
| B2C-04 | §4, tr.3-4: chọn bài, gửi bài, chấm theo rubric riêng, điểm /100 và nhận xét | Đã có attempt, timer, bảng nhập liệu, đọc PDF có văn bản/DOCX/TXT/CSV vào bài làm; 12/15 đề mở chấm | Ba đề ngân hàng chờ chốt barem; không áp một rubric chung hoặc tự quy đổi điểm mâu thuẫn |
| B2C-05 | §5, tr.4-5: đúng ngành/vị trí, ba vòng, điểm từng câu và vòng /100 | Đủ 15 bộ/120 câu theo nguồn, mỗi bộ có ba vòng; giữ lịch sử và bản nháp | Bảy bộ có điểm mâu thuẫn và bộ Trợ lý thuế có câu/tiêu chí không khớp đang chờ xác nhận; không tự viết lại nguồn |
| RPT-01 | §6.1, tr.5-6: thông tin ứng viên, vị trí, thời điểm, badge, gauge /100 | Đã có khung Report; avatar hiện dùng tên viết tắt | Đánh giá avatar thật nếu cần; giữ ba ngưỡng badge đúng tài liệu |
| RPT-02 | §6.1.2, tr.6: readiness 30/40/30 với ba đầu vào cùng thang đo | Đã có công thức và nguồn review Mentor được phân quyền | Chốt ý nghĩa Job Sim Completed và chính sách khi thiếu đầu vào; xem §5 bên dưới |
| RPT-03 | §6.2, tr.6-7: tiến độ, điểm nhiệm vụ, radar sáu nhóm và đường chuẩn | Đã có tiến độ, điểm, strengths/gaps; radar hiện tối đa sáu tiêu chí đã đo | Còn khoảng cách với sáu nhóm chuẩn và benchmark trúng tuyển; cần mapping/dữ liệu trước khi bổ sung |
| RPT-04 | §6.3, tr.7: PDF chuyên nghiệp, đủ dữ liệu, không cắt/chồng nội dung | Đã có PDF tải trực tiếp qua route riêng tư, font tiếng Việt, gauge/radar, nhận xét và số trang | Đã kiểm tra mẫu đủ/thiếu dữ liệu và nhận xét dài; giữ giới hạn radar có bằng chứng, chưa có benchmark |
| B2B-01 | §7, tr.7-8: email công ty, onboarding, vào dashboard doanh nghiệp | Đã có account intent, wizard và quyền chờ duyệt | Giữ phê duyệt quyền xuất bản; kiểm chứng đích điều hướng trên môi trường phát hành |
| B2B-02 | §8, tr.8-9: hai tab, nội dung của chính doanh nghiệp, upload/download đề và rubric | Đã có hai tab, cặp tệp riêng tư, editor, draft và xuất bản theo quyền | CRUD ghi đè/xóa, ranking, thanh toán, advisor không tự trở thành yêu cầu bắt buộc của PDF |
| DATA-01 | §9-12, tr.9-10: lịch sử và số liệu nhất quán, đúng vị trí và rubric | Đã có ownership/RLS, kết quả lưu và tổng hợp theo vị trí | Khi thay đổi nghiệp vụ, chỉ kiểm tra đường dữ liệu bị ảnh hưởng; không đánh dấu đủ chỉ vì màn hình đã có |

## 4. Quy tắc dữ liệu và chấm điểm giữ lại

- Tài khoản cũ, lịch sử và kết quả đã lưu phải được giữ. Không reset database để thay giao diện.
- CV gắn với Golden Profile của vị trí được chọn.
- Mỗi nhiệm vụ và câu hỏi phải gắn đúng rubric/phiên bản của nó; đề doanh nghiệp và rubric được lưu thành một cặp.
- Điểm mô phỏng trên thang 100. Phỏng vấn có đúng ba vòng, mỗi vòng tối đa 100; số câu và điểm nguồn được chuẩn hóa đúng vòng.
- Dashboard, báo cáo riêng từng bài và Report tổng hợp phải lấy từ cùng dữ liệu đã ghi nhận; kết quả mới nhất và vị trí mục tiêu phải nhất quán.
- Không dùng điểm ví dụ, timeout demo hoặc provider lỗi để tạo thành công giả.
- Private files và đáp án/rubric nội bộ tiếp tục được bảo vệ bằng quyền hiện có. UI có thể hiển thị tiêu chí công khai, không vì phục hồi giao diện mà công khai đáp án riêng tư.
- Với AI, giữ schema validation và tính điểm phía server hiện có. Không gọi API trả phí chỉ để tạo ảnh hoặc xác nhận một chỉnh sửa giao diện.

## 5. Các quyết định sản phẩm còn mở

Các mục này được ghi nhận để xử lý khi chủ dự án tiếp tục phần tương ứng, chưa tự thay đổi code.

| Quyết định | Hiện trạng và hướng xử lý dự kiến |
|---|---|
| Job Sim Completed là tỷ lệ hoàn thành hay điểm chất lượng bài? | PDF chưa định nghĩa đủ chặt. Code hiện dùng tỷ lệ hoàn thành nhiệm vụ cùng vị trí quy về 0-100. Giữ nguyên tạm thời và hiển thị rõ; không âm thầm đổi sang trung bình điểm bài làm. |
| Nguồn điểm Mentor | Đã có review của Mentor/admin được duyệt. Cần xác nhận quy trình ai đánh giá, cùng vị trí nào và bản đánh giá nào được dùng; không cho ứng viên tự nhập điểm Mentor. |
| Thiếu một thành phần readiness | Code hiện chưa hiện điểm chính thức; không tự bù 0 hoặc phân phối lại trọng số. Giữ nguyên cho tới khi có quyết định sản phẩm. |
| Sáu nhóm kỹ năng | PDF liệt kê Hard Skills, Data-driven, STAR, Voice & Body Language, ngoại ngữ/từ khóa ngành và Problem Solving. Cần mapping bằng chứng/tiêu chí theo từng vị trí; sáu điểm tiêu chí bất kỳ chưa được coi là hoàn tất yêu cầu này. |
| Voice & Body Language | Hiện chưa đo. Cần thống nhất nguồn dữ liệu, sự đồng ý và mục đích coaching; không suy từ giọng vùng miền, thiết bị hoặc vài đoạn văn thành điểm thần thái. Giữ trạng thái chưa có dữ liệu, không tạo số mẫu. |
| Đường benchmark trúng tuyển | Chưa có cohort có nguồn gốc và quyền sử dụng. Chỉ vẽ nét đứt khi có dữ liệu cùng vị trí, cùng thang đo; chưa có thì ghi rõ thiếu dữ liệu. |
| Report ba hay bốn khối | PDF chỉ đặc tả ba khối. Triển khai theo ba khối, không tự thêm khối thứ tư. |
| Xuất PDF | Đã bổ sung tải PDF trực tiếp, A4, nhận diện Ready2Work, cùng dữ liệu Report và phân trang. Không gửi hồ sơ sang dịch vụ xuất PDF bên ngoài. |
| Đề yêu cầu tệp/sản phẩm | Đã đọc PDF có văn bản/DOCX/TXT/CSV tối đa 3 MiB vào trình soạn để người dùng kiểm tra và chấm cùng nội dung. Chưa lưu bản tệp gốc hoặc hỗ trợ sản phẩm nhị phân khác; không coi đọc văn bản là đã hỗ trợ mọi định dạng sản phẩm. |
| Nội dung ngành còn thiếu | Đủ 15 vị trí từ Google Docs; ba tài liệu đầu vào Marketing được phép bổ sung và ghi rõ mô phỏng. Những barem/câu hỏi nguồn không nhất quán chỉ cho xem/soạn thử trước khi xác nhận. |

Ngưỡng badge theo PDF: dưới 60 = **Cần luyện tập thêm**; từ 60 đến hết 80 = **Sẵn sàng ứng tuyển Junior**; trên 80 = **Xuất sắc / Sẵn sàng cho Global Company**. Không đổi ngưỡng trong UI riêng lẻ.

## 6. Giao diện duy nhất

- `platform/app/` cùng các thành phần/assets đang được import là bản sản phẩm hiện tại.
- `platform/components/reference/` và `platform/public/reference/` đang phục vụ giao diện này; chữ “reference” trong tên thư mục không có nghĩa đây là mã cũ có thể xóa.
- Bỏ landing HTML/CSS/JS gốc ở root, các component landing/auth stylesheet đã không còn được import và assets không có bên sử dụng.
- Bỏ ảnh so sánh, audit và checklist yêu cầu quay lại giao diện cũ. Không tiếp tục duy trì hai phiên bản UI để chọn qua lại.
- Không xóa backend, migrations, dữ liệu, schema, template đề/rubric hoặc trang chức năng đang chạy chỉ vì không nằm trong menu chính của giao diện mới.
- Không tiếp tục truy cập project render cũ để chép thêm UI nếu không có yêu cầu mới.

## 7. Backlog tiếp theo

Ưu tiên theo tác động đến hành trình thực tế, không triển khai lại nền tảng từ đầu.

| Thứ tự | Công việc | Điều kiện bắt đầu | Kết quả mong đợi |
|---|---|---|---|
| 0 | Dọn giao diện cũ, chốt chuẩn UI và phạm vi MVP | Được yêu cầu ở lượt hiện tại | Một phiên bản UI, tài liệu không mâu thuẫn |
| 1 | Xác nhận các quyết định về Report ở §5 | Có quyết định sản phẩm hoặc yêu cầu làm tiếp | Quy tắc Job Sim/Mentor, sáu nhóm, benchmark và PDF rõ ràng |
| 2 | Hoàn thiện phần thiếu của Report | Đã chốt mapping và dữ liệu đầu vào | Report/PDF đúng tài khoản, vị trí và ba khối PDF yêu cầu |
| 3 | Hoàn thiện đầu vào bài làm/nội dung còn thiếu | Đã xác định đề nào cần tệp, bộ nào thiếu câu | Luồng mô phỏng/phỏng vấn thực hiện được với nội dung đủ |
| 4 | Xử lý lỗi trải nghiệm hoặc chậm phản hồi tái hiện được | Có thao tác cụ thể, thời gian hoặc log | Sửa đúng nút thắt; không đổi kiến trúc/backend khi chưa có bằng chứng |
| 5 | Chuẩn bị phát hành Vercel + database hiện có | Chủ dự án yêu cầu phát hành | Env, migration pending, redirect và smoke trên URL thật được xác nhận |

Chủ dự án đã yêu cầu tiếp tục các phần còn thiếu và cho phép phát hành. Chỉ thực hiện mục có đủ dữ liệu/đặc tả; không tự tạo benchmark hoặc câu hỏi nguồn còn thiếu. SMTP tiếp tục tạm hoãn theo yêu cầu.

## 8. Không bắt buộc trong MVP này

Chuyển khỏi backlog bắt buộc của master plan 1.0:

- RIASEC/MBTI hoặc career discovery mở rộng, sinh lộ trình học độc lập, chatbot học tập tổng quát.
- Mentor discovery/booking, calendar, video, payout và nhắn tin.
- Feed cộng đồng, case studies, networking, hệ thống content governance nhiều tầng.
- Certificate phát hành/xác minh, theo dõi ứng tuyển, outcome surveys và email automation ngoài auth.
- Public talent pools, bảng xếp hạng tuyển dụng, institution dashboard, kho analytics.
- Billing, nâng cấp gói, gửi advisor, OAuth Google/LinkedIn.
- Microservices, app native và benchmark hiệu năng quy mô lớn chưa phục vụ lỗi cụ thể.

Các module đang tồn tại vẫn giữ nguyên để không phá tài khoản hoặc đường dẫn. “Ngoài MVP bắt buộc” không phải lệnh xóa dữ liệu/module nghiệp vụ. Nguồn điểm Mentor cho Report vẫn thuộc phạm vi cần chốt.

## 9. Kiểm tra vừa đủ, có điểm dừng

Mục tiêu là xác nhận thay đổi có tác dụng mà không lặp lại cả bộ kiểm tra sau mỗi chỉnh sửa nhỏ. Không yêu cầu thêm test chỉ để mô phỏng lại chính implementation.

| Loại thay đổi | Kiểm tra tối thiểu cần dùng |
|---|---|
| Chỉ sửa tài liệu/kế hoạch | Đọc lại phạm vi, kiểm tra link/cấu trúc; không chạy app, unit hay E2E |
| Xóa file UI/assets không dùng | Kiểm tra import/đường dẫn và build một lần; không tạo tài khoản, không chạy toàn bộ auth/AI |
| Nội dung, CSS hoặc bố cục đơn giản | Kiểm tra màn bị ảnh hưởng ở viewport cần thiết; chỉ thêm lint/typecheck/build nếu phần sửa cần |
| Tương tác UI, form hoặc lưu draft | Một kịch bản tập trung vào thao tác sửa; không lặp bộ đăng ký/reset/phân quyền khi không liên quan |
| Công thức điểm, dữ liệu hoặc rubric | Unit/contract theo ca biên bị ảnh hưởng; thêm database test nếu thay transaction/query/schema |
| Auth, RLS, quyền riêng tư hoặc migration | Kiểm tra bảo vệ đúng vùng thay đổi là bắt buộc; không bỏ vì là lỗi khó hoặc tốn thời gian |
| Chuẩn bị bản phát hành | Một lượt smoke B2C và B2B trên bản build cuối; kiểm tra auth/phân quyền nếu có thay đổi hoặc môi trường mới |

Quy tắc dừng:

1. Chọn kiểm tra theo diff trước khi chạy; dùng fixture khi chỉ cần kiểm tra render.
2. Chạy một lần cho bản sửa hoàn chỉnh, sửa lỗi có thật, rồi chỉ chạy lại phạm vi bị ảnh hưởng.
3. Sau khi kiểm tra đã qua, dừng và giao bản xem được. Chỉ mở rộng khi có lỗi mới, thay đổi mới hoặc rủi ro chưa giải quyết liên quan trực tiếp.
4. Không build lại hoặc chạy lại hàng chục E2E chỉ để chụp lại ảnh. Không đánh giá tiến độ bằng số test/ảnh đã tạo.
5. Không gọi provider thật cho mọi lần đổi UI. Đợt nghiệm thu AI riêng mới xác nhận provider, dữ liệu thật và chi phí.
6. Nếu không chạy một phép kiểm tra, ghi rõ giới hạn. Không biến “không kiểm tra” thành “đã hoàn tất”.

Bộ CI đang có không bị thay trong lượt này. Khi cần tối ưu CI, áp dụng phân loại thay đổi trên thay vì xóa test bảo vệ dữ liệu.

## 10. Điều kiện hoàn thành một phần việc

- Đạt đúng yêu cầu được giao và giữ giao diện chuẩn hiện tại.
- Không mất tài khoản/lịch sử, không lộ dữ liệu hoặc làm sai quyền hiện có.
- Có loading/empty/error/success đúng với hành vi thực ở phần được thay đổi.
- Dùng dữ liệu thực hoặc ghi rõ chưa có; không báo thành công giả.
- Qua các kiểm tra liên quan trong §9, không buộc mọi loại kiểm tra cho mọi thay đổi.
- Có ghi chú ngắn: đã đổi gì, cách xác nhận, giới hạn còn lại.

PDF là yêu cầu chức năng. Một màn hình đã có không đồng nghĩa provider đã được nghiệm thu; một test fixture qua không chứng minh chấm AI thật. Ngược lại, một thay đổi chỉ xóa file không dùng cũng không cần chạy lại cả hành trình AI.

## 11. Phần hoàn thiện sau khi phát hành

- Đã thực hiện RPT-04: tải trực tiếp PDF từ lịch sử của người đang đăng nhập; không nhận user ID từ URL, không cache công khai. Giữ công thức và trạng thái thiếu dữ liệu hiện tại.
- Đã thực hiện B2C-02: gợi ý theo vị trí CV rồi cùng lĩnh vực, loại bài đã chấm/chưa mở. Dashboard/Report dùng nhãn vị trí hoặc tên nhiệm vụ ngắn, không dùng cả `brief` làm tiêu đề.
- Functions đã xác nhận ở `sin1`, gần database Supabase Singapore; không coi đây là bằng chứng đã đo tốc độ toàn hành trình. Next.js đã cập nhật 16.4.2.
- Ba bộ phỏng vấn Logistics đã đủ vòng 1 từ nguồn mới; hiện chờ điểm câu vòng 2 không khớp. Các chờ xác nhận khác: bảng trọng số CV, barem ngân hàng/các bộ phỏng vấn đã nêu ở §14, câu Trợ lý thuế, mapping sáu nhóm kỹ năng, benchmark có nguồn và phạm vi avatar/sản phẩm khác nếu đưa vào MVP.
- Đã có bằng chứng API OCR và một câu QA, chưa nghiệm thu toàn luồng AI trên production; request Financial gặp 429. Callback hỗ trợ email mặc định, SMTP vẫn tạm hoãn; chưa xác nhận gửi email/đăng nhập bằng tài khoản cloud cũ.

## 12. Điều chỉnh điều hướng theo yêu cầu chủ dự án

Bỏ toàn bộ lối vào bốn mục cũ `/career-discovery`, `/roadmap/new`, `/report`, `/account` khỏi dashboard, menu tài khoản, tìm kiếm và CTA của các màn đang sử dụng. Các kết quả riêng của mô phỏng/phỏng vấn vẫn thuộc luồng hiện tại. Không thay lõi đăng nhập hoặc dữ liệu đã lưu. Gợi ý dashboard hiển thị vị trí/tên nội dung ngắn gọn, giới hạn hai dòng; không dùng bối cảnh đề bài (`brief`) làm tiêu đề.

## 13. Đưa Report trở lại điều hướng hiện tại

Theo yêu cầu tiếp theo của chủ dự án, thêm tab **Báo cáo năng lực** ngay sau **Luyện phỏng vấn** trên thanh menu chính và đưa Report trở lại tìm kiếm dashboard. Tab mở `/report` với tổng quan, tiến độ/kết quả, bản đồ tiêu chí đã đo, strengths/gaps và tải PDF riêng tư. Ba mục `/career-discovery`, `/roadmap/new`, `/account` tiếp tục không có lối vào trong giao diện đang dùng. Các giới hạn dữ liệu của mục Báo cáo năng lực trong PDF (sáu nhóm chuẩn, voice/body language, benchmark và avatar thật) vẫn được theo dõi, không đánh dấu đã đủ dữ liệu chỉ vì mở lại tab.

## 14. Căn cứ và phạm vi feedback 17/10/2026

- Đã dùng hai agent riêng cho code và kiểm định; tiếp nhận kết quả vào bản sửa chung. Không tự mở rộng chức năng ngoài yêu cầu.
- Nguồn Google Docs mới thay nội dung chuẩn bị cũ: 15 Golden Profiles, 15 mô phỏng, 15 bộ phỏng vấn/120 câu. Giữ nguyên văn bản và ngôn ngữ nguồn; không tự thêm bản tiếng Anh.
- Chủ dự án cho phép tự tạo ba bộ tài liệu Marketing còn thiếu, với điều kiện hợp lý và bám đề. Dữ liệu bổ sung được gắn nhãn mô phỏng, không mạo nhận là tài liệu gốc hay số liệu SEO thật.
- Chờ bảng trọng số CV chủ dự án sẽ cung cấp. Trong lúc đó chỉ phân tích bằng chứng theo mức yêu cầu; không tự gán M1=5 hoặc một công thức % khác.
- Chờ xác nhận barem Tài chính-Ngân hàng và các câu phỏng vấn có điểm không khớp. Không tự thay điểm để tổng bằng 100. Một số ô câu hỏi Trợ lý thuế có dấu hiệu dán nhầm tiêu chí; giữ nguyên để xem và chờ xác nhận trước chấm.
- Giữ tài khoản, kết quả và quan hệ câu trả lời với phiên bản câu hỏi cũ. Migration bổ sung, không reset. Các lượt mô phỏng đang mở ở đề cũ không được tự chuyển sang đề mới với timestamp cũ.
- Bản ứng dụng `161edad` đã Ready trên `ready-2work.vercel.app`, đủ mười migration cloud sau bản vá đồng bộ tài liệu Marketing từ một nguồn chuẩn. Nội dung hiện có 12 mô phỏng và 7 bộ phỏng vấn mở chấm; các phần chờ nguồn không bị tính là đã nghiệm thu chỉ vì đã được nhập đủ.
- Danh sách đối chiếu, các mâu thuẫn và bằng chứng kiểm định: [feedback audit](docs/feedback-audit.md). Không coi số test qua hoặc hosting Ready là nghiệm thu toàn bộ nội dung.
