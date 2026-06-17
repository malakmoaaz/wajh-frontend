import { jsPDF } from 'jspdf';

// ============================================================
// PDFReportService - Surgical Simulation PDF Report Generator
// ============================================================
// Generates a professional clinical-style PDF summary after
// simulation, embedding the outcome image and all adjustments.

const COLORS = {
    primary: [14, 165, 233],   // Sky blue
    dark: [12, 15, 21],     // Near black bg
    darkAlt: [21, 25, 34],     // Panel bg
    border: [40, 48, 64],     // Border
    text: [220, 230, 245],  // Main text
    muted: [100, 120, 150],  // Muted text
    success: [34, 197, 94],    // Green
    warning: [245, 158, 11],   // Amber
    danger: [239, 68, 68],    // Red
    white: [255, 255, 255],
    headerBg: [8, 10, 18],
};

/**
 * Generate and auto-download a PDF clinical report.
 *
 * @param {Object} params
 * @param {ImageBitmap|HTMLImageElement} params.simulationResult - Outcome image
 * @param {HTMLImageElement}              params.originalImage    - Original patient image
 * @param {Array}                         params.initialLandmarks - Unmodified landmarks
 * @param {Array}                         params.currentPoints    - Modified landmarks
 * @param {Object}                        params.calibrationData  - {ratio, method, confidence}
 * @param {number}                        params.simulationConfidence - e.g. 82
 * @param {string}                        params.procedureLabel   - Selected procedure name
 */
