import "server-only";
import path from "node:path";
import { readFile } from "node:fs/promises";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, pushGraphicsState, popGraphicsState, setCharacterSpacing, setWordSpacing } from "pdf-lib";
import { Document, Page, Text, View, Svg, Circle, Line, Polygon, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { getCandidateOverview } from "./data";
import { radarExplanation, readinessExplanation, reportDate } from "./presentation";

Font.register({ family: "Noto Sans", fonts: [
  { src: path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf"), fontWeight: 400 },
  { src: path.join(process.cwd(), "public/fonts/NotoSans-Bold.ttf"), fontWeight: 700 },
] });
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: { fontFamily: "Noto Sans", fontSize: 9, lineHeight: 1.6, color: "#163449", padding: 38, paddingBottom: 56 },
  header: { backgroundColor: "#1a3280", color: "white", padding: 22, borderRadius: 10, marginBottom: 20 },
  brand: { fontSize: 9, color: "#8ee3df", marginBottom: 6 },
  title: { fontSize: 22, fontWeight: 700 },
  heading: { fontSize: 15, fontWeight: 700, color: "#1a3280", marginBottom: 10, marginTop: 16 },
  name: { fontSize: 18, lineHeight: 1.5, fontWeight: 700, marginBottom: 6 },
  small: { fontSize: 8, color: "#586a7b" },
  row: { flexDirection: "row", gap: 14 },
  bio: { flexGrow: 1, flexBasis: 0 },
  gauge: { width: 150, height: 146, position: "relative", alignItems: "center" },
  score: { position: "absolute", top: 44, left: 0, right: 0, lineHeight: 1.5, fontSize: 24, fontWeight: 700, textAlign: "center", color: "#008b8b" },
  badge: { backgroundColor: "#e9f7f4", color: "#087568", padding: 9, borderRadius: 6, marginTop: 12 },
  box: { backgroundColor: "#f3f7fa", padding: 12, borderRadius: 7, marginBottom: 9 },
  component: { flexGrow: 1, flexBasis: 0, backgroundColor: "#f3f7fa", padding: 10, borderRadius: 6 },
  value: { fontSize: 15, fontWeight: 700, marginTop: 4 },
  task: { borderBottom: "1 solid #e1e8ee", paddingVertical: 10 },
  taskTitle: { flexGrow: 1, flexBasis: 0, fontWeight: 700 },
});

type Overview = Awaited<ReturnType<typeof getCandidateOverview>>;
export type ReportPdfData = Pick<Overview, "target" | "readiness" | "completion" | "targetSimulations" | "targetSubmissions" | "completedInterview" | "measuredSkills" | "strengths" | "gaps" | "cv">;
export interface ReportIdentity { displayName: string; email: string }

function Radar({ skills }: { skills: Overview["measuredSkills"] }) {
  const measured = skills.slice(0, 6);
  if (measured.length < 3) return <Text style={styles.box}>Cần ít nhất ba nhóm tiêu chí đã được chấm để vẽ bản đồ năng lực. Hoàn thành mô phỏng hoặc cả ba vòng phỏng vấn để tạo dữ liệu.</Text>;
  const point = (i: number, radius: number) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / measured.length;
    return [125 + Math.cos(angle) * radius, 110 + Math.sin(angle) * radius] as const;
  };
  const polygon = (radius: number) => measured.map((_, i) => point(i, radius).join(",")).join(" ");
  return <View wrap={false} style={styles.row}>
    <Svg width={250} height={210} viewBox="0 0 250 210">
      {[25, 50, 75, 100].map((level) => <Polygon key={level} points={polygon(level * .8)} fill="none" stroke="#d8e5e9" strokeWidth={1} />)}
      {measured.map((_, i) => <Line key={i} x1={125} y1={110} x2={point(i, 80)[0]} y2={point(i, 80)[1]} stroke="#d8e5e9" />)}
      <Polygon points={measured.map((skill, i) => point(i, skill.score * .8).join(",")).join(" ")} fill="#def2ef" stroke="#008b8b" strokeWidth={2} />
      {measured.map((skill, i) => <Circle key={i} cx={point(i, skill.score * .8)[0]} cy={point(i, skill.score * .8)[1]} r={3} fill="#008b8b" />)}
      {measured.map((_, i) => <Text key={i} x={point(i, 97)[0]} y={point(i, 97)[1]} style={{ fontSize: 9, textAnchor: "middle", fontFamily: "Noto Sans" }}>{i + 1}</Text>)}
    </Svg>
    <View style={{ flexGrow: 1, flexBasis: 0, paddingTop: 18 }}>{measured.map((skill, i) => <View key={skill.label} style={{ marginBottom: 9 }}><Text>{i + 1}. {skill.label}</Text><Text style={{ fontWeight: 700, color: "#008b8b" }}>{skill.score}/100</Text></View>)}</View>
  </View>;
}

