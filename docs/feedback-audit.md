# Đối chiếu feedback và nguồn nội dung Ready2Work

Ngày kiểm định: 17/10/2026. Người kiểm định: agent kiểm thử độc lập. Đây là danh sách nghiệm thu, không phải đề xuất chức năng mới.

## Kết quả theo chỉ đạo mới nhất — 18/10/2026

Chủ dự án xác nhận ba vị trí/ba đề mỗi ngành và giữ toàn bộ câu phỏng vấn nguồn 3/3/2; không phải chỉ giữ ba câu phỏng vấn. Đã đọc lại bản Google Docs live, đối chiếu 520 khối trước tab feedback và bảng lồng; không có thay đổi nội dung nguồn trong thời gian gián đoạn. Các ghi nhận về dữ liệu Marketing tự tạo ở bản ngày 17/10 phía dưới là lịch sử, đã được thay thế bằng chính sách chỉ dùng tài liệu gốc.

| Ngành | Đề mô phỏng nguồn | Đề đủ điều kiện chấm | Bộ phỏng vấn nguồn | Bộ đủ điều kiện chấm | Câu nguồn |
|---|---:|---:|---:|---:|---:|
| Marketing | 3 | 0 | 3 | 3 | 24 |
| Công nghệ thông tin | 3 | 3 | 3 | 2 | 24 |
| Kế toán - Kiểm toán | 3 | 3 | 3 | 1 | 24 |
| Tài chính - Ngân hàng | 3 | 0 | 3 | 1 | 24 |
| Logistics | 3 | 3 | 3 | 0 | 24 |
| Tổng | 15 | 9 | 15 | 7 | 120 |

- Phát hiện danh mục local trước sửa có 25 mô phỏng: 15 nguồn và 10 demo cũ; phỏng vấn có thêm ba demo mang tên doanh nghiệp. Đã lọc danh mục/gợi ý/lối làm mới theo slug nguồn, đồng thời lưu trữ đủ 10 demo mô phỏng và 7 demo phỏng vấn từng tồn tại. Nội dung doanh nghiệp thật vẫn ở luồng riêng; không xóa lịch sử.
- Đã xóa tệp Marketing bổ sung và các ID/facts tự tạo khỏi dữ liệu hiện hành. Ba đề Marketing cho xem/soạn thử và nêu đúng tài liệu còn thiếu: Product Brief, dữ liệu quảng cáo/trang đích, bảng 12 từ khóa SEO. Không tự điền giá/chất liệu/số liệu/từ khóa thay thế.
- IT03: khôi phục đúng bảng nguồn lồng trong ô Bối cảnh, năm cột và nhãn Q1/Q3/Bình Thạnh/Thủ Đức. Bảng tăng trưởng trong ô rubric được giữ riêng để chấm, không công khai như dữ liệu đầu vào.
- Gemini nhận đầy đủ câu hỏi/đề, hướng dẫn và tiêu chí nguyên bản; khi cần ảnh, nhận chính byte PNG đã kiểm SHA, kèm thứ tự tài liệu. Loader từ chối URL ngoài, ảnh sai/mất, ảnh đáp án 14/20, feedback và CV. Source tasks phải khớp đủ version/policy/revision trước AI; không dùng fallback keyword hoặc rubric mẫu cũ.
- Lượt API thật đã được chủ dự án cho phép cả ảnh nguồn: Business Analyst với một bài trả lời giả đã trả đủ tiêu chí nguồn, đúng giới hạn điểm và nhận xét, qua xác thực server. Không gửi dữ liệu tài khoản, không lưu bài/điểm vào DB. Đây là một ca provider thật, không phải chứng nhận chất lượng chấm của toàn bộ ngân hàng đề.
- Code và kiểm định được thực hiện bằng hai agent riêng. Các kiểm tra tập trung của hai agent, 11 content-import contracts và chuỗi 11 migration trong PostgreSQL cô lập đã qua. Một luồng Chromium trên production build local qua: 5 ngành × 3 đề/3 vị trí, bảng IT03, Marketing thiếu nguồn, QA nháp, đăng nhập lại, bảng FA và đọc TXT. Fixture đã xóa; không gọi AI trong browser.
- Bản build đã qua TypeScript và có đủ 20 PNG nguồn trong NFT của route mô phỏng; hai ảnh đáp án không có trong gói public. Công thức progress/readiness và dữ liệu lịch sử giữ nguyên. Các mâu thuẫn barem/câu hỏi ở phần dưới vẫn chờ chủ nguồn sửa, không tự quyết trọng số.

