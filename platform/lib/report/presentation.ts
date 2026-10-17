export const readinessExplanation = "30% × tỷ lệ hoàn thành nhiệm vụ của vị trí mục tiêu + 40% × điểm phỏng vấn ba vòng gần nhất + 30% × điểm Mentor gần nhất cùng vị trí. Các thành phần dùng thang 0-100. Khi thiếu dữ liệu, không thay bằng 0 hoặc đổi trọng số.";
export const radarExplanation = "Các trục là tiêu chí thực sự đã được chấm cho vị trí mục tiêu, tối đa sáu trục. Chưa có dữ liệu ứng viên trúng tuyển để tạo đường chuẩn. Giọng nói và ngôn ngữ cơ thể chưa được đo.";
export function reportDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}
export function evaluationBandLabel(value: string | null | undefined): string {
  return ({ Emerging: "Cần củng cố nền tảng", Developing: "Đang phát triển", Proficient: "Đáp ứng tốt", Strong: "Vững vàng" } as Record<string, string>)[value ?? ""] ?? value ?? "Chưa có dữ liệu đánh giá";
}
