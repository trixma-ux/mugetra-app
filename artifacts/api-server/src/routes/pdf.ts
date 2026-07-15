import { Router, type IRouter } from "express";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { db, membresTable, cotisationsTable, assistancesTable, assistanceValidationsTable, usersTable, personnesDeclareeesTable } from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const LOGO_PATH = path.join(process.cwd(), "assets/logo-mugetra.png");
const HAS_LOGO = fs.existsSync(LOGO_PATH);

const PRIMARY = "#1a5c3a";
const GOLD = "#c9a227";
const TEXT_DARK = "#1a1a1a";
const MUTED = "#6b7280";
const LIGHT_BG = "#f0faf4";
const ROW_ALT = "#f8f9fa";
const PAGE_W = 595.28;
const MARGIN = 45;
const CONTENT_W = PAGE_W - MARGIN * 2;

const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

const TYPE_LABELS: Record<string, string> = {
  deces_membre: "Décès d'un membre actif",
  deces_conjoint: "Décès du conjoint(e)",
  deces_enfant: "Décès d'un enfant",
  deces_parent: "Décès d'un parent",
  deces_beau_parent: "Décès d'un beau-parent",
  deces_mort_ne: "Mort-né",
  mariage: "Mariage",
  retraite: "Retraite",
  retraite_complementaire: "Retraite complémentaire",
  pret_sante: "Prêt santé",
  licenciement: "Licenciement",
};

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  commission_affaires_sociales: "Com. Affaires Sociales",
  commission_prets: "Com. des Prêts",
  tresorerie: "Trésorerie",
  bureau: "Bureau",
  approuvee: "Approuvée",
  rejetee: "Rejetée",
  payee: "Payée",
};

const LIEN_LABELS: Record<string, string> = {
  conjoint: "Conjoint(e)",
  enfant: "Enfant",
  parent: "Parent",
  beau_parent: "Beau-parent",
};

function fdate(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return d; }
}

function fshort(d?: string | null): string {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return d; }
}

function ffcfa(n?: number | null): string {
  return (n ?? 0).toLocaleString("fr-FR") + " FCFA";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function drawHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string): number {
  doc.rect(0, 0, PAGE_W, 108).fill(PRIMARY);
  const logoY = 14;
  if (HAS_LOGO) {
    try { doc.image(LOGO_PATH, MARGIN, logoY, { width: 72, height: 72 }); } catch {}
  }
  const tx = HAS_LOGO ? MARGIN + 80 : MARGIN;
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(15).text("MUGETRA-NPG.CI", tx, 20, { width: PAGE_W - tx - MARGIN });
  doc.fillColor("rgba(255,255,255,0.85)").font("Helvetica").fontSize(8.5)
    .text("Mutuelle Générale des Travailleurs de la Nouvelle Parfumerie Gandour CI", tx, 39, { width: PAGE_W - tx - MARGIN });
  doc.fillColor("rgba(255,255,255,0.65)").fontSize(7.5).text("Abidjan, Côte d'Ivoire", tx, 52, { width: PAGE_W - tx - MARGIN });
  const now = new Date();
  doc.fillColor("rgba(255,255,255,0.65)").fontSize(7.5)
    .text(`Édité le ${now.toLocaleDateString("fr-FR")}`, tx, 62, { width: PAGE_W - tx - MARGIN });

  doc.rect(0, 108, PAGE_W, 3.5).fill(GOLD);

  const titleY = 119;
  doc.rect(MARGIN, titleY, CONTENT_W, 30).fill(LIGHT_BG);
  doc.rect(MARGIN, titleY, 4, 30).fill(PRIMARY);
  doc.fillColor(PRIMARY).font("Helvetica-Bold").fontSize(13).text(title, MARGIN + 14, titleY + 8, { width: CONTENT_W - 20, align: "center" });

  let nextY = titleY + 38;
  if (subtitle) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(subtitle, MARGIN, nextY, { width: CONTENT_W, align: "center" });
    nextY += 14;
  }
  doc.y = nextY + 4;
  return doc.y;
}

function sectionTitle(doc: PDFKit.PDFDocument, label: string): void {
  doc.moveDown(0.4);
  const y = doc.y;
  doc.rect(MARGIN, y, CONTENT_W, 18).fill(PRIMARY);
  doc.rect(MARGIN, y, 3, 18).fill(GOLD);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8).text(label.toUpperCase(), MARGIN + 10, y + 5, { width: CONTENT_W - 20 });
  doc.y = y + 22;
}

