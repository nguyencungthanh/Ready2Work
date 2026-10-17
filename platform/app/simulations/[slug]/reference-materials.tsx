/* eslint-disable @next/next/no-img-element -- Source document images retain their original proportions. */
import type { SimulationMaterial } from "@/lib/simulation/materials";

export function ReferenceMaterials({ materials }: { materials: SimulationMaterial[] }) {
  return <div className="space-y-6">{materials.map((material) => <section key={material.id} className="space-y-3">
    <h2 className="font-bold">{material.title}</h2>
    {material.kind === "image" && material.href && <a href={material.href} target="_blank" rel="noreferrer"><img loading="lazy" decoding="async" src={material.href} alt={material.title} className="h-auto w-full rounded border border-border" /></a>}
    {material.kind === "pdf" && material.href && <iframe loading="lazy" src={material.href} title={material.title} className="w-full min-h-[560px] border border-border rounded" />}
    {material.kind === "table" && material.columns && <div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr>{material.columns.map((column, index) => <th key={index} className="border border-border p-2 text-left">{column}</th>)}</tr></thead><tbody>{material.rows?.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column} className="border border-border p-2 whitespace-pre-wrap">{cell || "—"}</td>)}</tr>)}</tbody></table>{material.editable && <p className="text-xs text-muted mt-2">Điền bảng này tại phần bài làm bên phải.</p>}</div>}
    {material.href && <a href={material.href} download className="reference-link">Tải tài liệu ↓</a>}
  </section>)}</div>;
}
