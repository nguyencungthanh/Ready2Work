export function SkillRadar({ skills }: { skills: { label: string; score: number }[] }) {
  const measured = skills.slice(0, 6);
  if (measured.length < 3) return <div className="flex min-h-64 items-center justify-center rounded-xl bg-surface p-6 text-center text-sm leading-6 text-muted">Cần ít nhất ba nhóm tiêu chí đã được chấm để vẽ bản đồ năng lực. Hoàn thành mô phỏng hoặc cả ba vòng phỏng vấn để tạo dữ liệu.</div>;
  const count = measured.length;
  const point = (index: number, radius: number) => {
    const angle = -Math.PI / 2 + index * 2 * Math.PI / count;
    return [180 + Math.cos(angle) * radius, 160 + Math.sin(angle) * radius];
  };
  const polygon = (radius: number) => measured.map((_, i) => point(i, radius).join(",")).join(" ");
  return <div>
    <svg viewBox="0 0 360 335" role="img" aria-label="Biểu đồ năng lực theo điểm tiêu chí thực tế, thang 100" className="mx-auto w-full max-w-sm">
      {[25, 50, 75, 100].map((level) => <polygon key={level} points={polygon(level)} fill="none" stroke="#d8e5e9" strokeWidth="1" />)}
      {measured.map((_, i) => <line key={i} x1="180" y1="160" x2={point(i, 100)[0]} y2={point(i, 100)[1]} stroke="#d8e5e9" />)}
      <polygon points={measured.map((skill, i) => point(i, skill.score).join(",")).join(" ")} fill="#008b8b" fillOpacity=".16" stroke="#008b8b" strokeWidth="2.5" />
      {measured.map((skill, i) => {
        const [x, y] = point(i, 126);
        return <g key={skill.label}><circle cx={point(i, skill.score)[0]} cy={point(i, skill.score)[1]} r="3.5" fill="#008b8b" /><text x={x} y={y} textAnchor="middle" fill="#475569" fontSize="10"><title>{skill.label}</title>{i + 1}. {skill.score}/100</text></g>;
      })}
    </svg>
    <ol className="grid gap-2 text-xs text-muted">{measured.map((skill, i) => <li key={skill.label}>{i + 1}. {skill.label} <span className="font-semibold text-foreground">{skill.score}/100</span></li>)}</ol>
    <p className="mt-4 text-xs leading-5 text-muted">Mỗi trục là một kỹ năng hoặc tiêu chí thực sự đã được chấm cho vị trí mục tiêu; hiển thị tối đa sáu trục. Chưa có dữ liệu ứng viên trúng tuyển để tạo đường chuẩn so sánh. Giọng nói và ngôn ngữ cơ thể chưa được đo.</p>
  </div>;
}