/** Bound feedback cards so a single long paragraph cannot overflow a PDF page. */
function feedbackBlocks(text: string) {
  const words = text.normalize("NFC").split(/\s+/).filter(Boolean).flatMap((word) => word.match(/.{1,65}/gu) ?? []);
  const blocks: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length > 650) { blocks.push(current); current = ""; }
    current += `${current ? " " : ""}${word}`;
  }
  if (current) blocks.push(current);
  return blocks;
}

export async function renderReportPdf(user: ReportIdentity, data: ReportPdfData, generatedAt = new Date()) {
  const score = data.readiness.score;
  const name = user.displayName || user.email;
  const rendered = await renderToBuffer(<Document title={`Ready2Work - Hồ sơ năng lực - ${name}`} author="Ready2Work" language="vi" creationDate={generatedAt}>
    <Page size="A4" style={styles.page}>
      <View style={styles.header} wrap={false}><Text style={styles.brand}>READY2WORK / CAREER READINESS PORTFOLIO</Text><Text style={styles.title}>Hồ sơ năng lực ứng viên</Text></View>
      <View style={styles.row} wrap={false}>
        <View style={styles.bio}><Text style={styles.name}>{name}</Text><Text style={styles.small}>{user.email}</Text><Text style={{ marginTop: 12 }}>Vị trí mục tiêu</Text><Text style={{ fontWeight: 700 }}>{data.target?.title ?? "Chưa chọn vị trí mục tiêu"}</Text><Text style={{ ...styles.small, marginTop: 9 }}>Tạo {reportDate(generatedAt)} (giờ Việt Nam)</Text></View>
        <View style={styles.gauge}><Svg width={140} height={140} viewBox="0 0 140 140"><Circle cx={70} cy={70} r={53} fill="none" stroke="#e7f0f2" strokeWidth={9} />{score !== null && score > 0 && <Circle cx={70} cy={70} r={53} fill="none" stroke="#008b8b" strokeWidth={9} strokeDasharray={`${2 * Math.PI * 53 * (score ?? 0) / 100} ${2 * Math.PI * 53}`} transform="rotate(-90 70 70)" />}</Svg><Text style={styles.score}>{score ?? "—"}</Text><Text style={{ ...styles.small, position: "absolute", top: 84, left: 0, right: 0, textAlign: "center" }}>Readiness / 100</Text></View>
      </View>
      <Text style={styles.badge}>{data.readiness.badge}</Text>
      <View style={{ ...styles.row, marginVertical: 12 }} wrap={false}>{data.readiness.components.map((component) => <View key={component.key} style={styles.component}><Text style={styles.small}>{component.label} / {component.weight}%</Text><Text style={styles.value}>{component.score === null ? "Chưa có" : `${component.score}/100`}</Text></View>)}</View>
      <Text style={styles.small}>{readinessExplanation}</Text>
      <Text style={styles.heading} minPresenceAhead={85}>01 / Tiến độ và kết quả</Text>
      <View style={styles.box} wrap={false}><Text style={{ fontWeight: 700 }}>{data.targetSubmissions.length}/{data.targetSimulations.length} nhiệm vụ mô phỏng hoàn thành</Text><Text>{data.completion === null ? "Chưa có thư viện nhiệm vụ cho vị trí mục tiêu." : `${data.completion}% hoàn thành thư viện nhiệm vụ của vị trí mục tiêu`}</Text></View>
      {data.targetSimulations.map((simulation) => {
        const submission = data.targetSubmissions.find((row) => row.simulation_id === simulation.id);
        return <View key={simulation.id} style={styles.task} wrap={false}><View style={styles.row}><Text style={styles.taskTitle}>{simulation.title || simulation.position_title}</Text><Text>{submission ? `${submission.overall_score}/100` : "Chưa làm"}</Text></View><Text style={styles.small}>{submission ? `Hoàn thành - ${reportDate(new Date(submission.submitted_at))}` : "Chưa có bài làm được chấm"}</Text></View>;
      })}
      {data.completedInterview && <View style={{ ...styles.box, marginTop: 12 }} wrap={false}><Text style={{ fontWeight: 700 }}>Phỏng vấn ba vòng gần nhất - {data.completedInterview.overall_score}/100</Text>{data.completedInterview.round_scores?.map((round) => <Text key={round.round}>Vòng {round.round}: {round.score}/100</Text>)}</View>}
      <Text style={styles.heading} minPresenceAhead={245}>02 / Bản đồ kỹ năng</Text>
      <Radar skills={data.measuredSkills} />
      <Text style={styles.small}>{radarExplanation}</Text>
      <Text style={styles.heading} minPresenceAhead={65}>Điểm mạnh nổi bật</Text>
      {(data.strengths.length ? data.strengths : ["Chưa có đủ bằng chứng từ CV hoặc bài làm để xác định điểm mạnh."]).flatMap(feedbackBlocks).map((text, i) => <Text key={i} style={styles.box} wrap={false}>{text}</Text>)}
      <Text style={styles.heading} minPresenceAhead={65}>Khu vực cần cải thiện</Text>
      {(data.gaps.length ? data.gaps : ["Chưa ghi nhận khoảng cách kỹ năng cần cải thiện. Tiếp tục thực hành để có đánh giá đầy đủ hơn."]).flatMap(feedbackBlocks).map((text, i) => <Text key={i} style={styles.box} wrap={false}>{text}</Text>)}
      <Text style={styles.heading} minPresenceAhead={65}>03 / Hành động tiếp theo</Text>
      <Text style={styles.box}>Tiếp tục luyện mô phỏng và phỏng vấn theo vị trí mục tiêu, bổ sung bằng chứng cho kỹ năng cần cải thiện và nhận đánh giá Mentor.</Text>
      <Text style={styles.small}>Nguồn: CV và kết quả thực hành được lưu theo tài khoản. {data.cv?.result.provider === "rules" ? "CV hiện dùng đối chiếu từ khóa tham khảo, chưa phải đánh giá AI. " : ""}Báo cáo hỗ trợ định hướng học tập; điểm số không thay thế quyết định tuyển dụng.</Text>
    </Page>
  </Document>);
  // Stamp page numbers after pagination so they never depend on flow layout.
  const pdf = await PDFDocument.load(rendered);
  pdf.registerFontkit(fontkit);
  const footerFont = await pdf.embedFont(await readFile(path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf")), { subset: true });
  const pages = pdf.getPages();
  for (const [index, page] of pages.entries()) {
    page.pushOperators(pushGraphicsState(), setCharacterSpacing(0), setWordSpacing(0));
    page.drawText(`Ready2Work / Career Readiness Portfolio     ${index + 1} / ${pages.length}`, {
      x: 38, y: 24, size: 7, font: footerFont, color: rgb(.39, .47, .55),
    });
    page.pushOperators(popGraphicsState());
  }
  return pdf.save();
}