function infoGrid(doc: PDFKit.PDFDocument, fields: [string, string | null | undefined][], cols: number = 2): void {
  const colW = CONTENT_W / cols;
  let col = 0;
  let rowY = doc.y + 2;
  for (let i = 0; i < fields.length; i++) {
    const [label, value] = fields[i];
    const x = MARGIN + col * colW;
    doc.fillColor(MUTED).font("Helvetica").fontSize(7.5).text(label, x + 4, rowY, { width: colW * 0.42 - 4 });
    doc.fillColor(TEXT_DARK).font("Helvetica-Bold").fontSize(8.5).text(value || "—", x + colW * 0.44, rowY, { width: colW * 0.54 - 4, lineBreak: false });
    col++;
    if (col >= cols) { col = 0; rowY += 16; }
  }
  if (col > 0) rowY += 16;
  doc.y = rowY + 2;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  widths: number[],
  rows: string[][],
  x: number = MARGIN
): void {
  const HEADER_H = 20;
  const ROW_H = 18;
  const totalW = widths.reduce((a, b) => a + b, 0);
  let y = doc.y;

  if (y + HEADER_H + rows.length * ROW_H > 790) {
    doc.addPage();
    y = MARGIN;
  }

  doc.rect(x, y, totalW, HEADER_H).fill(PRIMARY);
  let cx = x;
  for (let i = 0; i < headers.length; i++) {
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5)
      .text(headers[i], cx + 4, y + 6, { width: widths[i] - 8, lineBreak: false });
    cx += widths[i];
  }

  let ry = y + HEADER_H;
  for (let r = 0; r < rows.length; r++) {
    if (ry + ROW_H > 800) {
      doc.addPage();
      ry = MARGIN;
      doc.rect(x, ry, totalW, HEADER_H).fill(PRIMARY);
      cx = x;
      for (let i = 0; i < headers.length; i++) {
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5)
          .text(headers[i], cx + 4, ry + 6, { width: widths[i] - 8, lineBreak: false });
        cx += widths[i];
      }
      ry += HEADER_H;
    }
    doc.rect(x, ry, totalW, ROW_H).fill(r % 2 === 0 ? LIGHT_BG : "#ffffff");
    doc.rect(x, ry, totalW, ROW_H).stroke("#e5e7eb").lineWidth(0.3);
    cx = x;
    for (let c = 0; c < rows[r].length; c++) {
      doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(7.5)
        .text(rows[r][c] ?? "—", cx + 4, ry + 5, { width: widths[c] - 8, lineBreak: false });
      cx += widths[c];
    }
    ry += ROW_H;
  }
  doc.y = ry + 6;
}

function drawFooter(doc: PDFKit.PDFDocument, signataires: string[] = ["Le Secrétaire Général", "Le Trésorier"]): void {
  const PAGE_H = 841.89;
  const footerY = PAGE_H - 90;
  doc.rect(0, footerY - 5, PAGE_W, 1).fill("#e5e7eb");

  const colW = CONTENT_W / signataires.length;
  for (let i = 0; i < signataires.length; i++) {
    const x = MARGIN + i * colW;
    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(signataires[i], x, footerY, { width: colW, align: "center" });
    doc.rect(x + colW * 0.1, footerY + 30, colW * 0.8, 1).fill("#9ca3af");
    doc.fillColor(MUTED).font("Helvetica").fontSize(7).text("Signature et cachet", x, footerY + 36, { width: colW, align: "center" });
  }

  doc.fillColor(MUTED).font("Helvetica").fontSize(7)
    .text(`Abidjan, le ${new Date().toLocaleDateString("fr-FR")}  •  MUGETRA-NPG.CI  •  Document confidentiel`, 0, PAGE_H - 20, { align: "center", width: PAGE_W });
}

