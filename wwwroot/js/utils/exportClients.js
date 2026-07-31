/**
 * Client-side export of the Clients Pipeline list to Excel (.xlsx) and PDF.
 * Both libraries (SheetJS, jsPDF + autotable) are loaded via CDN in index.html
 * and attach themselves to the global window object — no build step needed.
 */

const EXPORT_COLUMNS = [
    { header: 'Insured Name', key: 'insuredName' },
    { header: 'Insurance Company', key: 'insuranceCompany' },
    { header: 'Product', key: 'productName' },
    { header: 'Policy No', key: 'policyNo' },
    { header: 'Mode of Payment', key: 'modeOfPayment' },
    { header: 'Annual Premium (AED)', key: 'annualPremium' },
    { header: 'Total Premium (AED)', key: 'totalPremium' },
    { header: 'Collected (AED)', key: 'collectedPremium' },
    { header: 'Balance (AED)', key: 'balance' },
    { header: 'Comm Rate (%)', key: 'commRate' },
    { header: 'Agent Commission (AED)', key: 'agentCommission' },
];

/**
 * @param {object[]} clients
 * @returns {object[]} rows shaped for export, with nulls converted to blanks
 */
function buildRows(clients) {
    return clients.map((c) => {
        const row = {};
        EXPORT_COLUMNS.forEach(({ header, key }) => {
            const value = c[key];
            row[header] = value === null || value === undefined ? '' : value;
        });
        return row;
    });
}

/**
 * Downloads the given client list as an .xlsx file.
 * @param {object[]} clients
 */
export function exportClientsToExcel(clients) {
    if (!window.XLSX) {
        alert('Excel export library failed to load. Please check your connection and try again.');
        return;
    }

    const rows = buildRows(clients);
    const worksheet = window.XLSX.utils.json_to_sheet(rows);

    // Reasonable column widths so the file doesn't open with everything squeezed
    worksheet['!cols'] = EXPORT_COLUMNS.map(() => ({ wch: 20 }));

    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

    const fileName = `clients-export-${todayStamp()}.xlsx`;
    window.XLSX.writeFile(workbook, fileName);
}

/**
 * Downloads the given client list as a PDF table.
 * @param {object[]} clients
 */
export function exportClientsToPdf(clients) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('PDF export library failed to load. Please check your connection and try again.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(14);
    doc.text('Client Policies', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Exported ${new Date().toLocaleDateString()}`, 14, 21);

    const head = [EXPORT_COLUMNS.map((c) => c.header)];
    const body = clients.map((c) =>
        EXPORT_COLUMNS.map(({ key }) => {
            const value = c[key];
            if (value === null || value === undefined) return '';
            return typeof value === 'number' ? value.toLocaleString() : value;
        })
    );

    doc.autoTable({
        head,
        body,
        startY: 26,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [13, 148, 136] }, // matches --color-primary teal
    });

    const fileName = `clients-export-${todayStamp()}.pdf`;
    doc.save(fileName);
}

function todayStamp() {
    return new Date().toISOString().split('T')[0]; // "2026-07-31"
}