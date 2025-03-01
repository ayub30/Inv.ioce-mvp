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
    const message = formData.get('message') as string || '';
    const payInfo = formData.get('payInfo') as string || '';
    const terms = formData.get('terms') as string || '';
    const currency = formData.get('currency') as string || '$';
    const date = formData.get('date') as string || new Date().toLocaleDateString();

    
    
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
    const primaryColor: RGB = [0.12, 0.36, 0.72]; // Royal Blue
    const secondaryColor: RGB = [0.9, 0.9, 0.9]; // Light Gray
    const textColor: RGB = [0.2, 0.2, 0.2]; // Dark Gray

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

      let xPos = x;
      if (align === 'right' && textWidth) {
        const textSize = font.widthOfTextAtSize(text, size);
        xPos = x + textWidth - textSize;
      } else if (align === 'center' && textWidth) {
        const textSize = font.widthOfTextAtSize(text, size);
        xPos = x + (textWidth - textSize) / 2;
      }

      page.drawText(text, { 
        x: xPos, 
        y, 
        size, 
        font,
        color: rgb(color[0], color[1], color[2])
      });
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

    // Add header bar
    drawRect(0, height - 120, width, 120, {
      fill: primaryColor
    });

    // Add invoice type and number
    addText(type.toUpperCase(), 50, height - 70, { 
      size: 36, 
      font: helveticaBold,
      color: [1, 1, 1] as RGB
    });

    // Add date
    addText(`Date: ${date}`, width - 200, height - 70, { 
      size: 12,
      color: [1, 1, 1] as RGB,
      align: 'right',
      width: 150
    });

    // Add company info
    const companyStartY = height - 180;
    drawRect(40, companyStartY - 100, 200, 120, {
      fill: [0.97, 0.97, 0.97] as RGB,
      stroke: secondaryColor,
      strokeWidth: 1
    });

    addText('FROM', 50, companyStartY, { 
      font: helveticaBold, 
      size: 12,
      color: primaryColor 
    });
    addText(companyName, 50, companyStartY - 25, { size: 14 });
    addText(address, 50, companyStartY - 45);
    addText(postcode, 50, companyStartY - 60);
    if (telephone) addText(`Tel: ${telephone}`, 50, companyStartY - 75);
    if (email) addText(email, 50, companyStartY - 90);

    // Add client info
    drawRect(width - 240, companyStartY - 100, 200, 120, {
      fill: [0.97, 0.97, 0.97] as RGB,
      stroke: secondaryColor,
      strokeWidth: 1
    });

    addText('BILL TO', width - 230, companyStartY, { 
      font: helveticaBold, 
      size: 12,
      color: primaryColor 
    });
    addText(toName, width - 230, companyStartY - 25, { size: 14 });
    addText(toAddress, width - 230, companyStartY - 45);
    addText(toCity, width - 230, companyStartY - 60);
    addText(toPostcode, width - 230, companyStartY - 75);

    // Add items table
    let yPos = height - 350;
    const lineHeight = 30;
    const colWidth = [300, 75, 85, 85];
    const startX = 50;

    // Table header
    drawRect(startX - 10, yPos - 15, width - 80, 40, {
      fill: primaryColor
    });

    // Table headers
    addText('Description', startX, yPos, { 
      font: helveticaBold,
      color: [1, 1, 1] as RGB,
      size: 12
    });
    addText('Quantity', startX + colWidth[0], yPos, { 
      font: helveticaBold,
      color: [1, 1, 1] as RGB,
      size: 12
    });
    addText('Unit Price', startX + colWidth[0] + colWidth[1], yPos, { 
      font: helveticaBold,
      color: [1, 1, 1] as RGB,
      size: 12
    });
    addText('Total', startX + colWidth[0] + colWidth[1] + colWidth[2], yPos, { 
      font: helveticaBold,
      color: [1, 1, 1] as RGB,
      size: 12
    });
    
    yPos -= lineHeight;

    // Table items with alternating backgrounds
    items.forEach((item: InvoiceItem, index: number) => {
      if (index % 2 === 0) {
        drawRect(startX - 10, yPos - 15, width - 80, lineHeight, {
          fill: [0.97, 0.97, 0.97] as RGB
        });
      }

      addText(item.description, startX, yPos);
      addText(item.quantity.toString(), startX + colWidth[0], yPos);
      addText(`${currency}${item.unitPrice.toFixed(2)}`, startX + colWidth[0] + colWidth[1], yPos);
      addText(`${currency}${item.total.toFixed(2)}`, startX + colWidth[0] + colWidth[1] + colWidth[2], yPos);
      
      yPos -= lineHeight;
    });

    // Add totals section
    yPos -= 20;
    const totalsX = width - 230;
    const totalsWidth = 200;
    
    // Draw totals box with gradient effect
    drawRect(totalsX - 10, yPos - 100, totalsWidth, 120, {
      fill: [0.97, 0.97, 0.97] as RGB,
      stroke: primaryColor,
      strokeWidth: 1
    });

    // Subtotal
    addText('Subtotal:', totalsX, yPos, { 
      font: helveticaBold,
      size: 12
    });
    addText(`${currency}${subtotal.toFixed(2)}`, totalsX + totalsWidth - 80, yPos, {
      align: 'right',
      width: 50
    });
    
    // Tax
    if (tax > 0) {
      yPos -= 25;
      addText(`Tax (${tax}%):`, totalsX, yPos, { 
        font: helveticaBold,
        size: 12
      });
      addText(`${currency}${taxAmount.toFixed(2)}`, totalsX + totalsWidth - 80, yPos, {
        align: 'right',
        width: 50
      });
    }
    
    // Discount
    if (discount > 0) {
      yPos -= 25;
      addText(`Discount (${discount}%):`, totalsX, yPos, { 
        font: helveticaBold,
        size: 12
      });
      addText(`${currency}${discountAmount.toFixed(2)}`, totalsX + totalsWidth - 80, yPos, {
        align: 'right',
        width: 50
      });
    }
    
    // Total
    yPos -= 40;
    drawRect(totalsX - 10, yPos - 10, totalsWidth, 35, {
      fill: primaryColor
    });
    addText('TOTAL:', totalsX, yPos, { 
      font: helveticaBold,
      size: 14,
      color: [1, 1, 1] as RGB
    });
    addText(`${currency}${total.toFixed(2)}`, totalsX + totalsWidth - 80, yPos, { 
      font: helveticaBold,
      size: 14,
      color: [1, 1, 1] as RGB,
      align: 'right',
      width: 50
    });

    // Add additional information
    if ((type === 'Invoice' && (message || payInfo)) || (type === 'Quote' && terms)) {
      yPos -= lineHeight;
      
      if (type === 'Invoice') {
        if (message) {
          addText('Message', 50, yPos, { 
            font: helveticaBold,
            size: 12,
            color: primaryColor
          });
          drawLine(50, yPos - 5, 150, yPos - 5, { 
            width: 1,
            color: primaryColor
          });
          addText(message, 50, yPos - 25);
          yPos -= lineHeight * 2;
        }

        if (payInfo) {
          addText('Payment Terms', 50, yPos, { 
            font: helveticaBold,
            size: 12,
            color: primaryColor
          });
          drawLine(50, yPos - 5, 200, yPos - 5, { 
            width: 1,
            color: primaryColor
          });
          addText(payInfo, 50, yPos - 25);
        }
      } else if (type === 'Quote' && terms) {
        addText('Terms & Conditions', 50, yPos, { 
          font: helveticaBold,
          size: 12,
          color: primaryColor
        });
        drawLine(50, yPos - 5, 200, yPos - 5, { 
          width: 1,
          color: primaryColor
        });
        addText(terms, 50, yPos - 25);
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
