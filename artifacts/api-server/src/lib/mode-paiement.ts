/**
 * Modes de paiement des cotisations.
 * La valeur STOCKÉE (et celle de l'API) reste le code sans accent : « especes »,
 * « virement »… Seul l'affichage (PDF, modèles Excel) utilise le libellé accentué.
 */
export const MODE_PAIEMENT_LABELS: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement",
  cheque: "Chèque",
  mobile_money: "Mobile Money",
  prelevement: "Prélèvement",
  regularisation: "Régularisation",
};

/** Libellé d'affichage d'un code stocké (« especes » → « Espèces »). */
export function formatModePaiement(mode: string | null | undefined): string {
  if (!mode) return "-";
  return MODE_PAIEMENT_LABELS[mode] ?? mode.replace(/_/g, " ");
}

/**
 * Code à stocker à partir d'une saisie Excel : accepte le code (« especes »)
 * comme le libellé (« Espèces », « ESPECES », « Mobile Money »).
 */
export function parseModePaiement(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  const key = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s-]+/g, "_");
  return key in MODE_PAIEMENT_LABELS ? key : raw;
}

/** Liste lisible pour les instructions : « Espèces | Virement | … ». */
export const MODES_PAIEMENT_IMPORT = ["especes", "virement", "cheque", "regularisation"]
  .map((c) => MODE_PAIEMENT_LABELS[c]).join(" | ");
