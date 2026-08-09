/**
 * Client-side export of the Commission Ledger to Excel (.xlsx) and PDF.
 * Same libraries/pattern as exportClients.js (SheetJS + jsPDF/autotable,
 * loaded via CDN in index.html).
 */

const EXPORT_COLUMNS = [
    { header: 'Insured Name', key: 'insuredLabel' },
    { header: 'Insurance Company', key: 'insuranceCompany' },
    { header: 'Policy No', key: 'policyNo' },
    { header: 'Annual Premium (AED)', key: 'annualPremium' },
    { header: 'Comm Rate (%)', key: 'commRate' },
    { header: 'Total Commission (AED)', key: 'totalCommission' },
    { header: 'Agent Commission (AED)', key: 'agentCommission' },
];

/**
 * @param {object[]} rows - ledger rows, each already carrying an insuredLabel
 * @returns {object[]}
 */
function buildRows(rows) {
    return rows.map((r) => {
        const row = {};
        EXPORT_COLUMNS.forEach(({ header, key }) => {
            const value = r[key];
            row[header] = value === null || value === undefined ? '' : value;
        });
        return row;
    });
}

/**
 * Downloads the given ledger rows as an .xlsx file.
 * @param {object[]} rows
 */
export function exportCommissionsToExcel(rows) {
    if (!window.XLSX) {
        alert('Excel export library failed to load. Please check your connection and try again.');
        return;
    }

    const sheetRows = buildRows(rows);
    const worksheet = window.XLSX.utils.json_to_sheet(sheetRows);
    worksheet['!cols'] = EXPORT_COLUMNS.map(() => ({ wch: 20 }));

    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Commission Ledger');

    const fileName = `commission-ledger-${todayStamp()}.xlsx`;
    window.XLSX.writeFile(workbook, fileName);
}

/**
 * Downloads the given ledger rows as a PDF table.
 * @param {object[]} rows
 */
export function exportCommissionsToPdf(rows) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('PDF export library failed to load. Please check your connection and try again.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(14);
    doc.text('Commission Ledger', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Exported ${new Date().toLocaleDateString()}`, 14, 21);

    const head = [EXPORT_COLUMNS.map((c) => c.header)];
    const body = rows.map((r) =>
        EXPORT_COLUMNS.map(({ key }) => {
            const value = r[key];
            if (value === null || value === undefined) return '';
            return typeof value === 'number' ? value.toLocaleString() : value;
        })
    );

    doc.autoTable({
        head,
        body,
        startY: 26,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [13, 148, 136] },
    });

    const fileName = `commission-ledger-${todayStamp()}.pdf`;
    doc.save(fileName);
}

function todayStamp() {
    return new Date().toISOString().split('T')[0];
}