## Căn cứ và giới hạn

- Feedback: `/Users/thanhnguyen/Downloads/Ready2Work (1).pdf`, 20 trang; đã trích xuất văn bản và xem ảnh các trang chứa lỗi giao diện/thao tác. Trang 20 không có nội dung mới.
- Yêu cầu MVP: `docs/requirements/Ready2Work.pdf`.
- Nguồn mới của chủ dự án: [Google Docs tổng hợp](https://docs.google.com/document/d/1ZFGI1saTmmqJuiVLM0SZ0CeYSMW6BtxHIMilRcRNgto/edit?usp=sharing). Văn bản xuất được dùng để đối chiếu; liên kết và bảng phải được kiểm tra thêm trong bản Word/PDF, không coi bản xuất văn bản là đủ để khôi phục bảng.
- Chỉ dùng nội dung tiếng Việt và thuật ngữ vốn có trong nguồn; không tự viết thêm bản dịch tiếng Anh, ví dụ, câu hỏi, tiêu chí hoặc dữ liệu.
- Các kết quả dưới đây phân biệt đọc code, kiểm thử local, kiểm thử provider và nghiệm thu production. Không đánh dấu lỗi đã sửa chỉ vì unit test hiện có vượt qua.

## Checklist theo feedback

| Mã | Căn cứ feedback | Yêu cầu và tiêu chí nghiệm thu | Bằng chứng hiện tại trước sửa |
|---|---|---|---|
| F-01 | Tr.1-2 | Email đã đăng ký đăng nhập lại được vào đúng tài khoản, giữ lịch sử. Lỗi xác thực phải giải thích đúng bằng tiếng Việt. | `platform/app/(auth)/actions.ts` gộp mọi lỗi `signInWithPassword` thành `Invalid email or password`. Chưa phân biệt email chưa xác nhận, dịch vụ không khả dụng và sai thông tin. Fixture local đăng nhập, đăng xuất và đăng nhập lại thành công; chưa tái hiện tài khoản cũ cloud. |
| F-02 | Tr.3, mục A | Đọc được CV PDF dạng ảnh đã cung cấp khi người dùng đồng ý gửi Gemini; lỗi OCR/AI không lưu thành công giả. | Bản cũ chỉ trích lớp văn bản, CV mẫu không có lớp văn bản. Agent code đang sửa OCR riêng; cần kiểm định diff và bằng chứng thực tế. |
| F-03 | Tr.3, Kế-Kiểm | Giữ nguyên đề đúng; các mục `(1)`, `(2)` xuống dòng, đánh số như tài liệu. | Waiting/submission đang xuất chuỗi đề bài trong đoạn văn; không dùng cấu trúc danh sách của tài liệu. Không được viết lại nội dung đề vì chỉ cần sửa trình bày. |
| F-04 | Tr.3-11 | Chấm mô phỏng theo đúng tiêu chí và bằng chứng; bài thiếu yêu cầu lập bảng, thủ tục, căn cứ không được nhận điểm tương đương bài đủ. | Cần kiểm thử đối chiếu cặp bài trả lời ở feedback; chưa có bằng chứng tái hiện provider. Phân biệt bài dài với bài đủ: không đặt điều kiện số chữ thay thế rubric. |
| F-05 | Tr.11 | Cho tải lên bài làm/tài liệu ở mô phỏng và dùng được bảng. | `submission-form.tsx` vô hiệu hóa nút tệp; editor chỉ lưu `innerText`, mất cấu trúc bảng và định dạng. Chèn bảng bằng `execCommand` chưa chứng minh sửa/lưu/khôi phục bảng được. |
| F-06 | Tr.11-13, Risk | Bối cảnh đúng nguồn; bộ hồ sơ tách tab tham khảo; đủ ba nhiệm vụ, gồm bảng chỉ số/so sánh chuẩn ngành-khẩu vị và rủi ro ngành/vĩ mô/dự án; có tài liệu làm bài. | Hiện tài liệu tách bằng chuỗi `## Dữ liệu đầu vào`; Risk không có tài liệu và bối cảnh trộn các chỉ tiêu. Cần dùng hồ sơ/bảng từ liên kết nguồn. |
| F-07 | Tr.13-14, Credit | Liệt kê đủ bộ hồ sơ đúng nguồn; giữ đúng ba nhiệm vụ và ý con; tài liệu đọc được bằng bảng/văn bản, không xuất JSON. | Feedback cho thấy năm nhiệm vụ thay vì ba và tài liệu JSON. `submission-form.tsx` đang dùng `<pre>` cho toàn bộ dữ liệu. |
| F-08 | Tr.15-16, Financial | Doanh nghiệp Đại Dương, đúng bộ hồ sơ và câu Ban Giám đốc cần phương án trước kỳ họp; đúng ba nhiệm vụ, không tách ý con thành nhiệm vụ; tài liệu đọc được. | Migration cũ dùng doanh nghiệp ABC; năm nhiệm vụ và hồ sơ JSON. Có sự khác nhau giữa ảnh feedback nhiệm vụ 1 và nguồn tổng hợp; lấy nội dung chuẩn từ nguồn, ghi rõ mâu thuẫn thay vì đoán. |
| F-09 | Tr.17-18, sảnh phỏng vấn | Mỗi ngành chỉ hiển thị các vị trí được giao; bỏ thẻ trùng và vị trí Software Engineer không có trong nguồn. Giữ lịch sử cũ. | Local DB có `financial-analyst-general`, `software-engineer-general`, `position_id=null`, đều đang mở. Query catalog lấy mọi `interview_sets` nên hiện cùng các bộ mới `r2w-*`. Hai bộ doanh nghiệp demo cũ cũng còn trong DB. |
| F-10 | Tr.17, Financial | Câu trả lời được đánh giá và lưu; giữ nguyên câu hỏi đúng của cả ba vòng; provider lỗi giữ bản nháp và cho thử lại. | Ảnh lỗi là `Your answer could not be evaluated...`: action bắt lỗi trước bước insert. Chưa đủ bằng chứng nói lỗi DB. `evaluateInterviewWithAI` chưa retry; validation đúng ID/giới hạn điểm cần giữ. |
| F-11 | Tr.17, giọng đọc | Đọc câu tiếng Việt và thuật ngữ đúng ngôn ngữ; không đọc toàn bộ thuật ngữ tiếng Anh bằng voice tiếng Việt. | `answer-form.tsx` tạo một utterance, hễ prompt có dấu thì đặt cả câu `vi-VN`; không chọn voice phù hợp hay tách đoạn. Chưa có kiểm tra âm thanh thực. |
| F-12 | Tr.18-19, QA câu 2 | Câu trả lời ngắn hoặc thiếu ý vẫn được chấm đúng mức và chuyển câu; không biến điểm thấp thành lỗi nộp. | UI/action không có min length cho phỏng vấn. Lỗi có thể ở provider/schema, cần kiểm tra đúng nhánh đó. Không bỏ validation hoặc thay câu hỏi/rubric để né lỗi. |

## Đối chiếu đủ nội dung năm ngành

Nguồn mới mô tả ba vị trí mỗi ngành, ba vòng mỗi vị trí, cấu trúc 3/3/2 câu. Tổng số câu phỏng vấn cần có theo nguồn là 15 vị trí và 120 câu. Tên tiếng Anh vốn có trong nguồn được giữ nguyên; không tự bổ sung tên/song ngữ khác.

| Ngành | Bank trước sửa | Yêu cầu từ nguồn mới | Chênh lệch chắc chắn |
|---|---|---|---|
| Marketing | Intern: 2/2/1; Digital: 1/2/2; thiếu Content Marketing | Ba vị trí, mỗi vị trí 3/3/2 | Cần đồng bộ cả ba vòng và thêm đúng bộ Content Marketing có sẵn trong nguồn; không chỉ lấp vòng thiếu. |
| Công nghệ thông tin | BA, QA, Data: mỗi vị trí 3/3/2 | Ba vị trí tương ứng | Cần đối chiếu nguyên văn câu hỏi/tiêu chí. Có nội dung tiêu chí được nguồn cập nhật, ví dụ QA định nghĩa Testing/QA và trách nhiệm từng vai trò. |
| Kế-Kiểm | Kế toán, Kiểm toán, Trợ lý thuế: mỗi vị trí 3/3/2 | Ba vị trí tương ứng | Cần đối chiếu nguyên văn, không coi đủ số câu là đủ nội dung. Có điểm tiêu chí thiếu/mâu thuẫn trong nguồn, xem phần dưới. |
| Tài chính-Ngân hàng | Credit, Financial, Risk: mỗi vị trí 3/3/2 | Ba vị trí tương ứng | Rubric nguồn mới khác đáng kể bank cũ dù câu hỏi nhìn tương tự; không chỉ sửa nhãn UI. |
| Logistics | Cả ba bộ: 0/1/1 | Ba vị trí, mỗi vị trí 3/3/2 | Phải đồng bộ đủ ba vòng từ nguồn; nguồn mới đã có vòng 1, trạng thái "thiếu nguồn" hiện tại không còn đúng. |

## Điểm nguồn cần thống nhất, không tự sửa trọng số

Các dòng dưới đây dùng số dòng của bản xuất văn bản để đối chiếu nhanh, không thay cho nội dung bảng gốc. Phải xem bảng trước khi chốt. Không tự hạ điểm một tiêu chí để khớp tổng hoặc tự tạo điểm còn thiếu.

| Vị trí/câu | Điểm câu ghi trong nguồn | Tổng/điểm tiêu chí nguồn | Dòng nguồn |
|---|---:|---|---:|
| BA, vòng 2 câu 2 | 30 | 15 + 12 + 8 = 35 | 1129 |
| Kế toán viên, vòng 1 câu 3 | 35 | Tiêu chí 2 không ghi điểm; hai tiêu chí còn lại 15 và 8 | 1464 |
| Kế toán viên, vòng 2 câu 2 | 30 | 15 + 12 + 8 = 35 | 1478 |
| Credit, vòng 2 câu 1 | 30 | 15 + 12 + 8 = 35 | 1828 |
| Financial, vòng 2 câu 1 | 30 | 15 + 15 + 5 = 35 | 1913 |
| Financial, vòng 3 câu 1 | 50 | 35 + 10 + 10 + 5 = 60 | 1937 |
| Financial, vòng 3 câu 2 | 50 | 20 + 15 + 10 + 10 = 55 | 1945 |
| Logistics Operations, vòng 2 câu 1 | 30 | 15 + 12 + 8 = 35 | 2285 |
| Supply Chain, vòng 2 câu 1 | 30 | 15 + 12 + 8 = 35 | 2338 |
| Purchasing, vòng 2 câu 1 | 30 | 15 + 12 + 8 = 35 | 2391 |

Phần mô phỏng có các mâu thuẫn điểm khác đang được đối chiếu riêng bằng bảng Word gốc. Chưa kết luận các tiêu chí này đã hợp lệ.

## Golden Profile: nội dung và quy tắc mức độ

Nội dung `platform/data/golden-profiles.json` trước sửa khác nguồn mới, không thể coi việc giữ nguyên trọng số cũ là bảo toàn yêu cầu. Cần đồng bộ tên năng lực, tiêu chuẩn và mức độ từ các bảng mới cho đủ 15 vị trí.

| Ví dụ | Nội dung cũ trong code | Nội dung nguồn mới |
|---|---|---|
| Risk Analyst | PD/LGD/EAD/VaR, Basel II/III, Python/R/SQL, FRM/PRM/CFA | Phân tích rủi ro tín dụng: D/E trước/sau giải ngân, thanh khoản, ICR, Nợ vay/EBITDA; so sánh chuẩn ngành/khẩu vị; rủi ro ngành-vĩ mô-dự án; cơ chế bảo vệ và khuyến nghị có số liệu. |
| Kiểm toán viên | Tiếng Anh là công cụ bắt buộc; IFRS/VAS và nhiều chứng chỉ được đưa vào mẫu số | Ngoại ngữ ở M3 theo JD; IFRS/ISA ở M4 lợi thế; không có các chứng chỉ cũ trong bảng này. |
| Logistics Operations | Khai báo hải quan/VNACCS và chứng chỉ hải quan ở mức bắt buộc | Theo dõi đơn hàng, ngoại lệ, chứng từ, điều phối, chi phí/SOP; phần mềm nghiệp vụ đặc thù là điều kiện theo JD. |
| Marketing | Nhiều năng lực/soft skills/công cụ còn thiếu và thêm chứng chỉ ngoài bảng | Đủ ba nhóm theo từng mức trong bảng: ví dụ Intern có hỗ trợ đa kênh, báo cáo chỉ số, Meta Business Suite; không có các chứng chỉ cũ. |
| IT | Hạng mục bị rút gọn, áp mức "thành thạo/trung bình/cơ bản" và trọng số số học | Năng lực có tiêu chuẩn cụ thể, M1-M4; Data Analyst bổ sung metric, SQL, insight, thống kê, domain; QA tự động là M4 lợi thế. |

Nguồn quy định M3 chỉ đánh giá khi JD/domain yêu cầu và M4 chỉ tăng độ phù hợp, không tạo gap bắt buộc. Marketing dùng ba mức với ý nghĩa riêng: M1 cốt lõi, M2 quan trọng, M3 lợi thế; không được áp nghĩa M3 điều kiện của IT sang Marketing.

Các bảng mới không định nghĩa trọng số 1-5 hay công thức % CV. Trước sửa, `profileRequirements` loại bỏ `required_level`/`priority`, mặc định trọng số 3, đặt soft skills = 0 và biến tất cả mục chưa matched thành gap. Vì vậy chỉ thêm nhãn M1-M4 vào JSON chưa đáp ứng quy tắc nguồn. Form hiện không thu JD/domain, nên không đủ căn cứ kích hoạt mục M3 có điều kiện. Cần chủ dự án chốt cách tính % và việc tính soft skills; không tự suy M1=5/M2=3, không giữ chứng chỉ ngoài nguồn trong mẫu số. Lịch sử phân tích cũ phải được giữ nguyên.

## Bảo toàn lịch sử khi đồng bộ nguồn

`scripts/import-content.mjs` trước sửa dùng `ON CONFLICT (set_id, position) DO UPDATE` để thay prompt, rubric và điểm tối đa, nhưng giữ ID câu hỏi đã có. Khi số câu Marketing/Logistics tăng và thứ tự đổi, việc này có thể làm câu trả lời đã lưu được ghép với câu hỏi khác. `stableId` không giải quyết được vì nhánh conflict giữ ID của hàng cũ.

Migration mới phải bảo toàn phiên bản câu hỏi/rubric gắn với kết quả đã làm (ví dụ phiên bản bộ đề hoặc snapshot), chỉ hiện bản nguồn mới ở catalog. Không ghi đè migration đã chạy trên cloud và không xóa lịch sử để né xung đột. Cần kiểm tra tương tự cho rubric/đề mô phỏng và điểm phỏng vấn tổng hợp đã lưu.

## Thiếu hoặc mâu thuẫn trong tài liệu nguồn mới

Đã kiểm tra độc lập nội dung đề và rubric gốc. Những điểm sau cần chủ dự án cung cấp/chốt, không tự tạo dữ liệu bù:

- Marketing Intern: rubric yêu cầu đúng Product Brief (chất liệu, giá, ưu đãi 48 giờ) nhưng phần đề không có Product Brief hoặc liên kết cung cấp các chi tiết này.
- Digital Marketing: rubric đòi phân tích nhóm A dùng 60% ngân sách/CPL 1.000.000đ/CTR 0,6%, nhóm B CPL 400.000đ, trang tải 5,2 giây và form 7 trường. Đề chỉ có số liệu tổng, không có bộ dữ liệu phân nhóm hoặc hiệu năng trang. Không công khai đáp án/rubric để thay cho tài liệu còn thiếu.
- Content Marketing: nhiệm vụ yêu cầu chọn 5 từ từ bảng 12 từ khóa; bảng này không có trong nguồn hoặc các liên kết kèm theo. Không tự sinh 12 từ khóa và các chỉ số volume/KD.
- Trợ lý thuế: ô câu hỏi của bảng nguồn có nội dung như tiêu chí: vòng 1 câu 1 "Xem xét có dấu hiệu sai sót hoặc gian lận hay không"; vòng 2 câu 1 "Nêu được cách cập nhật từ nguồn chính thống, tài liệu chuyên môn hoặc hướng dẫn của doanh nghiệp". Không tự viết lại thành câu hỏi mới; cần xác nhận ý định nguồn.
- Ảnh hồ sơ Credit `05.png` in sẵn ICR 4,6 / 3,5 / 2,4. Theo cùng bảng, `(EBITDA - khấu hao) / chi phí lãi vay` lần lượt bằng 4,2 / khoảng 2,867 / khoảng 1,882. Giữ nguyên ảnh/số liệu gốc, ghi rõ mâu thuẫn; không âm thầm sửa một bên hoặc phạt người nhận diện mâu thuẫn.

Đã xem trực tiếp 13 ảnh tài liệu Tài chính-Ngân hàng và tạo bản chép đối chứng tạm cho agent tích hợp: Credit 03-08; Financial 10-12; Risk 15-18. Không dùng OCR AI, không chép hai ảnh đáp án tham chiếu 14/20 vào tài liệu công khai. Ảnh gốc có SHA-256 trong `platform/data/source/materials-20261017.json` để kiểm tra không bị thay số khi phát hành.

## Kiểm tra đã thực hiện

1. Đọc PDF feedback và render bằng Poppler, xem các trang lỗi/tham chiếu. Không sửa PDF, không đưa ảnh CV cá nhân vào repository.
2. Chạy hai file unit phỏng vấn hiện có trước sửa: 6/6 qua, chỉ bảo vệ phân quyền/thứ tự/giới hạn. Sau bổ sung ca QA ngắn được lưu điểm thấp, provider 503 không insert và lỗi ghi DB tách biệt, `tests/unit/interview/actions.test.ts` và `tests/unit/interview/ai-evaluator.test.ts`: 12/12 qua. Thêm `speech.test.ts`: 3/3 qua, bảo toàn câu hỏi và tách đúng tiếng Việt/thuật ngữ tiếng Anh. Đây là kiểm tra mock/contract, chưa phải bằng chứng chất lượng chấm AI thật hoặc chất lượng âm thanh thực.
3. Đọc danh mục local bằng service role, chỉ in metadata công khai của bộ đề; xác nhận hai thẻ legacy thừa và hai bộ doanh nghiệp demo. Không đọc câu trả lời ứng viên.
4. Tạo một tài khoản xác nhận trong Supabase local, đăng nhập, kiểm tra claims, đăng xuất và đăng nhập lại. Cùng ID, profile còn nguyên; đã xóa fixture. Chưa xác nhận lỗi tài khoản cũ trên cloud.
5. Lần đầu auto-review chặn kiểm thử provider vì chưa có phạm vi phép gửi nội dung dự án. Sau đó chủ dự án đã cho phép rõ câu hỏi/rubric/đáp án tham chiếu và bài trả lời giả. API thật đã chấm QA vòng 1 câu 2 với câu ngắn “Reactive/Proactive, Quality Assurance/Quality Control.”, trả đủ 3 tiêu chí hợp lệ. Request Financial tiếp theo bị 429; đã dừng, không ghi DB và không tạo kết quả giả.

## Kiểm tra cần làm sau bản sửa

- Đối chiếu catalog và nội dung đủ 15 vị trí/120 câu; nguyên văn đề, nhiệm vụ, ý con, bảng và liên kết. Không lấy số lượng làm chứng nhận nội dung khớp.
- Kiểm tra QA câu 2 trả lời ngắn được chấm thấp và lưu; câu đủ ý được chấm theo tiêu chí; thiếu/duplicate/foreign ID và vượt điểm vẫn bị từ chối an toàn.
- Kiểm tra provider timeout/503 giữ draft; thử lại không tạo câu trả lời trùng; refresh tiếp tục đúng câu chưa trả lời. Kiểm tra lỗi ghi DB khác lỗi đánh giá.
- Kiểm tra catalog có đúng ba vị trí IT và ba vị trí TCNH, truy cập lịch sử cũ vẫn được.
- Kiểm tra thông báo xác thực bằng tiếng Việt cho sai thông tin, email chưa xác nhận và lỗi dịch vụ; giữ thông báo chung chống lộ tài khoản.
- Kiểm tra chèn/sửa/lưu/khôi phục bảng; upload file được đọc để chấm đúng nội dung; chỉ tài khoản chủ sở hữu tải được file.
- Kiểm tra một màn mô phỏng mỗi cấu trúc nội dung bị ảnh hưởng và âm thanh tiếng Việt/thuật ngữ bằng trình duyệt có voice tương ứng; không chạy lặp toàn bộ suite để chụp ảnh.

Kết luận tại thời điểm lập báo cáo: chưa đủ căn cứ nghiệm thu toàn bộ yêu cầu. Có sai lệch nguồn chắc chắn cần sửa; lỗi đăng nhập tài khoản cũ và provider phỏng vấn chưa tái hiện trên production. Bản kiểm định sẽ được cập nhật theo diff và kết quả thực tế sau sửa.

## Cập nhật sau tích hợp bản sửa

- Đã đồng bộ 120 câu nguyên văn và đầy đủ 15 vị trí, ba vòng 3/3/2. Contract câu hỏi và Golden Profiles đối chiếu trực tiếp từng ô nguồn, không chỉ đếm số lượng.
- Đã dùng 20 ảnh đầu vào gốc với checksum; hai ảnh đáp án không được đưa vào public. Ba bộ dữ liệu Marketing còn thiếu đã được chủ dự án cho phép tự tạo, được gắn nhãn mô phỏng; tổng quảng cáo khớp 5 triệu/62.500 hiển thị/500 nhấp/8 khách để lại thông tin, bảng SEO có 12 ứng viên từ khóa.
- Barem ba mô phỏng ngân hàng chưa được xác nhận; bảy bộ phỏng vấn có điểm mâu thuẫn và bộ Trợ lý thuế có câu/tiêu chí không khớp đang chỉ cho xem. Không tự điền điểm thiếu. Phần trăm CV chờ bảng trọng số chủ dự án sẽ cung cấp.
- Lịch sử phỏng vấn giữ câu hỏi/ID/rubric cũ; danh mục chỉ hiện bản nguồn mới và nội dung doanh nghiệp thật. Kết quả mô phỏng đã chấm giữ snapshot; lượt đang mở khi nguồn thay đổi được đánh dấu superseded, có thông báo và không được chấm theo timer cũ.
- Bản sửa auth hỗ trợ cả PKCE code của email Supabase mặc định và token_hash cũ, giữ xác minh và quyền theo database. Kiểm tra cục bộ đã qua; chưa tuyên bố tài khoản/email cũ trên cloud đã được nghiệm thu.
- Một luồng trình duyệt production build local đã kiểm tra đăng nhập lại giữ lịch sử, ba vị trí IT/ngân hàng, draft QA qua tab/refresh, tài liệu không JSON, ô bảng gốc/custom sửa được, import TXT và khôi phục bản nháp. Fixture local đã xóa; không ghi bài test vào cloud.
- Hai agent đã thực hiện code/kiểm định rồi dừng do giới hạn sử dụng; agent chính tiếp nhận phần tích hợp, migration và kiểm tra cuối. Không coi các kiểm tra mock là bằng chứng live scoring Financial hay chất lượng phát âm thực trên mọi thiết bị.