router.get("/pdf/membres/:id/fiche-adhesion", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }

  const [m] = await db.select().from(membresTable).where(eq(membresTable.id, id));
  if (!m) { res.status(404).json({ error: "Membre introuvable" }); return; }

  const personnes = await db.select().from(personnesDeclareeesTable).where(eq(personnesDeclareeesTable.membreId, id));
  const cotisations = await db.select().from(cotisationsTable).where(eq(cotisationsTable.membreId, id));

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="fiche-adhesion-${m.matricule}.pdf"`);
  doc.pipe(res);

  drawHeader(doc, "FICHE D'ADHÉSION",
    `N° Matricule : ${m.matricule}  •  Date d'adhésion : ${fdate(m.dateAdhesion)}`);

  sectionTitle(doc, "Informations personnelles");
  infoGrid(doc, [
    ["Nom", m.nom],
    ["Prénom", m.prenom],
    ["Matricule", m.matricule],
    ["Statut", capitalize(m.statut ?? "")],
    ["Type d'adhésion", m.typeAdhesion?.replace(/_/g, " ") ?? ""],
    ["Date d'adhésion", fdate(m.dateAdhesion)],
    ["Date de naissance", fdate(m.dateNaissance)],
    ["Situation familiale", m.situationFamiliale ?? ""],
    ["Email", m.email ?? ""],
    ["Téléphone", m.telephone ?? ""],
  ], 2);

  sectionTitle(doc, "Informations professionnelles");
  infoGrid(doc, [
    ["Poste", m.poste ?? ""],
    ["Département", m.departement ?? ""],
    ["Date d'embauche", fdate(m.dateEmbauche)],
    ["Date CDI", fdate(m.dateCdi)],
    ["Retraite complémentaire", m.retraiteComplementaire ? "Oui" : "Non"],
    ["Renonciation assistances", m.renonciationAssistances ? "Oui" : "Non"],
    ["Permis de conduire", m.permisConduire === true ? "Oui" : m.permisConduire === false ? "Non" : "—"],
    ["Cotisation mensuelle", "7 500 FCFA"],
  ], 2);

  if (personnes.length > 0) {
    sectionTitle(doc, "Personnes déclarées");
    drawTable(doc,
      ["Lien de parenté", "Nom", "Prénom", "Date de naissance"],
      [130, 130, 130, 115],
      personnes.map(p => [LIEN_LABELS[p.lienParente] ?? p.lienParente, p.nom ?? "", p.prenom ?? "", fdate(p.dateNaissance)])
    );
  }

  sectionTitle(doc, "Engagement du membre");
  doc.moveDown(0.4);
  doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(8.5).text(
    `Je soussigné(e), ${m.prenom} ${m.nom}, matricule ${m.matricule}, déclare adhérer librement à la Mutuelle Générale des Travailleurs de la Nouvelle Parfumerie Gandour CI (MUGETRA-NPG.CI) et m'engage à :`,
    MARGIN + 5, doc.y, { width: CONTENT_W - 10, lineGap: 2 }
  );
  doc.moveDown(0.3);
  const engagements = [
    "Respecter les statuts et le règlement intérieur de la mutuelle en vigueur,",
    "Payer régulièrement ma cotisation mensuelle de 7 500 FCFA,",
    "Signaler tout changement de situation personnelle ou professionnelle,",
    "Respecter les décisions prises par les organes de la mutuelle.",
  ];
  for (const e of engagements) {
    doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(8).text(`• ${e}`, MARGIN + 12, doc.y, { width: CONTENT_W - 20, lineGap: 1.5 });
    doc.moveDown(0.2);
  }
  doc.moveDown(0.4);

  doc.fillColor(MUTED).font("Helvetica").fontSize(7.5).text(
    "Fait à Abidjan, le ______________________________",
    MARGIN + 5, doc.y, { width: CONTENT_W - 10 }
  );
  doc.moveDown(1.2);

  drawFooter(doc, ["Le Membre", "Le Secrétaire Général", "Le Trésorier"]);
  doc.end();
});

