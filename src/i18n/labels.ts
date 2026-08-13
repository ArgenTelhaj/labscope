import type { LabInterpretation, ProposalNotice } from '../domain/types'
import type { ResultStatus } from '../domain/value'
import { DEFAULT_LOCALE, type Locale } from './locale'

/**
 * Every piece of text the interface says, in one place (vision §10).
 *
 * A label has a **main value** — the source text, written in English — and one
 * entry per translation. A missing translation falls back to the main value, so
 * a half-finished language is a partly-English screen rather than a blank one.
 *
 * Two conventions the renderer understands:
 *  - `{name}` is replaced by the matching variable passed to `t()`.
 *  - `[[emphasis]]` marks the stretch of a sentence that is set apart visually
 *    (the terracotta phrase in a headline, the bold word in a banner). It is
 *    written inline rather than split across three labels so a translator can
 *    move it: Albanian does not put the emphasis where English does.
 *
 * A label whose value is `{ one, other }` is chosen by the `count` variable.
 * Both English and Albanian are one/other languages; a language that is not
 * would need its own selector here, not a new label.
 *
 * Nothing in here is clinical text read off a report — analyte names, panel
 * headings, units and lab names are printed exactly as the report printed them
 * and are never translated (vision §4.5).
 */

/** A count-sensitive value. `one` is used when `count === 1`. */
export type PluralText = { one: string; other: string }
export type LabelText = string | PluralText

/**
 * One label: the main value plus one optional entry per translated locale.
 * `'en'` is the main value itself, which is why it is not a key here.
 */
export type Label = { value: LabelText } & {
  [L in Exclude<Locale, typeof DEFAULT_LOCALE>]?: LabelText
}

/** The text of a label in one locale, falling back to the main value. */
export function textFor(label: Label, locale: Locale): LabelText {
  if (locale === DEFAULT_LOCALE) return label.value
  return label[locale] ?? label.value
}

