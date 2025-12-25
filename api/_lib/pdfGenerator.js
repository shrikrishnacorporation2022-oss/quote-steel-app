const PDFDocument = require('pdfkit');

const generateQuotePDF = (quote) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 40,
                size: 'A4'
            });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Helper function for safe number formatting
            const formatCurrency = (value) => {
                const num = parseFloat(value) || 0;
                return `Rs. ${num.toFixed(2)}`;
            };
            const formatNumber = (value, decimals = 2) => {
                const num = parseFloat(value) || 0;
                return num.toFixed(decimals);
            };

            // Colors
            const primaryColor = '#4F46E5'; // Indigo
            const secondaryColor = '#64748b'; // Slate
            const accentColor = '#10B981'; // Emerald

            // === HEADER ===
            doc.rect(0, 0, 612, 100).fill(primaryColor);

            doc.fillColor('#FFFFFF')
                .fontSize(28)
                .font('Helvetica-Bold')
                .text('QUOTATION', 50, 30, { align: 'center' });

            doc.fontSize(10)
                .font('Helvetica')
                .text(`Quote #${quote.quoteNo || 'N/A'}`, 50, 70, { align: 'center' })
                .text(`Date: ${new Date(quote.date || Date.now()).toLocaleDateString('en-IN')}`, 50, 85, { align: 'center' });

            // === CUSTOMER INFO ===
            let y = 130;
            doc.fillColor(primaryColor)
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('BILL TO:', 50, y);

            y += 20;
            doc.fillColor(secondaryColor)
                .fontSize(10)
                .font('Helvetica')
                .text(quote.customerName || 'N/A', 50, y);

            if (quote.customerCompany) {
                y += 15;
                doc.text(quote.customerCompany, 50, y);
            }

            if (quote.customerPhone) {
                y += 15;
                doc.text(`Phone: ${quote.customerPhone}`, 50, y);
            }

            if (quote.customerEmail) {
                y += 15;
                doc.text(`Email: ${quote.customerEmail}`, 50, y);
            }

            if (quote.customerAddress) {
                y += 15;
                doc.text(`Address: ${quote.customerAddress}`, 50, y, { width: 500 });
            }

            // === ITEMS TABLE ===
            const tableTop = Math.max(y + 40, 260);
            y = tableTop;

            // Table header background
            doc.rect(40, y - 5, 532, 25).fill('#F1F5F9');

            // Table headers
            doc.fillColor(primaryColor)
                .fontSize(10)
                .font('Helvetica-Bold')
                .text('S.No', 45, y + 5)
                .text('Item', 85, y + 5)
                .text('Size', 200, y + 5)
                .text('Qty', 260, y + 5)
                .text('Unit', 320, y + 5)
                .text('Price/Unit', 380, y + 5)
                .text('Amount', 490, y + 5, { width: 70, align: 'right' });

            // Header border
            doc.moveTo(40, y + 20).lineTo(572, y + 20).stroke('#CBD5E1');

            // Table rows
            y += 30;
            doc.font('Helvetica').fontSize(9).fillColor(secondaryColor);

            const items = quote.items || [];
            items.forEach((item, index) => {
                // Alternate row background
                if (index % 2 === 0) {
                    doc.rect(40, y - 3, 532, 18).fill('#F8FAFC');
                }

                const isInventory = item.brand === 'Other';
                const itemName = isInventory ? item.product : (item.brand || 'TMT Bar');
                const itemPrice = isInventory
                    ? `${formatCurrency(item.pricePerRod)}/${item.inputUnit}`
                    : (item.pricePerKg ? formatCurrency(item.pricePerKg) + '/kg' : formatCurrency(item.pricePerRod) + '/rod');

                doc.fillColor(secondaryColor)
                    .text(index + 1, 45, y)
                    .text(itemName, 85, y, { width: 110 })
                    .text(item.size || '-', 200, y)
                    .text(formatNumber(item.inputQty), 260, y)
                    .text(item.inputUnit || 'kg', 320, y)
                    .text(itemPrice, 380, y, { width: 100 })
                    .text(formatCurrency(item.amount), 490, y, { width: 70, align: 'right' });

                y += 20;

                // Page break if needed
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
            });

            // Bottom border of table
            doc.moveTo(40, y).lineTo(572, y).stroke('#CBD5E1');
            y += 20;

            // === NOTES ===
            if (quote.notes) {
                y += 10;
                doc.fillColor(primaryColor)
                    .fontSize(10)
                    .font('Helvetica-Bold')
                    .text('Notes:', 50, y);
                y += 15;
                doc.fillColor(secondaryColor)
                    .fontSize(9)
                    .font('Helvetica')
                    .text(quote.notes, 50, y, { width: 350 });
                y += 40;
            }

            // === TOTALS SECTION ===
            const totalsX = 360;
            let totalsY = y + 20;

            const totalWeight = quote.items.reduce((sum, item) => {
                if (item.brand === 'Other') {
                    return item.inputUnit === 'kg' ? sum + (parseFloat(item.inputQty) || 0) : sum;
                }
                return sum + (item.convertedKg || 0);
            }, 0);

            // Taxable vs Non-taxable charges logic
            const isTaxable = quote.additionalChargesTaxable || quote.transportTaxable || quote.loadingTaxable;
            const transport = (quote.transportCharges || 0);
            const loading = (quote.loadingUnloadingCharges || 0);
            const gstOnCharges = isTaxable ? (transport + loading) * 0.18 : 0;

            const subtotalAfterDiscount = (quote.subtotal || 0) - (quote.onlineDiscountAmount || 0) - (quote.offlineDiscountAmount || 0);
            const totalWithGstCharges = subtotalAfterDiscount + (isTaxable ? (transport + loading + gstOnCharges) : 0);
            const hasNonTaxableCharges = !isTaxable && (transport > 0 || loading > 0);

            // Calculate box height based on content
            let boxHeight = 80;
            if (quote.onlineDiscountAmount > 0) boxHeight += 20;
            if (quote.offlineDiscountAmount > 0) boxHeight += 20;
            if (quote.steelSubtotal && quote.steelSubtotal !== quote.subtotal) boxHeight += 20;
            if (isTaxable && transport > 0) boxHeight += 20;
            if (isTaxable && loading > 0) boxHeight += 20;
            if (isTaxable && gstOnCharges > 0) boxHeight += 20;
            boxHeight += 20; // For Total Weight
            boxHeight += 30; // For Total (Tax Inclusive) box extra room
            if (hasNonTaxableCharges) {
                if (transport > 0) boxHeight += 20;
                if (loading > 0) boxHeight += 20;
                boxHeight += 30; // For Grand Total
            }

            // Totals background box
            doc.rect(totalsX - 10, totalsY - 10, 212, boxHeight).fill('#F8FAFC').stroke('#E2E8F0');

            doc.fillColor(secondaryColor)
                .fontSize(10)
                .font('Helvetica');

            // Total Weight
            doc.text('Total Weight:', totalsX, totalsY)
                .text(`${totalWeight.toFixed(2)} kg`, totalsX + 110, totalsY, { width: 90, align: 'right' });
            totalsY += 20;

            // Steel Subtotal
            if (quote.steelSubtotal && quote.steelSubtotal !== quote.subtotal) {
                doc.text('Steel Total:', totalsX, totalsY)
                    .text(formatCurrency(quote.steelSubtotal), totalsX + 110, totalsY, { width: 90, align: 'right' });
                totalsY += 20;
            }

            // Subtotal
            doc.text('Subtotal:', totalsX, totalsY)
                .text(formatCurrency(quote.subtotal), totalsX + 110, totalsY, { width: 90, align: 'right' });
            totalsY += 20;

            // Online Discount
            if (quote.onlineDiscountAmount > 0) {
                doc.fillColor('#DC2626')
                    .text(`Online Disc (${quote.onlineDiscountPercent}%):`, totalsX, totalsY)
                    .text(`-${formatCurrency(quote.onlineDiscountAmount)}`, totalsX + 110, totalsY, { width: 90, align: 'right' });
                totalsY += 20;
            }

            // Offline Discount
            if (quote.offlineDiscountAmount > 0) {
                doc.fillColor('#DC2626')
                    .text(`Offline Disc (${quote.offlineDiscountPercent}%):`, totalsX, totalsY)
                    .text(`-${formatCurrency(quote.offlineDiscountAmount)}`, totalsX + 110, totalsY, { width: 90, align: 'right' });
                totalsY += 20;
            }

            // Taxable additional charges
            if (isTaxable) {
                doc.fillColor(secondaryColor);
                if (transport > 0) {
                    doc.text('Transport (Base):', totalsX, totalsY)
                        .text(`+${formatCurrency(transport)}`, totalsX + 110, totalsY, { width: 90, align: 'right' });
                    totalsY += 20;
                }
                if (loading > 0) {
                    doc.text('Loading (Base):', totalsX, totalsY)
                        .text(`+${formatCurrency(loading)}`, totalsX + 110, totalsY, { width: 90, align: 'right' });
                    totalsY += 20;
                }
                if (gstOnCharges > 0) {
                    doc.fillColor(accentColor).font('Helvetica-Bold')
                        .text('GST (18% on Charges):', totalsX, totalsY)
                        .text(`+${formatCurrency(gstOnCharges)}`, totalsX + 110, totalsY, { width: 90, align: 'right' });
                    totalsY += 20;
                    doc.font('Helvetica');
                }
            }

            // Total (Tax Inclusive)
            doc.rect(totalsX - 10, totalsY - 5, 212, 25).fill(accentColor);
            doc.fillColor('#FFFFFF')
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('Total (Tax Inclusive):', totalsX, totalsY)
                .text(formatCurrency(totalWithGstCharges), totalsX + 110, totalsY, { width: 90, align: 'right' });

            totalsY += 35;

            if (hasNonTaxableCharges) {
                doc.fontSize(10).font('Helvetica').fillColor(secondaryColor);
                if (transport > 0) {
                    doc.text('Transport (Non-taxable):', totalsX, totalsY)
                        .text(`+${formatCurrency(transport)}`, totalsX + 110, totalsY, { width: 90, align: 'right' });
                    totalsY += 20;
                }
                if (loading > 0) {
                    doc.text('Loading (Non-taxable):', totalsX, totalsY)
                        .text(`+${formatCurrency(loading)}`, totalsX + 110, totalsY, { width: 90, align: 'right' });
                    totalsY += 20;
                }

                // Grand Total
                doc.rect(totalsX - 10, totalsY - 5, 212, 25).fill(primaryColor);
                doc.fillColor('#FFFFFF')
                    .fontSize(12)
                    .font('Helvetica-Bold')
                    .text('Grand Total:', totalsX, totalsY)
                    .text(formatCurrency(quote.total), totalsX + 110, totalsY, { width: 90, align: 'right' });
            }

            // === FOOTER ===
            const footerY = 750;
            doc.moveTo(50, footerY).lineTo(562, footerY).stroke('#E2E8F0');

            doc.fillColor(secondaryColor)
                .fontSize(8)
                .font('Helvetica')
                .text('Terms & Conditions:', 50, footerY + 10)
                .fontSize(7)
                .text('• Payment terms: As agreed', 50, footerY + 23)
                .text('• Delivery: Subject to availability', 50, footerY + 33)
                .text('• All prices are tax inclusive', 50, footerY + 43);

            doc.fontSize(8)
                .text('Thank you for your business!', 320, footerY + 10, { align: 'center', width: 242 });

            doc.end();
        } catch (err) {
            console.error('PDF Generation Error:', err);
            reject(err);
        }
    });
};

module.exports = { generateQuotePDF };