router.get("/pdf/cotisations/:membreId", requireAuth, async (req, res): Promise<void> => {
  const membreId = parseInt(req.params.membreId as string);
  const annee = req.query.annee ? parseInt(req.query.annee as string) : null;
  if (isNaN(membreId)) { res.status(400).json({ error: "ID invalide" }); return; }

  const [m] = await db.select().from(membresTable).where(eq(membresTable.id, membreId));
  if (!m) { res.status(404).json({ error: "Membre introuvable" }); return; }

  let query = db.select().from(cotisationsTable).where(eq(cotisationsTable.membreId, membreId))
    .orderBy(asc(cotisationsTable.annee), asc(cotisationsTable.mois));
  const all = await query;
  const cotisations = annee ? all.filter(c => c.annee === annee) : all;

  const totalPaye = cotisations.reduce((s, c) => s + c.montant, 0);
  const moisPaies = cotisations.length;
  const dateAdhesion = new Date(m.dateAdhesion);
  const now = new Date();
  const moisTotal = (now.getFullYear() - dateAdhesion.getFullYear()) * 12 + (now.getMonth() - dateAdhesion.getMonth());
  const arrieres = Math.max(0, moisTotal - moisPaies) * 7500;

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="releve-cotisations-${m.matricule}${annee ? `-${annee}` : ""}.pdf"`);
  doc.pipe(res);

  const subtitle = annee
    ? `Période : Année ${annee}  •  Matricule : ${m.matricule}`
    : `Toutes périodes  •  Matricule : ${m.matricule}`;
  drawHeader(doc, "RELEVÉ DE COTISATIONS", subtitle);

  sectionTitle(doc, "Informations du membre");
  infoGrid(doc, [
    ["Nom & Prénom", `${m.prenom} ${m.nom}`],
    ["Matricule", m.matricule],
    ["Type d'adhésion", m.typeAdhesion?.replace(/_/g, " ") ?? ""],
    ["Date d'adhésion", fdate(m.dateAdhesion)],
    ["Statut", capitalize(m.statut ?? "")],
    ["Poste", m.poste ?? ""],
  ], 2);

  sectionTitle(doc, "Détail des cotisations");
  if (cotisations.length === 0) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("Aucune cotisation enregistrée pour cette période.", MARGIN + 5, doc.y + 5);
    doc.moveDown(0.5);
  } else {
    drawTable(doc,
      ["Mois", "Année", "Montant", "Date règlement", "Mode"],
      [110, 58, 100, 120, 117],
      cotisations.map(c => [
        MOIS_FR[(c.mois ?? 1) - 1],
        String(c.annee),
        ffcfa(c.montant),
        fshort(c.datePaiement),
        (c.modePaiement ?? "especes").replace(/_/g, " "),
      ])
    );
  }

  sectionTitle(doc, "Synthèse");
  const summY = doc.y + 4;
  doc.rect(MARGIN, summY, CONTENT_W / 3 - 5, 36).fill(LIGHT_BG);
  doc.rect(MARGIN + CONTENT_W / 3 + 2, summY, CONTENT_W / 3 - 5, 36).fill(LIGHT_BG);
  doc.rect(MARGIN + (CONTENT_W / 3) * 2 + 4, summY, CONTENT_W / 3 - 5, 36).fill(arrieres > 0 ? "#fef2f2" : LIGHT_BG);

  doc.fillColor(MUTED).font("Helvetica").fontSize(7.5).text("Total cotisé", MARGIN + 5, summY + 5, { width: CONTENT_W / 3 - 15, align: "center" });
  doc.fillColor(PRIMARY).font("Helvetica-Bold").fontSize(10).text(ffcfa(totalPaye), MARGIN + 5, summY + 17, { width: CONTENT_W / 3 - 15, align: "center" });

  doc.fillColor(MUTED).font("Helvetica").fontSize(7.5).text("Mois réglés", MARGIN + CONTENT_W / 3 + 7, summY + 5, { width: CONTENT_W / 3 - 15, align: "center" });
  doc.fillColor(PRIMARY).font("Helvetica-Bold").fontSize(10).text(String(moisPaies), MARGIN + CONTENT_W / 3 + 7, summY + 17, { width: CONTENT_W / 3 - 15, align: "center" });

  const ariereColor = arrieres > 0 ? "#dc2626" : PRIMARY;
  doc.fillColor(MUTED).font("Helvetica").fontSize(7.5).text("Arriérés", MARGIN + (CONTENT_W / 3) * 2 + 9, summY + 5, { width: CONTENT_W / 3 - 15, align: "center" });
  doc.fillColor(ariereColor).font("Helvetica-Bold").fontSize(10).text(ffcfa(arrieres), MARGIN + (CONTENT_W / 3) * 2 + 9, summY + 17, { width: CONTENT_W / 3 - 15, align: "center" });

  doc.y = summY + 46;

  drawFooter(doc, ["Le Trésorier", "Le Secrétaire Général"]);
  doc.end();
});

router.get("/pdf/assistances/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }

  const [a] = await db.select().from(assistancesTable).where(eq(assistancesTable.id, id));
  if (!a) { res.status(404).json({ error: "Assistance introuvable" }); return; }

  const [m] = await db.select().from(membresTable).where(eq(membresTable.id, a.membreId));
  const validations = await db.select().from(assistanceValidationsTable)
    .where(eq(assistanceValidationsTable.assistanceId, id))
    .orderBy(asc(assistanceValidationsTable.createdAt));
  const users = await db.select().from(usersTable);
  const userMap = Object.fromEntries(users.map(u => [u.id, `${u.prenom} ${u.nom}`]));

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="demande-assistance-${id}.pdf"`);
  doc.pipe(res);

  const refStr = `Réf. ASS-${String(id).padStart(4, "0")}  •  ${fdate(a.createdAt?.toString())}`;
  drawHeader(doc, "DEMANDE D'ASSISTANCE SOCIALE", refStr);

  sectionTitle(doc, "Informations du demandeur");
  infoGrid(doc, [
    ["Nom & Prénom", m ? `${m.prenom} ${m.nom}` : ""],
    ["Matricule", m?.matricule ?? ""],
    ["Type d'adhésion", m?.typeAdhesion?.replace(/_/g, " ") ?? ""],
    ["Statut", capitalize(m?.statut ?? "")],
    ["Poste", m?.poste ?? ""],
    ["Date adhésion", fdate(m?.dateAdhesion)],
  ], 2);

  sectionTitle(doc, "Détails de la demande");
  infoGrid(doc, [
    ["Type d'assistance", TYPE_LABELS[a.type] ?? a.type],
    ["Statut actuel", STATUT_LABELS[a.statut] ?? a.statut],
    ["Date de l'événement", fdate(a.dateEvenement)],
    ["Montant demandé", ffcfa(a.montant)],
    ["Bénéficiaire", a.beneficiaireNom ?? ""],
    ["Lien de parenté", LIEN_LABELS[a.beneficiaireRelation ?? ""] ?? a.beneficiaireRelation ?? ""],
  ], 2);

  if (a.description) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(7.5).text("Notes :", MARGIN + 4, doc.y + 2);
    doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(8).text(a.description, MARGIN + 4, doc.y + 2, { width: CONTENT_W - 8, lineGap: 1 });
    doc.moveDown(0.3);
  }

  if (a.commentaireRejet) {
    doc.rect(MARGIN, doc.y, CONTENT_W, 22).fill("#fef2f2");
    doc.fillColor("#dc2626").font("Helvetica-Bold").fontSize(8).text(`Motif de rejet : ${a.commentaireRejet}`, MARGIN + 6, doc.y + 7, { width: CONTENT_W - 12 });
    doc.y += 28;
  }

  if (validations.length > 0) {
    sectionTitle(doc, "Historique des validations");
    drawTable(doc,
      ["Étape", "Décision", "Validé par", "Date"],
      [145, 85, 145, 130],
      validations.map(v => [
        STATUT_LABELS[v.etape ?? ""] ?? v.etape ?? "—",
        v.decision === "approuver" ? "✓ Approuvé" : "✗ Rejeté",
        userMap[v.validePar ?? 0] ?? "Inconnu",
        fshort(v.createdAt?.toString()),
      ])
    );
  }

  const finalStatut = STATUT_LABELS[a.statut] ?? a.statut;
  sectionTitle(doc, "Conclusion");
  doc.rect(MARGIN, doc.y + 2, CONTENT_W, 26).fill(
    a.statut === "approuvee" || a.statut === "payee" ? "#dcfce7" :
    a.statut === "rejetee" ? "#fef2f2" : LIGHT_BG
  );
  const conclusionColor = a.statut === "approuvee" || a.statut === "payee" ? "#16a34a" :
    a.statut === "rejetee" ? "#dc2626" : PRIMARY;
  doc.fillColor(conclusionColor).font("Helvetica-Bold").fontSize(10)
    .text(`Statut de la demande : ${finalStatut}`, MARGIN + 10, doc.y + 10, { width: CONTENT_W - 20, align: "center" });
  doc.y += 36;

  drawFooter(doc, ["Le Demandeur", "Commission Affaires Sociales", "Le Trésorier"]);
  doc.end();
});

