/**
 * Génération de fichiers CSV lisibles par Excel (version française) :
 * - BOM UTF-8 en tête, sinon Excel affiche « PrÃ©nom » au lieu de « Prénom » ;
 * - séparateur « ; » (séparateur de liste d'Excel en français) ;
 * - valeurs entourées de guillemets si besoin (séparateur, guillemet, retour à la ligne).
 */
export const CSV_SEPARATOR = ";";

function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\r\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return "\uFEFF" + [headers, ...rows].map(r => r.map(cell).join(CSV_SEPARATOR)).join("\r\n") + "\r\n";
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const blob = new Blob([toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
