import Link from "next/link";
import { Brand } from "@/components/brand";
import styles from "./landing.module.css";

export function Footer() {
  return <footer className={styles.footer}>
    <div className={styles.container}>
      <div className={styles.footerGrid}>
        <div><Brand inverse /><p className={styles.footerDescription}>Từ giảng đường đến công việc đầu tiên.<br />Đồng hành cùng bạn bằng trải nghiệm thật và sự chuẩn bị thật.</p></div>
        <div><h2>Hành trình của bạn</h2><Link href="/career-discovery">Khám phá nghề nghiệp</Link><Link href="/roadmap/cv">Lộ trình AI & phân tích CV</Link><Link href="/simulations">Mô phỏng việc làm</Link><Link href="/interviews">Luyện phỏng vấn</Link></div>
        <div><h2>Cùng Ready2Work</h2><Link href="/#mission">Sứ mệnh của chúng tôi</Link><Link href="/#mentor">Cộng đồng Mentor</Link><Link href="/business">Dành cho doanh nghiệp</Link><Link href="/account">Tài khoản của bạn</Link></div>
      </div>
      <div className={styles.footerBottom}><p>© {new Date().getFullYear()} Ready2Work.</p><p>Trải nghiệm thật. Tự tin tiến bước.</p></div>
    </div>
  </footer>;
}