export async function generateReport({
    simulationResult,
    originalImage,
    initialLandmarks,
    currentPoints,
    calibrationData,
    simulationConfidence,
    procedureLabel = 'Procedure Simulation',
}) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();   // 210 mm
    const H = doc.internal.pageSize.getHeight();  // 297 mm
    const MARGIN = 14;
    const CONTENT_W = W - MARGIN * 2;
    let y = 0; // current Y cursor

    // ─── Helpers ───────────────────────────────────────────────
    const rgb = (c) => ({ r: c[0], g: c[1], b: c[2] });

    const setFill = (c) => doc.setFillColor(c[0], c[1], c[2]);
    const setStroke = (c) => doc.setDrawColor(c[0], c[1], c[2]);
    const setTextColor = (c) => doc.setTextColor(c[0], c[1], c[2]);

    const text = (str, x, yPos, opts = {}) => {
        doc.text(str, x, yPos, { align: 'left', baseline: 'top', ...opts });
    };

    // ─── Page background ───────────────────────────────────────
    setFill(COLORS.dark);
    doc.rect(0, 0, W, H, 'F');

    // ─── Header Banner ─────────────────────────────────────────
    const HEADER_H = 28;
    // Gradient-like effect using two overlapping rects
    setFill(COLORS.headerBg);
    doc.rect(0, 0, W, HEADER_H, 'F');
    // Accent bar
    setFill(COLORS.primary);
    doc.rect(0, HEADER_H - 2, W, 2, 'F');

    // Logo / App name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    setTextColor(COLORS.white);
    text('WAJH', MARGIN, 8);
    // Subtitle beside logo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setTextColor(COLORS.muted);
    text('Maxillofacial Surgical Planning System', MARGIN, 18);

    // Date on right
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    doc.setFontSize(8);
    setTextColor(COLORS.muted);
    text(`Generated: ${dateStr}  ${timeStr}`, W - MARGIN, 10, { align: 'right' });

    // Report title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setTextColor(COLORS.primary);
    text('SURGICAL SIMULATION REPORT', W - MARGIN, 18, { align: 'right' });

    y = HEADER_H + 8;

    // ─── Section helper ────────────────────────────────────────
    const sectionTitle = (title) => {
        setFill(COLORS.darkAlt);
        doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        setTextColor(COLORS.primary);
        text(title, MARGIN + 3, y + 1.5);
        y += 9;
    };

    // ─── Simulation Metadata strip ─────────────────────────────
    const metaBoxH = 18;
    setFill(COLORS.darkAlt);
    setStroke(COLORS.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, metaBoxH, 2, 2, 'FD');

    const metaCols = [
        { label: 'Procedure', value: procedureLabel },
        { label: 'Calibration Method', value: calibrationData?.method?.toUpperCase() ?? 'N/A' },
        { label: 'Scale Accuracy', value: calibrationData?.confidence ?? 'Medium' },
        { label: 'Prediction Confidence', value: `${simulationConfidence ?? '--'}%` },
        { label: 'Report Date', value: dateStr },
    ];

    const colW = CONTENT_W / metaCols.length;
    metaCols.forEach((col, i) => {
        const cx = MARGIN + i * colW + colW / 2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        setTextColor(COLORS.muted);
        text(col.label, cx, y + 3, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        // Color confidence value
        if (col.label === 'Prediction Confidence') {
            const conf = simulationConfidence ?? 0;
            setTextColor(conf >= 80 ? COLORS.success : conf >= 65 ? COLORS.warning : COLORS.danger);
        } else {
            setTextColor(COLORS.text);
        }
        text(col.value, cx, y + 9, { align: 'center' });
    });
    y += metaBoxH + 8;

    // ─── Simulated Outcome Image ────────────────────────────────
    sectionTitle('SIMULATED OUTCOME');

    // Convert simulationResult (ImageBitmap) to base64
    let imgData = null;
    try {
        const tmpCanvas = document.createElement('canvas');
        const src = simulationResult ?? originalImage;
        tmpCanvas.width = src.width;
        tmpCanvas.height = src.height;
        tmpCanvas.getContext('2d').drawImage(src, 0, 0);
        imgData = tmpCanvas.toDataURL('image/jpeg', 0.92);
    } catch (err) {
        console.warn('PDF: could not encode image', err);
    }

    if (imgData) {
        const srcW = (simulationResult ?? originalImage).width;
        const srcH = (simulationResult ?? originalImage).height;
        const naturalAspect = srcW / srcH; // > 1 landscape, < 1 portrait

        // Fit within a max box, preserving aspect ratio
        const MAX_W = CONTENT_W;
        const MAX_H = 110;
        let imgW, imgH;
        if (MAX_W / naturalAspect <= MAX_H) {
            // Width-constrained
            imgW = MAX_W;
            imgH = MAX_W / naturalAspect;
        } else {
            // Height-constrained
            imgH = MAX_H;
            imgW = MAX_H * naturalAspect;
        }

        // Center image horizontally
        const imgX = MARGIN + (CONTENT_W - imgW) / 2;

        setStroke(COLORS.border);
        doc.setLineWidth(0.3);
        doc.rect(imgX, y, imgW, imgH, 'S');
        doc.addImage(imgData, 'JPEG', imgX, y, imgW, imgH);
        y += imgH + 8;
    } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        setTextColor(COLORS.muted);
        text('[Image unavailable]', MARGIN, y);
        y += 10;
    }

    // ─── Landmark Adjustments Table ────────────────────────────
    sectionTitle('LANDMARK ADJUSTMENTS');

    // Compute adjustments
    const ratio = calibrationData?.ratio ?? 1;
    const adjustments = currentPoints
        .map((pt, idx) => {
            if (idx >= initialLandmarks.length) return null;
            const orig = initialLandmarks[idx];
            const dx = (pt.x - orig.x) * ratio;
            const dy = (pt.y - orig.y) * ratio;
            const total = Math.sqrt(dx * dx + dy * dy);
            return { name: pt.name || pt.id, dx, dy, total };
        })
        .filter(Boolean)
        .filter(a => a.total > 0.2); // Only show meaningfully changed points

    if (adjustments.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        setTextColor(COLORS.muted);
        text('No landmark adjustments detected.', MARGIN, y);
        y += 10;
    } else {
        // Table header
        const cols = [
            { label: 'Landmark', w: 60 },
            { label: 'Δ Horizontal (mm)', w: 40 },
            { label: 'Δ Vertical (mm)', w: 40 },
            { label: 'Total Δ (mm)', w: 40 },
        ];
        const ROW_H = 6;
        const TABLE_W = CONTENT_W;

        // Header row
        setFill(COLORS.primary);
        doc.rect(MARGIN, y, TABLE_W, ROW_H, 'F');
        let cx = MARGIN;
        cols.forEach(col => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            setTextColor(COLORS.white);
            text(col.label, cx + 2, y + 1.5);
            cx += col.w;
        });
        y += ROW_H;

        // Data rows — check page overflow and add new page if needed
        adjustments.forEach((adj, rowIdx) => {
            // Page overflow check
            if (y + ROW_H > H - 20) {
                doc.addPage();
                setFill(COLORS.dark);
                doc.rect(0, 0, W, H, 'F');
                y = MARGIN;
            }

            const isEven = rowIdx % 2 === 0;
            setFill(isEven ? COLORS.darkAlt : COLORS.dark);
            doc.rect(MARGIN, y, TABLE_W, ROW_H, 'F');

            // Subtle row border
            setStroke(COLORS.border);
            doc.setLineWidth(0.1);
            doc.line(MARGIN, y + ROW_H, MARGIN + TABLE_W, y + ROW_H);

            const rowValues = [
                adj.name,
                `${adj.dx >= 0 ? '+' : ''}${adj.dx.toFixed(2)} ${adj.dx > 0.1 ? 'R' : adj.dx < -0.1 ? 'L' : ''}`,
                `${adj.dy >= 0 ? '+' : ''}${adj.dy.toFixed(2)} ${adj.dy > 0.1 ? 'Inf' : adj.dy < -0.1 ? 'Sup' : ''}`,
                adj.total.toFixed(2),
            ];

            cx = MARGIN;
            rowValues.forEach((val, i) => {
                doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
                doc.setFontSize(7);
                // Color-code the total column
                if (i === 3) {
                    const t = parseFloat(val);
                    setTextColor(t > 7 ? COLORS.danger : t > 3 ? COLORS.warning : COLORS.success);
                } else {
                    setTextColor(i === 0 ? COLORS.text : COLORS.muted);
                }
                text(val, cx + 2, y + 1.5);
                cx += cols[i].w;
            });
            y += ROW_H;
        });

        // Summary row
        const totalMoved = adjustments.length;
        const avgDelta = adjustments.reduce((s, a) => s + a.total, 0) / totalMoved;
        y += 3;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        setTextColor(COLORS.muted);
        text(`${totalMoved} landmark(s) modified  ·  Average displacement: ${avgDelta.toFixed(2)} mm`, MARGIN, y);
        y += 8;
    }

    // ─── Footer ─────────────────────────────────────────────────
    // Always at the bottom of the last page
    const footerY = H - 12;
    setFill(COLORS.border);
    doc.rect(MARGIN, footerY - 3, CONTENT_W, 0.3, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    setTextColor(COLORS.muted);
    text(
        'Results are probabilistic estimates and must be reviewed by a qualified clinician.',
        MARGIN, footerY, { maxWidth: CONTENT_W }
    );

    // ─── Save ───────────────────────────────────────────────────
    const fileName = `WAJH_Report_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`;
    doc.save(fileName);
}