router.get("/pdf/assistances/:id/bon-decaissement", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }

  const [a] = await db.select().from(assistancesTable).where(eq(assistancesTable.id, id));
  if (!a) { res.status(404).json({ error: "Assistance introuvable" }); return; }

  if (a.statut !== "approuvee" && a.statut !== "payee") {
    res.status(400).json({ error: "Le bon de décaissement n'est disponible que pour les demandes approuvées ou payées." });
    return;
  }

  const [m] = await db.select().from(membresTable).where(eq(membresTable.id, a.membreId));
  const validations = await db.select().from(assistanceValidationsTable)
    .where(eq(assistanceValidationsTable.assistanceId, id))
    .orderBy(desc(assistanceValidationsTable.createdAt));
  const users = await db.select().from(usersTable);
  const userMap = Object.fromEntries(users.map(u => [u.id, `${u.prenom} ${u.nom}`]));

  const numBon = `BON-${String(id).padStart(5, "0")}-${new Date().getFullYear()}`;

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="bon-decaissement-${numBon}.pdf"`);
  doc.pipe(res);

  drawHeader(doc, "BON DE DÉCAISSEMENT",
    `N° ${numBon}  •  Réf. ASS-${String(id).padStart(4, "0")}  •  Émis le ${new Date().toLocaleDateString("fr-FR")}`);

  // Alert box - approved
  const alertY = doc.y + 2;
  doc.rect(MARGIN, alertY, CONTENT_W, 28).fill("#dcfce7");
  doc.rect(MARGIN, alertY, 5, 28).fill("#16a34a");
  doc.fillColor("#15803d").font("Helvetica-Bold").fontSize(10)
    .text("✓  DEMANDE APPROUVÉE — AUTORISATION DE PAIEMENT ACCORDÉE", MARGIN + 14, alertY + 9, { width: CONTENT_W - 24 });
  doc.y = alertY + 36;

  sectionTitle(doc, "Bénéficiaire");
  infoGrid(doc, [
    ["Nom & Prénom", m ? `${m.prenom} ${m.nom}` : ""],
    ["Matricule", m?.matricule ?? ""],
    ["Poste", m?.poste ?? ""],
    ["Département", m?.departement ?? ""],
  ], 2);

  sectionTitle(doc, "Détails de l'assistance");
  infoGrid(doc, [
    ["Type d'assistance", TYPE_LABELS[a.type] ?? a.type],
    ["Date de l'événement", fdate(a.dateEvenement)],
    ["Bénéficiaire du paiement", a.beneficiaireNom || (m ? `${m.prenom} ${m.nom}` : "")],
    ["Lien de parenté", LIEN_LABELS[a.beneficiaireRelation ?? ""] ?? (a.beneficiaireRelation ?? "—")],
  ], 2);

  // Montant box
  sectionTitle(doc, "Montant à décaisser");
  const mntY = doc.y + 4;
  doc.rect(MARGIN, mntY, CONTENT_W, 48).fill(LIGHT_BG);
  doc.rect(MARGIN, mntY, 6, 48).fill(GOLD);
  doc.fillColor(MUTED).font("Helvetica").fontSize(8).text("Montant approuvé", MARGIN + 20, mntY + 8);
  doc.fillColor(PRIMARY).font("Helvetica-Bold").fontSize(22)
    .text(ffcfa(a.montant), MARGIN + 20, mntY + 18, { width: CONTENT_W - 40 });
  doc.y = mntY + 58;

  if (validations.length > 0) {
    sectionTitle(doc, "Validations obtenues");
    drawTable(doc,
      ["Étape", "Décision", "Validé par", "Date"],
      [145, 85, 145, 130],
      validations.map(v => [
        STATUT_LABELS[v.etape ?? ""] ?? v.etape ?? "—",
        v.decision === "approuver" ? "✓ Approuvé" : "✗ Rejeté",
        userMap[v.validePar ?? 0] ?? "—",
        fshort(v.createdAt?.toString()),
      ])
    );
  }

  // Statut payé
  if (a.statut === "payee") {
    const payY = doc.y + 4;
    doc.rect(MARGIN, payY, CONTENT_W, 24).fill("#eff6ff");
    doc.fillColor("#1d4ed8").font("Helvetica-Bold").fontSize(9)
      .text("✓  PAIEMENT EFFECTUÉ", MARGIN + 10, payY + 7, { width: CONTENT_W - 20, align: "center" });
    doc.y = payY + 32;
  }

  drawFooter(doc, ["Le Demandeur", "Commission compétente", "Le Trésorier", "Le S.G."]);
  doc.end();
});

export default router;
