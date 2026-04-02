import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    
    const type = formData.get('type') as string || 'Invoice';
    const companyName = formData.get('companyName') as string || '';
    const address = formData.get('address') as string || '';
    const postcode = formData.get('postcode') as string || '';
    const telephone = formData.get('telephone') as string || '';
    const email = formData.get('email') as string || '';
    const toName = formData.get('toName') as string || '';
    const toAddress = formData.get('toAddress') as string || '';
    const toCity = formData.get('toCity') as string || '';
    const toPostcode = formData.get('toPostcode') as string || '';
    
    // Parse the text fields from JSON stringified arrays
    let messageLines: string[] = [];
    let payInfoLines: string[] = [];
    let termsLines: string[] = [];
    
    try {
      const messageRaw = formData.get('message') as string || '[""]';
      messageLines = JSON.parse(messageRaw);
      
      const payInfoRaw = formData.get('payInfo') as string || '[""]';
      payInfoLines = JSON.parse(payInfoRaw);
      
      const termsRaw = formData.get('terms') as string || '[""]';
      termsLines = JSON.parse(termsRaw);
    } catch (error) {
      console.error('Error parsing text fields:', error);
      // Fallback to empty arrays if parsing fails
      messageLines = [];
      payInfoLines = [];
      termsLines = [];
    }
    
    const currency = formData.get('currency') as string || '$';
    const date = formData.get('date') as string || new Date().toLocaleDateString();
    const billingMode = formData.get('billingMode') as string || 'unit'; // Get billing mode
    
    // Parse items from form data
    const rawItems = JSON.parse(formData.get('items') as string || '[]');
    const items: InvoiceItem[] = rawItems.map((item: InvoiceItem) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return {
        description: item.description || '',
        quantity,
        unitPrice,
        total: quantity * unitPrice
      };
    });
    
    // Calculate totals
    const subtotal = items.reduce((sum: number, item: InvoiceItem) => sum + item.total, 0);
    const tax = Number(formData.get('tax')) || 0;
    const discount = Number(formData.get('discount')) || 0;
    const taxAmount = (subtotal * tax) / 100;
    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal + taxAmount - discountAmount;

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.276, 841.890]); // A4 size
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();

    // Colors
    type RGB = [number, number, number];
    const primaryColor: RGB  = [0.12, 0.36, 0.72];
    const secondaryColor: RGB = [0.88, 0.88, 0.88];
    const textColor: RGB     = [0.15, 0.15, 0.15];
    const labelColor: RGB    = [0.45, 0.45, 0.45];
    const rowAccent: RGB     = [0.96, 0.97, 0.99];

    // Helper functions
    const addText = (text: string, x: number, y: number, options: { 
      size?: number;
      font?: typeof helvetica | typeof helveticaBold;
      color?: RGB;
      align?: 'left' | 'right' | 'center';
      width?: number;
    } = {}) => {
      const { 
        size = 10, 
        font = helvetica, 
        color = textColor,
        align = 'left',
        width: textWidth
      } = options;

      // Basic sanitization to prevent encoding issues
      const safeText = text
        .replace(/\r/g, '') // Remove carriage returns (0x00d)
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .replace(/\t/g, ' '); // Replace tabs with spaces

      let xPos = x;
      if (align === 'right' && textWidth) {
        const textSize = font.widthOfTextAtSize(safeText, size);
        xPos = x + textWidth - textSize;
      } else if (align === 'center' && textWidth) {
        const textSize = font.widthOfTextAtSize(safeText, size);
        xPos = x + (textWidth - textSize) / 2;
      }

      try {
        page.drawText(safeText, { 
          x: xPos, 
          y, 
          size, 
          font,
          color: rgb(color[0], color[1], color[2])
        });
      } catch (error) {
        console.error('Error drawing text:', error);
      }
    };

    const drawLine = (x1: number, y1: number, x2: number, y2: number, options: {
      width?: number;
      color?: RGB;
      dash?: number[];
    } = {}) => {
      const { width = 1, color = secondaryColor, dash } = options;
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: width,
        color: rgb(color[0], color[1], color[2]),
        dashArray: dash,
      });
    };

    const drawRect = (x: number, y: number, w: number, h: number, options: {
      fill?: RGB;
      stroke?: RGB;
      strokeWidth?: number;
    } = {}) => {
      const { fill, stroke, strokeWidth } = options;
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color: fill ? rgb(fill[0], fill[1], fill[2]) : undefined,
        borderColor: stroke ? rgb(stroke[0], stroke[1], stroke[2]) : undefined,
        borderWidth: strokeWidth,
      });
    };

    // ── Layout constants ───────────────────────────────────────────────────
    const MARGIN      = 50;
    const HEADER_H    = 84;
    const INFO_BOX_W  = 215;
    const INFO_PAD    = 12;   // internal padding (all sides)
    const LINE_H      = 15;   // detail line spacing
    const LINE_H_LG   = 18;   // gap after section label / after name

    // ── Header ─────────────────────────────────────────────────────────────
    drawRect(0, height - HEADER_H, width, HEADER_H, { fill: primaryColor });

    // Invoice type — vertically centred in header
    addText(type.toUpperCase(), MARGIN, height - 52, {
      size: 28, font: helveticaBold, color: [1, 1, 1] as RGB
    });

    // Date: stacked label + value on right side
    addText('DATE', width - 200, height - 32, {
      size: 7, font: helveticaBold,
      color: [0.62, 0.78, 1.0] as RGB, align: 'right', width: 150
    });
    addText(date, width - 200, height - 46, {
      size: 10, color: [1, 1, 1] as RGB, align: 'right', width: 150
    });

    // ── Info boxes ─────────────────────────────────────────────────────────
    // Word-wrap helper
    const wrapAddress = (addr: string, maxWidth: number, fontSize: number, font: typeof helvetica): string[] => {
      const words = addr.replace(/\r?\n/g, ' ').split(' ').filter(Boolean);
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      return lines;
    };

    const addrLines   = wrapAddress(address,   INFO_BOX_W - INFO_PAD * 2, 10, helvetica);
    const toAddrLines = wrapAddress(toAddress, INFO_BOX_W - INFO_PAD * 2, 10, helvetica);

    // Shared Y anchors — both boxes open at the same boxTop
    const boxTop  = height - HEADER_H - 20;          // 20px gap below header
    const labelY  = boxTop  - INFO_PAD - 2;           // section label ("FROM" / "BILL TO")
    const nameY   = labelY  - LINE_H_LG;              // company / client name
    const addrY   = nameY   - LINE_H_LG;              // first address line

    // FROM: compute each row's Y to find box bottom
    const fromAddrLastY  = addrY - (addrLines.length - 1) * LINE_H;
    const fromPostcodeY  = fromAddrLastY - LINE_H;
    const fromTelY       = fromPostcodeY - LINE_H;
    const fromEmailY     = fromTelY      - LINE_H;
    const fromLastY      = email ? fromEmailY : (telephone ? fromTelY : fromPostcodeY);
    const fromBoxBottom  = fromLastY - INFO_PAD - 4;

    // BILL TO: same approach
    const toAddrLastY  = addrY - (toAddrLines.length - 1) * LINE_H;
    const toCityY      = toAddrLastY  - LINE_H;
    const toPostcodeY  = toCityY      - LINE_H;
    const toBoxBottom  = toPostcodeY  - INFO_PAD - 4;

    // Both boxes share the same bottom edge so they're perfectly aligned
    const infoBoxBottom = Math.min(fromBoxBottom, toBoxBottom);
    const infoBoxHeight = boxTop - infoBoxBottom;

    const leftBoxX  = MARGIN;
    const rightBoxX = width - MARGIN - INFO_BOX_W;

    drawRect(leftBoxX,  infoBoxBottom, INFO_BOX_W, infoBoxHeight, {
      fill: [0.97, 0.98, 1.0] as RGB, stroke: [0.82, 0.88, 0.96] as RGB, strokeWidth: 0.75
    });
    drawRect(rightBoxX, infoBoxBottom, INFO_BOX_W, infoBoxHeight, {
      fill: [0.97, 0.98, 1.0] as RGB, stroke: [0.82, 0.88, 0.96] as RGB, strokeWidth: 0.75
    });

    // FROM content
    const fromX = leftBoxX + INFO_PAD;
    addText('FROM', fromX, labelY, { font: helveticaBold, size: 8, color: primaryColor });
    addText(companyName, fromX, nameY, { font: helveticaBold, size: 12 });
    addrLines.forEach((line, i) => addText(line, fromX, addrY - i * LINE_H));
    addText(postcode, fromX, fromPostcodeY);
    if (telephone) addText(telephone, fromX, fromTelY,  { color: labelColor });
    if (email)     addText(email,     fromX, fromEmailY, { color: labelColor });

    // BILL TO content
    const toX = rightBoxX + INFO_PAD;
    addText('BILL TO', toX, labelY, { font: helveticaBold, size: 8, color: primaryColor });
    addText(toName, toX, nameY, { font: helveticaBold, size: 12 });
    toAddrLines.forEach((line, i) => addText(line, toX, addrY - i * LINE_H));
    addText(toCity,     toX, toCityY);
    addText(toPostcode, toX, toPostcodeY);

    // ── Items table ────────────────────────────────────────────────────────
    // Thin divider line above table section
    drawLine(MARGIN, infoBoxBottom - 20, width - MARGIN, infoBoxBottom - 20, {
      width: 0.5, color: secondaryColor
    });

    let yPos = infoBoxBottom - 44;
    // Column layout: [desc, qty, price, total] — widths sum to content width (495)
    const lineHeight = 28;
    const startX     = MARGIN;
    const tableW     = width - MARGIN * 2;
    const colW       = [255, 60, 100, 80] as const;  // 255+60+100+80 = 495
    const colX       = [
      startX,
      startX + colW[0],
      startX + colW[0] + colW[1],
      startX + colW[0] + colW[1] + colW[2],
    ];

    // Table header bar
    drawRect(startX - 10, yPos - 16, tableW + 20, 36, { fill: primaryColor });

    const quantityLabel = billingMode === 'hourly' ? 'Hours' : 'Qty';
    const priceLabel    = billingMode === 'hourly' ? 'Rate'  : 'Price';

    addText('Description', colX[0], yPos, { font: helveticaBold, color: [1,1,1] as RGB, size: 11 });
    addText(quantityLabel, colX[1], yPos, { font: helveticaBold, color: [1,1,1] as RGB, size: 11, align: 'right', width: colW[1] - 8 });
    addText(priceLabel,    colX[2], yPos, { font: helveticaBold, color: [1,1,1] as RGB, size: 11, align: 'right', width: colW[2] - 8 });
    addText('Total',       colX[3], yPos, { font: helveticaBold, color: [1,1,1] as RGB, size: 11, align: 'right', width: colW[3] - 4 });

    yPos -= lineHeight;

    // Table rows with alternating backgrounds
    items.forEach((item: InvoiceItem, index: number) => {
      if (index % 2 === 0) {
        drawRect(startX - 10, yPos - 16, tableW + 20, lineHeight, { fill: rowAccent });
      }

      addText(item.description, colX[0], yPos, { size: 10 });
      addText(item.quantity.toString(),             colX[1], yPos, { size: 10, align: 'right', width: colW[1] - 8 });
      addText(`${currency}${item.unitPrice.toFixed(2)}`, colX[2], yPos, { size: 10, align: 'right', width: colW[2] - 8 });
      addText(`${currency}${item.total.toFixed(2)}`,     colX[3], yPos, { size: 10, align: 'right', width: colW[3] - 4 });

      yPos -= lineHeight;
    });

    // ── Totals section ─────────────────────────────────────────────────────
    yPos -= 16;

    const totalsBoxW   = INFO_BOX_W;                      // matches info box width (215)
    const totalsBoxX   = width - MARGIN - totalsBoxW;     // right-aligned to margin
    const totalsTextX  = totalsBoxX + INFO_PAD;           // left-aligned text inside box
    const amtW         = totalsBoxW - INFO_PAD * 2;       // width for right-aligning amounts
    const ROW_H        = 24;
    const TOTAL_BAR_H  = 34;

    // Box spans from INFO_PAD above first row down to 6px below the total bar rect
    // Bar rect y = yPos - rowCount*ROW_H - 14 - 10, so box bottom = that - 6
    const rowCount        = 1 + (tax > 0 ? 1 : 0) + (discount > 0 ? 1 : 0);
    const totalsBoxHeight = INFO_PAD + rowCount * ROW_H + 30;
    const totalsBoxBottom = yPos - totalsBoxHeight + INFO_PAD;

    drawRect(totalsBoxX, totalsBoxBottom, totalsBoxW, totalsBoxHeight, {
      fill: [0.97, 0.98, 1.0] as RGB, stroke: [0.82, 0.88, 0.96] as RGB, strokeWidth: 0.75
    });

    // Subtotal row
    addText('Subtotal', totalsTextX, yPos, { size: 10, color: labelColor });
    addText(`${currency}${subtotal.toFixed(2)}`, totalsTextX, yPos, { size: 10, align: 'right', width: amtW });

    // Tax row
    if (tax > 0) {
      yPos -= ROW_H;
      addText(`Tax (${tax}%)`, totalsTextX, yPos, { size: 10, color: labelColor });
      addText(`${currency}${taxAmount.toFixed(2)}`, totalsTextX, yPos, { size: 10, align: 'right', width: amtW });
    }

    // Discount row
    if (discount > 0) {
      yPos -= ROW_H;
      addText(`Discount (${discount}%)`, totalsTextX, yPos, { size: 10, color: labelColor });
      addText(`-${currency}${discountAmount.toFixed(2)}`, totalsTextX, yPos, { size: 10, align: 'right', width: amtW });
    }

    // Total bar
    yPos -= (ROW_H + 14);
    drawRect(totalsBoxX, yPos - 10, totalsBoxW, TOTAL_BAR_H, { fill: primaryColor });
    addText('TOTAL', totalsTextX, yPos, { font: helveticaBold, size: 12, color: [1,1,1] as RGB });
    addText(`${currency}${total.toFixed(2)}`, totalsTextX, yPos, {
      font: helveticaBold, size: 12, color: [1,1,1] as RGB, align: 'right', width: amtW
    });

    // Add additional information
    if ((type === 'Invoice' && (messageLines.length > 0 || payInfoLines.length > 0)) || (type === 'Quote' && termsLines.length > 0)) {
      // Move message after the totals section
      // First handle payment info if present
      if (type === 'Invoice') {
        // Start with a lower position for additional information
        // This positions it below the totals section
        yPos -= -40; // Add more space after the totals
        
        if (messageLines.length > 0) {
          addText('Message', 50, yPos, { 
            font: helveticaBold,
            size: 12,
            color: primaryColor
          });
          drawLine(50, yPos - 5, 150, yPos - 5, { 
            width: 1,
            color: primaryColor
          });
          
          // Render each line of the message
          let currentY = yPos - 25;
          const lineHeight = 14;
          
          for (const line of messageLines) {
            if (line.trim()) { // Only add non-empty lines
              addText(line, 50, currentY);
              currentY -= lineHeight;
            }
          }
          
          // Update yPos for the next element
          yPos = currentY - 10;
        }

        if (payInfoLines.length > 0) {
          addText('Payment Terms', 50, yPos, { 
            font: helveticaBold,
            size: 12,
            color: primaryColor
          });
          drawLine(50, yPos - 5, 200, yPos - 5, { 
            width: 1,
            color: primaryColor
          });
          
          // Render each line of the payment info
          let currentY = yPos - 25;
          const lineHeight = 14;
          
          for (const line of payInfoLines) {
            if (line.trim()) { // Only add non-empty lines
              addText(line, 50, currentY);
              currentY -= lineHeight;
            }
          }
          
          // Update yPos for the next element
          yPos = currentY - 10;
        }
      } else if (type === 'Quote' && termsLines.length > 0) {
        yPos -= 60; // Add more space after the totals
        addText('Terms & Conditions', 50, yPos, { 
          font: helveticaBold,
          size: 12,
          color: primaryColor
        });
        drawLine(50, yPos - 5, 200, yPos - 5, { 
          width: 1,
          color: primaryColor
        });
        
        // Render each line of the terms
        let currentY = yPos - 25;
        const lineHeight = 14;
        
        for (const line of termsLines) {
          if (line.trim()) { // Only add non-empty lines
            addText(line, 50, currentY);
            currentY -= lineHeight;
          }
        }
        
        // Update yPos for the next element
        yPos = currentY - 10;
      }
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Return PDF as downloadable file
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${toName || 'Invoice'}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate document' },
      { status: 500 }
    );
  }
}
