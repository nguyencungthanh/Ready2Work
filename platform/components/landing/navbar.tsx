import Link from "next/link";
import { Brand } from "@/components/brand";
import styles from "./landing.module.css";

const links = [
  { href: "/simulations", label: "Mô phỏng việc làm" },
  { href: "/interviews", label: "Luyện phỏng vấn" },
  { href: "#mentor", label: "Cộng đồng Mentor" },
];

export function Navbar({ signedIn }: { signedIn: boolean }) {
  return (
    <header className={styles.navbar}>
      <div className={styles.navInner}>
        <Brand />
        <nav aria-label="Điều hướng chính" className={styles.desktopNav}>
          {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
        <div className={styles.navActions}>
          {signedIn ? <Link href="/dashboard" className={styles.tealButton}>Không gian của tôi <span aria-hidden="true">→</span></Link> : <><Link href="/signin" className={styles.signIn}>Đăng nhập</Link><Link href="/signup" className={styles.tealButton}>Đăng ký</Link></>}
        </div>
        <details className={styles.mobileMenu}>
          <summary aria-label="Mở menu điều hướng"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg></summary>
          <nav aria-label="Điều hướng trên điện thoại">{links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}<Link href="/business">Dành cho doanh nghiệp</Link></nav>
        </details>
      </div>
    </header>
  );
}