export const LABELS = {
  /* ------------------------------------------------------------ chrome --- */

  'app.name': { value: 'LabScope', sq: 'LabScope' },
  'app.nav.aria': { value: 'Main', sq: 'Kryesore' },
  'app.sidebar.foot': {
    value:
      'Your reports are stored in this browser. Nothing is uploaded, and results are shown as your laboratory reported them.',
    sq: 'Raportet tuaja ruhen në këtë shfletues. Asgjë nuk ngarkohet dhe rezultatet shfaqen ashtu siç i raportoi laboratori juaj.',
  },
  'app.language.aria': { value: 'Language', sq: 'Gjuha' },

  'nav.results': { value: 'Results', sq: 'Rezultatet' },
  'nav.reports': { value: 'Reports', sq: 'Raportet' },
  'nav.add': { value: 'Add a report', sq: 'Shto një raport' },

  'title.results': { value: 'LabScope', sq: 'LabScope' },
  'title.reports': { value: 'Reports', sq: 'Raportet' },
  'title.add': { value: 'Add a report', sq: 'Shto një raport' },
  'title.review': { value: 'Check before saving', sq: 'Kontrolloje para se ta ruash' },
  'title.series': { value: 'Result', sq: 'Rezultat' },
  'title.report': { value: 'Report', sq: 'Raport' },

  'action.back': { value: 'Back', sq: 'Kthehu' },
  'action.add-report': { value: 'Add a report', sq: 'Shto një raport' },

  'gone.series': {
    value: 'This value is no longer in your record.',
    sq: 'Kjo vlerë nuk është më në të dhënat tuaja.',
  },
  'gone.report': {
    value: 'This report is no longer in your record.',
    sq: 'Ky raport nuk është më në të dhënat tuaja.',
  },

  /* ------------------------------------------------------------ status --- */

  'status.long.within': { value: 'Within the lab’s range', sq: 'Brenda intervalit të laboratorit' },
  'status.long.outside': { value: 'Outside the lab’s range', sq: 'Jashtë intervalit të laboratorit' },
  'status.long.critical': {
    value: 'Flagged critical by the lab',
    sq: 'Shënuar si kritike nga laboratori',
  },
  'status.long.unknown': { value: 'No range on the report', sq: 'Pa interval në raport' },

  'status.short.within': { value: 'In range', sq: 'Brenda intervalit' },
  'status.short.outside': { value: 'Out of range', sq: 'Jashtë intervalit' },
  'status.short.critical': { value: 'Critical', sq: 'Kritike' },
  'status.short.unknown': { value: 'No range', sq: 'Pa interval' },

  'interpretation.H': { value: 'High (lab flag)', sq: 'E lartë (shenjë e laboratorit)' },
  'interpretation.L': { value: 'Low (lab flag)', sq: 'E ulët (shenjë e laboratorit)' },
  'interpretation.HH': {
    value: 'Critically high (lab flag)',
    sq: 'Kritikisht e lartë (shenjë e laboratorit)',
  },
  'interpretation.LL': {
    value: 'Critically low (lab flag)',
    sq: 'Kritikisht e ulët (shenjë e laboratorit)',
  },
  'interpretation.N': { value: 'Normal (lab flag)', sq: 'Normale (shenjë e laboratorit)' },

  /* ------------------------------------------------------------- chips --- */

  'chip.lab-missing': { value: 'Lab not recorded', sq: 'Laboratori nuk u regjistrua' },
  'chip.typed-in': { value: 'typed in', sq: 'shkruar me dorë' },
  'chip.check-this': { value: 'Check this', sq: 'Kontrolloje këtë' },

  /* ------------------------------------------------------------ common --- */

  'common.date-not-set': { value: 'Date not set', sq: 'Data nuk është vendosur' },
  'common.other-results': { value: 'Other results', sq: 'Rezultate të tjera' },
  'common.lab-range': { value: 'Lab’s range {range}', sq: 'Intervali i laboratorit {range}' },
  'common.no-range-printed': {
    value: 'The report printed no range',
    sq: 'Raporti nuk shtypi asnjë interval',
  },
  'common.typed-by-hand': { value: 'typed in by hand', sq: 'shkruar me dorë' },

  /* ------------------------------------------------------- add / intake --- */

  'add.reading.title': { value: 'Reading the report', sq: 'Po lexohet raporti' },
  'add.reading.note': { value: 'This happens on your device.', sq: 'Kjo ndodh në pajisjen tuaj.' },
  'add.drop.title': { value: 'Upload a lab report', sq: 'Ngarko një raport laboratorik' },
  'add.drop.hint': {
    value: 'PDF. Drop it here or tap to choose.',
    sq: 'PDF. Lëshoje këtu ose prek për ta zgjedhur.',
  },
  'add.error.unreadable': {
    value: 'That file could not be opened. It may be password-protected or damaged.',
    sq: 'Ky skedar nuk mund të hapej. Mund të jetë i mbrojtur me fjalëkalim ose i dëmtuar.',
  },
  'notice.needs-ocr': {
    value:
      'Photos and images need OCR, which this build does not do on-device. The file is recorded as the source — enter the values from it by hand.',
    sq: 'Fotot dhe imazhet kërkojnë OCR, të cilin ky version nuk e bën në pajisje. Skedari regjistrohet si burim — shkruaji vlerat prej tij me dorë.',
  },
  'notice.no-text-layer': {
    value:
      'This PDF has no text layer — it is most likely a scan or a photo. Nothing was read from it. Enter the values by hand and keep the file as the source.',
    sq: 'Ky PDF nuk ka shtresë teksti — ka shumë gjasa të jetë skanim ose fotografi. Prej tij nuk u lexua asgjë. Shkruaji vlerat me dorë dhe mbaje skedarin si burim.',
  },
  'notice.no-results-found': {
    value:
      'Text was read from this PDF, but no lines looked like results. Enter the values by hand and keep the file as the source.',
    sq: 'Nga ky PDF u lexua tekst, por asnjë rresht nuk dukej si rezultat. Shkruaji vlerat me dorë dhe mbaje skedarin si burim.',
  },
  'add.manual': { value: 'Enter results by hand', sq: 'Shkruaj rezultatet me dorë' },
  'add.banner': {
    value:
      'Whatever is read from your report is a [[proposal]]. You confirm every value against the original before it is saved — and the reference ranges come from your report, never from a general table.',
    sq: 'Çdo gjë që lexohet nga raporti juaj është një [[propozim]]. Ju e konfirmoni çdo vlerë përballë origjinalit para se të ruhet — dhe intervalet referuese vijnë nga raporti juaj, kurrë nga një tabelë e përgjithshme.',
  },
  'add.footnote': {
    value:
      'Your reports stay in this browser. Nothing is uploaded, and LabScope does not interpret results — it shows what your lab reported.',
    sq: 'Raportet tuaja qëndrojnë në këtë shfletues. Asgjë nuk ngarkohet dhe LabScope nuk i interpreton rezultatet — ai tregon atë që raportoi laboratori juaj.',
  },

  /* ----------------------------------------------------------- results --- */

  'results.kicker': {
    value: { one: '{count} report · latest {date}', other: '{count} reports · latest {date}' },
    sq: { one: '{count} raport · i fundit {date}', other: '{count} raporte · i fundit {date}' },
  },
  'results.headline.calm': {
    value: 'Everything is [[where your lab said]] it should be.',
    sq: 'Gjithçka është [[aty ku tha laboratori juaj]] se duhet të jetë.',
  },
  'results.headline.watch': {
    value: {
      one: '{count} value [[worth a look.]]',
      other: '{count} values [[worth a look.]]',
    },
    sq: {
      one: '{count} vlerë [[që meriton një vështrim.]]',
      other: '{count} vlera [[që meritojnë një vështrim.]]',
    },
  },
  'results.lede.calm': {
    value:
      'None of your latest values sit outside the range printed on the report they came from.',
    sq: 'Asnjë nga vlerat tuaja të fundit nuk qëndron jashtë intervalit të shtypur në raportin nga i cili erdhi.',
  },
  'results.lede.watch': {
    value:
      'The rest of your latest values sit inside the range printed on the report they came from. LabScope shows where they landed — what it means is a conversation with a clinician.',
    sq: 'Pjesa tjetër e vlerave tuaja të fundit qëndron brenda intervalit të shtypur në raportin nga i cili erdhi. LabScope tregon ku ranë — se çfarë do të thotë kjo është bisedë me një mjek.',
  },
  'results.open-panel': { value: 'Open {label}', sq: 'Hap {label}' },
  'results.stat.values': {
    value: { one: 'value tracked', other: 'values tracked' },
    sq: { one: 'vlerë e ndjekur', other: 'vlera të ndjekura' },
  },
  'results.stat.panels': {
    value: { one: 'panel', other: 'panels' },
    sq: { one: 'panel', other: 'panele' },
  },
  'results.stat.flagged': {
    value: 'outside the lab’s range',
    sq: 'jashtë intervalit të laboratorit',
  },
  'results.callout.to-check': {
    value: { one: '{count} panel to check', other: '{count} panels to check' },
    sq: { one: '{count} panel për t’u kontrolluar', other: '{count} panele për t’u kontrolluar' },
  },
  'results.callout.in-range': { value: '{count} in range', sq: '{count} brenda intervalit' },
  'results.section.panels': {
    value: 'Panels, as your reports grouped them',
    sq: 'Panelet, ashtu siç i grupuan raportet tuaja',
  },
  'results.footnote': {
    value:
      'Panels are the section headings printed on your own reports — LabScope does not sort results into groups of its own. Values are grouped by the name printed on the report, so two labs that print the same test differently show as two entries.',
    sq: 'Panelet janë titujt e seksioneve të shtypur në raportet tuaja — LabScope nuk i rendit rezultatet në grupe të vetat. Vlerat grupohen sipas emrit të shtypur në raport, kështu që dy laboratorë që e shtypin të njëjtin test ndryshe shfaqen si dy zëra.',
  },
  'results.empty.kicker': { value: 'Nothing here yet', sq: 'Ende asgjë këtu' },
  'results.empty.headline': {
    value: 'Your results, [[as your lab printed them.]]',
    sq: 'Rezultatet tuaja, [[ashtu siç i shtypi laboratori juaj.]]',
  },
  'results.empty.lede': {
    value:
      'Add a report and its values appear here, each one against the reference range from that report — never a range borrowed from somewhere else.',
    sq: 'Shto një raport dhe vlerat e tij shfaqen këtu, secila përballë intervalit referues nga ai raport — kurrë një interval i huazuar nga diku tjetër.',
  },
  'results.empty.art': { value: 'all results', sq: 'të gjitha rezultatet' },

  /* ------------------------------------------------------------ panels --- */

  'panel.count': {
    value: { one: '{count} value', other: '{count} values' },
    sq: { one: '{count} vlerë', other: '{count} vlera' },
  },
  'panel.tag.calm': { value: 'All in range', sq: 'Të gjitha brenda intervalit' },
  'panel.tag.critical': {
    value: '{flagged} flagged, {rest} in range',
    sq: '{flagged} të shënuara, {rest} brenda intervalit',
  },
  'panel.tag.watch': { value: '{count} watching', sq: '{count} nën vëzhgim' },
  'panel.strip.aria': { value: '{count} {status}', sq: '{count} {status}' },
  'panel.all': { value: 'All panels', sq: 'Të gjitha panelet' },
  'panel.results-count': {
    value: { one: '{count} result', other: '{count} results' },
    sq: { one: '{count} rezultat', other: '{count} rezultate' },
  },
  'panel.unlabelled.footnote': {
    value:
      'These values had no section heading on the report they came from. Add one on the review screen and they move into a panel of their own.',
    sq: 'Këto vlera nuk kishin titull seksioni në raportin nga i cili erdhën. Shtoje një në ekranin e kontrollit dhe ato kalojnë në një panel të vetin.',
  },

  /* ----------------------------------------------------------- reports --- */

  'reports.empty.title': { value: 'No reports yet', sq: 'Ende asnjë raport' },
  'reports.empty.body': {
    value: 'Every value LabScope shows comes from a report you added, and links back to it.',
    sq: 'Çdo vlerë që shfaq LabScope vjen nga një raport që keni shtuar dhe lidhet mbrapsht me të.',
  },
  'reports.meta.values': {
    value: { one: '{count} value', other: '{count} values' },
    sq: { one: '{count} vlerë', other: '{count} vlera' },
  },
  'reports.footnote': {
    value: 'Sorted by collection date — when the sample was taken.',
    sq: 'Renditur sipas datës së marrjes — kur u mor kampioni.',
  },

  'report.fasting': { value: 'Fasting', sq: 'Esëll' },
  'report.not-fasting': { value: 'Not fasting', sq: 'Jo esëll' },
  'report.reported-on': { value: 'Reported {date}', sq: 'Raportuar më {date}' },
  'report.read-from': { value: 'Read from {name}', sq: 'Lexuar nga {name}' },
  'report.entered-by-hand': {
    value: 'Entered by hand — no source document',
    sq: 'Futur me dorë — pa dokument burimor',
  },
  'report.confirmed-on': { value: 'confirmed {date}', sq: 'konfirmuar më {date}' },
  'report.no-range': {
    value: 'No range printed on this report',
    sq: 'Në këtë raport nuk është shtypur asnjë interval',
  },
  'report.delete': {
    value: 'Delete this report and its values',
    sq: 'Fshi këtë raport dhe vlerat e tij',
  },
  'report.delete.footnote': {
    value: 'Deleting removes the report and everything read from it from this browser.',
    sq: 'Fshirja heq nga ky shfletues raportin dhe gjithçka të lexuar prej tij.',
  },

  /* ----------------------------------------------------------- analyte --- */

  'analyte.qualifier': { value: 'Range applies to: {qualifier}', sq: 'Intervali vlen për: {qualifier}' },
  'analyte.censored': {
    value:
      'Reported as “{value}” — the exact value is beyond what the assay measures, so the marker is drawn hollow rather than at a precise point.',
    sq: 'Raportuar si “{value}” — vlera e saktë është përtej asaj që mat analiza, prandaj shenja vizatohet bosh dhe jo në një pikë të përpiktë.',
  },
  'analyte.over-time': { value: 'Over time', sq: 'Me kalimin e kohës' },
  'analyte.not-plotted': {
    value: {
      one: '{count} result is reported as above or below a limit, or not as a number, and is not plotted. It is listed below.',
      other:
        '{count} results are reported as above or below a limit, or not as a number, and are not plotted. They are listed below.',
    },
    sq: {
      one: '{count} rezultat është raportuar si mbi ose nën një kufi, ose jo si numër, dhe nuk vizatohet. Është renditur më poshtë.',
      other:
        '{count} rezultate janë raportuar si mbi ose nën një kufi, ose jo si numër, dhe nuk vizatohen. Janë renditur më poshtë.',
    },
  },
  'analyte.unchanged': {
    value: 'Unchanged since the previous result.',
    sq: 'E pandryshuar që nga rezultati i mëparshëm.',
  },
  'analyte.delta.up': { value: 'Up {delta} since {date}.', sq: 'Rritur me {delta} që nga {date}.' },
  'analyte.delta.down': { value: 'Down {delta} since {date}.', sq: 'Ulur me {delta} që nga {date}.' },
  'analyte.two-points': {
    value: 'Two results are not a trend. A chart appears from the third result.',
    sq: 'Dy rezultate nuk janë prirje. Grafiku shfaqet nga rezultati i tretë.',
  },
  'analyte.one-point': {
    value: 'One result so far. Add another report and the movement appears here.',
    sq: 'Deri tani një rezultat. Shto një raport tjetër dhe lëvizja shfaqet këtu.',
  },
  'analyte.labs-differ': {
    value:
      'These results come from {count} different laboratories ({labs}). Different labs can use different methods and different reference ranges, so the values are not always directly comparable.',
    sq: 'Këto rezultate vijnë nga {count} laboratorë të ndryshëm ({labs}). Laboratorë të ndryshëm mund të përdorin metoda të ndryshme dhe intervale referuese të ndryshme, prandaj vlerat nuk janë gjithmonë drejtpërdrejt të krahasueshme.',
  },
  'analyte.units-differ': {
    value:
      'The unit changes across this history ({units}). Values are shown exactly as reported — LabScope does not convert them silently.',
    sq: 'Njësia ndryshon gjatë kësaj historie ({units}). Vlerat shfaqen saktësisht siç janë raportuar — LabScope nuk i konverton ato në heshtje.',
  },
  'analyte.every-result': { value: 'Every result', sq: 'Çdo rezultat' },
  'analyte.no-range-short': { value: 'No range printed', sq: 'Pa interval të shtypur' },
  'analyte.printed-as': { value: 'Printed as “{label}”', sq: 'E shtypur si “{label}”' },
  'analyte.page': { value: 'page {page}', sq: 'faqja {page}' },
  'analyte.footnote': {
    value:
      'LabScope shows what your laboratory reported, including its own flags and ranges. It does not interpret results. Talk to a clinician about what they mean.',
    sq: 'LabScope tregon atë që raportoi laboratori juaj, përfshirë shenjat dhe intervalet e tij. Ai nuk i interpreton rezultatet. Flisni me një mjek se çfarë do të thonë.',
  },

  /* ------------------------------------------------------------ charts --- */

  'chart.aria': {
    value: '{label} over time, {count} results',
    sq: '{label} me kalimin e kohës, {count} rezultate',
  },
  'chart.new-lab': { value: 'new lab', sq: 'laborator i ri' },
  'chart.legend.reported': { value: 'As reported', sq: 'Siç u raportua' },
  'chart.legend.band': { value: 'Range printed by the lab', sq: 'Intervali i shtypur nga laboratori' },
  'band.aria.between': {
    value: '{value} against the lab’s reported range of {low} to {high}',
    sq: '{value} përballë intervalit të raportuar nga laboratori nga {low} deri {high}',
  },
  'band.aria.up-to': {
    value: '{value} against the lab’s reported range of up to {high}',
    sq: '{value} përballë intervalit të raportuar nga laboratori deri në {high}',
  },
  'band.aria.from': {
    value: '{value} against the lab’s reported range of from {low}',
    sq: '{value} përballë intervalit të raportuar nga laboratori prej {low}',
  },

  /* ------------------------------------------------------------ review --- */

  'review.this-report': { value: 'This report', sq: 'Ky raport' },
  'review.collected.label': {
    value: 'Collection date — the date the sample was taken',
    sq: 'Data e marrjes — data kur u mor kampioni',
  },
  'review.collected.hint': {
    value:
      'Not the date you uploaded it. Everything is placed on this date, so it is worth checking against the report.',
    sq: 'Jo data kur e ngarkuat. Gjithçka vendoset në këtë datë, prandaj ia vlen ta kontrolloni përballë raportit.',
  },
  'review.reported.label': { value: 'Report date', sq: 'Data e raportit' },
  'review.fasting.label': { value: 'Fasting', sq: 'Esëll' },
  'review.fasting.unstated': { value: 'Not stated', sq: 'E pathënë' },
  'review.fasting.yes': { value: 'Fasting', sq: 'Esëll' },
  'review.fasting.no': { value: 'Not fasting', sq: 'Jo esëll' },
  'review.lab.label': { value: 'Performing laboratory', sq: 'Laboratori kryerës' },
  'review.lab.placeholder': {
    value: 'As printed on the report',
    sq: 'Siç është shtypur në raport',
  },
  'review.source-document': { value: 'Source document: {name}', sq: 'Dokumenti burimor: {name}' },
  'review.to-save': {
    value: { one: '{count} value to save', other: '{count} values to save' },
    sq: { one: '{count} vlerë për t’u ruajtur', other: '{count} vlera për t’u ruajtur' },
  },
  'review.to-check': { value: '{count} to check', sq: '{count} për t’u kontrolluar' },
  'review.nothing-yet': { value: 'Nothing to review yet.', sq: 'Ende asgjë për të kontrolluar.' },
  'review.save-this': { value: 'Save this', sq: 'Ruaje këtë' },
  'review.skipped': { value: 'Skipped', sq: 'E anashkaluar' },
  'review.remove-row': { value: 'Remove this row', sq: 'Hiq këtë rresht' },
  'review.field.name': { value: 'Test name', sq: 'Emri i testit' },
  'review.field.name.placeholder': {
    value: 'Test name, exactly as printed',
    sq: 'Emri i testit, saktësisht siç është shtypur',
  },
  'review.field.panel': { value: 'Section heading', sq: 'Titulli i seksionit' },
  'review.field.panel.aria': {
    value: 'Section heading printed above this test',
    sq: 'Titulli i seksionit i shtypur mbi këtë test',
  },
  'review.field.value': { value: 'Value', sq: 'Vlera' },
  'review.field.unit': { value: 'Unit', sq: 'Njësia' },
  'review.field.flag.aria': {
    value: 'Flag printed by the lab',
    sq: 'Shenja e shtypur nga laboratori',
  },
  'review.field.flag.none': { value: 'No flag', sq: 'Pa shenjë' },
  'review.field.range-low': { value: 'Range low', sq: 'Kufiri i poshtëm' },
  'review.field.range-low.aria': {
    value: 'Reference range low, as printed',
    sq: 'Kufiri i poshtëm i intervalit referues, siç është shtypur',
  },
  'review.field.range-high': { value: 'Range high', sq: 'Kufiri i sipërm' },
  'review.field.range-high.aria': {
    value: 'Reference range high, as printed',
    sq: 'Kufiri i sipërm i intervalit referues, siç është shtypur',
  },
  'review.field.qualifier.placeholder': { value: 'e.g. adult male', sq: 'p.sh. burrë i rritur' },
  'review.field.qualifier.aria': {
    value: 'Range qualifier, as printed',
    sq: 'Kushtëzimi i intervalit, siç është shtypur',
  },
  'review.source-line': {
    value: 'The line this was read from',
    sq: 'Rreshti nga i cili u lexua kjo',
  },
  'review.add-value': { value: 'Add another value', sq: 'Shto një vlerë tjetër' },
  'review.footnote': {
    value:
      'Values and ranges are saved exactly as you confirm them here, alongside the line they were read from. If your report printed no reference range, leave the range blank — LabScope will say so rather than substitute one. The section heading is only used to group results the way your report grouped them; leave it blank and the value sits under “Other results”.',
    sq: 'Vlerat dhe intervalet ruhen saktësisht ashtu siç i konfirmoni këtu, bashkë me rreshtin nga i cili u lexuan. Nëse raporti juaj nuk shtypi asnjë interval referues, lëreni intervalin bosh — LabScope do ta thotë këtë në vend që të zëvendësojë një të tijin. Titulli i seksionit përdoret vetëm për t’i grupuar rezultatet ashtu siç i grupoi raporti juaj; lëreni bosh dhe vlera qëndron nën “Rezultate të tjera”.',
  },
  'review.discard': { value: 'Discard', sq: 'Hidhe' },
  'review.save': {
    value: { one: 'Save {count} value', other: 'Save {count} values' },
    sq: { one: 'Ruaj {count} vlerë', other: 'Ruaj {count} vlera' },
  },
  'review.cannot-save': {
    value: 'A collection date and at least one value with a name are needed before saving.',
    sq: 'Duhen një datë marrjeje dhe të paktën një vlerë me emër para se të ruani.',
  },
} as const satisfies Record<string, Label>

