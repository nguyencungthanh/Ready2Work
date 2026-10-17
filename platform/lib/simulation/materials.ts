export interface SimulationMaterial {
  id: string;
  title: string;
  kind: "image" | "pdf" | "document" | "table";
  href?: string;
  columns?: string[];
  rows?: string[][];
  editable?: boolean;
}

/** Only this explicitly public field may cross the server/client boundary. */
export function publicSimulationMaterials(referenceData: unknown): SimulationMaterial[] {
  if (!referenceData || typeof referenceData !== "object" || !("public_materials" in referenceData)) return [];
  const materials = referenceData.public_materials;
  if (!Array.isArray(materials)) return [];
  return materials.flatMap((item) => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.title !== "string" ||
      !["image", "pdf", "document", "table"].includes(item.kind)) return [];
    const href = typeof item.href === "string" && item.href.startsWith("/materials/") && !item.href.includes("..") ? item.href : undefined;
    const columns = Array.isArray(item.columns) && item.columns.every((value: unknown) => typeof value === "string") ? item.columns : undefined;
    const rows = Array.isArray(item.rows) && item.rows.every((row: unknown) => Array.isArray(row) && row.every((value: unknown) => typeof value === "string")) ? item.rows : undefined;
    return [{ id: item.id, title: item.title, kind: item.kind, href, columns, rows, editable: item.editable === true }];
  });
}

export function serializeSubmissionTable(title: string, columns: string[], rows: string[][]): string {
  const escape = (value: string) => value.replaceAll("|", "\\|").replaceAll("\n", " ");
  return [`### ${title}`, columns.map(escape).join(" | "), columns.map(() => "---").join(" | "), ...rows.map((row) => row.map(escape).join(" | "))].join("\n");
}
