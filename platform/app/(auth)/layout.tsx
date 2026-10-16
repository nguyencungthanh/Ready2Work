import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import styles from "./auth.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>
    <header className={styles.header}><Brand /><Link href="/">Về trang chủ <span aria-hidden="true">↗</span></Link></header>
    <div className={styles.grid}>
      <aside className={styles.intro}>
        <p className={styles.eyebrow}>YOUR NEXT CHAPTER STARTS HERE</p>
        <h2>Một bước nhỏ hôm nay.<br /><span>Một khởi đầu vững vàng.</span></h2>
        <p className={styles.description}>Khám phá điều phù hợp với bạn và chuẩn bị cho công việc đầu tiên bằng trải nghiệm thực tế.</p>
        <ol className={styles.steps}><li><span>01</span><div><strong>Khám phá bản thân</strong><p>Hiểu điểm mạnh và định hướng nghề nghiệp</p></div></li><li><span>02</span><div><strong>Trải nghiệm & luyện tập</strong><p>Nhiệm vụ thực tế và phản hồi theo tiêu chí</p></div></li><li><span>03</span><div><strong>Tự tin tiến bước</strong><p>Lộ trình phát triển dành riêng cho bạn</p></div></li></ol>
        <div className={styles.introBottom}><span aria-hidden="true">✦</span><p>Trải nghiệm thật. Chuẩn bị thật.<br /><strong>Sẵn sàng cho nghề nghiệp tương lai.</strong></p></div>
      </aside>
      <div className={styles.formPanel} lang="en">{children}</div>
    </div>
    <footer className={styles.footer}>Ready2Work · Đồng hành từ giảng đường đến công việc.</footer>
  </div>;
}
