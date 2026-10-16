import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./landing.module.css";

function Icon({ children }: { children: ReactNode }) {
  return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

const journey = [
  { title: "Khám phá bản thân", description: "Hiểu sở thích, điểm mạnh và những hướng nghề nghiệp phù hợp.", href: "/career-discovery", icon: <><circle cx="12" cy="12" r="9" /><path d="m16 8-3 5-5 3 3-5z" /></> },
  { title: "Trải nghiệm công việc", description: "Thực hiện nhiệm vụ mô phỏng từ bối cảnh công việc thực tế.", href: "/simulations", icon: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V4h8v3M3 12h18M10 12v3h4v-3" /></> },
  { title: "Nhận diện kỹ năng", description: "Nhận phản hồi theo tiêu chí, hiểu điều đã làm tốt và cần cải thiện.", href: "/report", icon: <><path d="M4 20V10m5 10V4m6 16v-7m5 7V7" /></> },
  { title: "Luyện tập có lộ trình", description: "Từng bước xây dựng năng lực theo mục tiêu dành riêng cho bạn.", href: "/roadmap/new", icon: <><path d="M5 4h14v17H5zM9 8h6M9 12h6M9 16h4" /></> },
  { title: "Tự tin ứng tuyển", description: "Luyện phỏng vấn và mang theo những trải nghiệm bạn đã tích lũy.", href: "/interviews", icon: <><path d="M21 11.5a8 8 0 0 1-8 8H5l-3 3V11.5a9.5 9.5 0 0 1 19 0ZM8 10h8M8 14h5" /></> },
];

export function HomeContent({ signedIn }: { signedIn: boolean }) {
  return <main id="main-content" className={styles.page}>
    <section className={styles.hero}>
      <div className={`${styles.container} ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span /> CAREER SIMULATION PLATFORM</p>
          <h1>Trải nghiệm <span>công việc thật.</span><br />Sẵn sàng cho<br /><strong>nghề nghiệp tương lai.</strong></h1>
          <p className={styles.heroDescription}>Khoảng cách từ giảng đường đến công việc được lấp đầy bằng trải nghiệm. Khám phá, luyện tập và phát triển cùng lộ trình dành riêng cho bạn.</p>
          <div className={styles.heroButtons}><Link href={signedIn ? "/dashboard" : "/signup"} className={styles.blueButton}>Bắt đầu hành trình <span aria-hidden="true">→</span></Link><Link href="#journey" className={styles.outlineButton}>Khám phá nền tảng</Link></div>
          <div className={styles.heroNotes}><span><b aria-hidden="true">✓</b> Nhiệm vụ thực tế</span><span><b aria-hidden="true">✓</b> Phản hồi AI</span><span><b aria-hidden="true">✓</b> Lộ trình cá nhân hóa</span></div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.imageDecoration} />
          <Image src="/theme/career-students.png" alt="Sinh viên sẵn sàng cho những trải nghiệm nghề nghiệp đầu tiên" width={970} height={643} sizes="(max-width: 760px) 100vw, 48vw" className={styles.heroImage} loading="eager" fetchPriority="high" />
          <div className={styles.imageBadge}><span className={styles.badgeIcon}><Icon><path d="m5 12 4 4 10-10" /></Icon></span><div><strong>Từng bước gần hơn</strong><span>Đến công việc bạn mong muốn</span></div></div>
          <div className={styles.imageTag}><span aria-hidden="true">✦</span> Your future starts here</div>
        </div>
      </div>
    </section>

    <section id="journey" className={`${styles.section} ${styles.journeySection}`}>
      <div className={styles.container}>
        <div className={styles.sectionHeading}><p className={styles.kicker}>MỖI TRẢI NGHIỆM, MỘT BƯỚC TIẾN</p><h2>Một hành trình xuyên suốt.<br /><span>Từ khám phá đến tự tin ứng tuyển.</span></h2><p>Hiểu nghề bằng cách làm nghề. Biến những điều bạn học thành kỹ năng có thể thực hành.</p></div>
        <ol className={styles.journeyGrid}>{journey.map((step, index) => <li key={step.title}><span className={styles.stepNumber}>0{index + 1}</span><div className={styles.stepIcon}><Icon>{step.icon}</Icon></div><h3>{step.title}</h3><p>{step.description}</p><Link href={step.href} aria-label={`${step.title} – khám phá ngay`}>Khám phá <span aria-hidden="true">↗</span></Link></li>)}</ol>
      </div>
    </section>

    <section className={`${styles.section} ${styles.toolsSection}`} id="features">
      <div className={styles.container}>
        <div className={styles.sectionHeading}><p className={styles.kicker}>KHÔNG GIAN PHÁT TRIỂN CỦA BẠN</p><h2>Chuẩn bị cho công việc đầu tiên.<br /><span>Tất cả trong một nền tảng.</span></h2></div>
        <div className={styles.toolsGrid}>
          <article className={`${styles.toolCard} ${styles.roadmapCard}`}><p className={styles.cardLabel}>01 / LỘ TRÌNH AI</p><h3>Mục tiêu rõ ràng.<br />Bước tiếp theo cụ thể.</h3><p>Phân tích CV, nhận diện khoảng cách kỹ năng và xây dựng kế hoạch học tập theo nghề nghiệp bạn đang hướng đến.</p><div className={styles.roadmapPreview} aria-label="Các bước trong lộ trình"><div><span>✓</span><p><strong>Hiểu điểm xuất phát</strong><small>Hồ sơ, kỹ năng và mục tiêu của bạn</small></p></div><div><span>2</span><p><strong>Xây dựng nền tảng</strong><small>Học đúng điều bạn cần</small></p></div><div><span>3</span><p><strong>Thực hành & tiến bộ</strong><small>Trải nghiệm nhiệm vụ thực tế</small></p></div></div><Link href="/roadmap/cv">Tạo lộ trình của tôi <span aria-hidden="true">→</span></Link></article>
          <article className={`${styles.toolCard} ${styles.simulationCard}`}><p className={styles.cardLabel}>02 / MÔ PHỎNG VIỆC LÀM</p><h3>Thử làm nghề.<br />Hiểu điều mình yêu thích.</h3><p>Bước vào bối cảnh doanh nghiệp, đọc yêu cầu, hoàn thành nhiệm vụ và nhận đánh giá theo từng tiêu chí.</p><div className={styles.taskPreview}><div className={styles.taskHeader}><span><Icon><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V4h8v3" /></Icon></span><span>JOB SIMULATION</span></div><strong>Một nhiệm vụ. Một trải nghiệm mới.</strong><div><span>Bối cảnh thực tế</span><span>Tiêu chí rõ ràng</span></div><p>Đọc đề bài → Thực hiện → Nhận phản hồi</p></div><Link href="/simulations">Khám phá nhiệm vụ <span aria-hidden="true">→</span></Link></article>
        </div>
        <article className={styles.interviewFeature}><div><p className={styles.kicker}>03 / LUYỆN PHỎNG VẤN</p><h3>Để buổi phỏng vấn thật<br />không còn là lần đầu.</h3><p>Luyện trả lời theo vị trí nghề nghiệp, nhận phản hồi về nội dung và nhìn lại những điểm cần cải thiện sau mỗi buổi.</p><Link href="/interviews" className={styles.blueButton}>Vào phòng luyện tập <span aria-hidden="true">→</span></Link></div><Image src="/theme/interview.png" alt="Không gian luyện phỏng vấn trực tuyến" width={601} height={444} sizes="(max-width: 760px) 90vw, 40vw" /></article>
      </div>
    </section>

    <section id="mission" className={`${styles.section} ${styles.missionSection}`}><div className={`${styles.container} ${styles.missionGrid}`}><div className={styles.missionImage}><Image src="/theme/mission.png" alt="Ready2Work đồng hành cùng sinh viên từ học tập đến công việc" width={967} height={649} sizes="(max-width: 760px) 90vw, 45vw" /></div><div><p className={styles.kicker}>VÌ MỘT KHỞI ĐẦU VỮNG VÀNG</p><h2>Đi làm bằng sự chuẩn bị.<br /><span>Cùng bạn trên hành trình ấy.</span></h2><p>Chúng tôi mong mỗi sinh viên Việt Nam bước vào công việc đầu đời bằng sự chuẩn bị thật, hiểu biết thật và niềm tin vào chính mình.</p><p>Ready2Work tạo ra không gian để bạn thử, học từ phản hồi và tiến bộ trước khi bước vào quy trình tuyển dụng thực tế.</p><Link href="/career-discovery" className={styles.textLink}>Bắt đầu từ việc hiểu chính mình <span aria-hidden="true">→</span></Link></div></div></section>

    <section id="mentor" className={`${styles.section} ${styles.mentorSection}`}><div className={styles.container}><span className={styles.comingSoon}>ĐANG PHÁT TRIỂN</span><h2>Hành trình phát triển<br /><span>không cần phải đơn độc.</span></h2><p>Cộng đồng Mentor là bước tiếp theo của Ready2Work: kết nối sinh viên với người có kinh nghiệm, chia sẻ góc nhìn thực tế và định hướng nghề nghiệp.</p><div className={styles.mentorPills}><span>Chia sẻ kinh nghiệm</span><span>Góc nhìn trong ngành</span><span>Định hướng phát triển</span></div></div></section>

    <section className={styles.cta}><div className={styles.container}><div><p>BẠN ĐÃ SẴN SÀNG CHO BƯỚC TIẾP THEO?</p><h2>Tương lai bắt đầu từ<br />một trải nghiệm hôm nay.</h2></div><Link href={signedIn ? "/dashboard" : "/signup"} className={styles.whiteButton}>{signedIn ? "Đến không gian của tôi" : "Tạo tài khoản của bạn"} <span aria-hidden="true">→</span></Link></div></section>
  </main>;
}