export type LabelKey = keyof typeof LABELS

/** Ingestion emits a notice code; this is what it is called on screen. */
export const NOTICE_KEY: Record<ProposalNotice, LabelKey> = {
  'no-text-layer': 'notice.no-text-layer',
  'no-results-found': 'notice.no-results-found',
  'needs-ocr': 'notice.needs-ocr',
}

/* -------------------------------------------------------- domain bridges --- */

/**
 * The domain derives a status; the label for it lives here. Keeping the mapping
 * on this side is what keeps `src/domain` free of interface text.
 */
export const STATUS_LONG_KEY: Record<ResultStatus, LabelKey> = {
  within: 'status.long.within',
  outside: 'status.long.outside',
  critical: 'status.long.critical',
  unknown: 'status.long.unknown',
}

export const STATUS_SHORT_KEY: Record<ResultStatus, LabelKey> = {
  within: 'status.short.within',
  outside: 'status.short.outside',
  critical: 'status.short.critical',
  unknown: 'status.short.unknown',
}

export const INTERPRETATION_KEY: Record<LabInterpretation, LabelKey> = {
  H: 'interpretation.H',
  L: 'interpretation.L',
  HH: 'interpretation.HH',
  LL: 'interpretation.LL',
  N: 'interpretation.N',
}
