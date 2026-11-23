export function formatFCFA(amount: number | undefined | null): string {
  if (amount == null) return "0 FCFA";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace("XOF", "FCFA");
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

/** Libellés d'affichage des modes de paiement (la valeur stockée reste « especes », etc.). */
export const MODE_PAIEMENT_LABELS: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement",
  cheque: "Chèque",
  mobile_money: "Mobile Money",
  prelevement: "Prélèvement",
  regularisation: "Régularisation",
};

export function formatModePaiement(mode: string | undefined | null): string {
  if (!mode) return "-";
  return MODE_PAIEMENT_LABELS[mode] ?? mode.replace(/_/g, " ");
}
