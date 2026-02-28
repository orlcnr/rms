import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import * as puppeteer from 'puppeteer';
import { Table } from '../entities/table.entity';

export interface TableQrData {
  tableId: string;
  tableName: string;
  restaurantId: string;
  restaurantName?: string;
  qrToken: string;
  qrUrl: string;
  qrImageDataUrl: string;
}

export interface BulkQrPdfData {
  restaurantName: string;
  generatedAt: Date;
  tables: TableQrData[];
}

@Injectable()
export class TableQrService {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    @InjectRepository(Table)
    private tableRepository: Repository<Table>,
  ) {}

  /**
   * Generate QR token for a table
   */
  async generateQrToken(
    tableId: string,
    restaurantId: string,
  ): Promise<string> {
    // Get or initialize qr_version for table
    const table = await this.tableRepository.findOne({
      where: { id: tableId },
      select: ['id', 'qrVersion'],
    });

    if (!table) {
      throw new Error('Table not found');
    }

    // Initialize qr_version if not set
    if (table.qrVersion === undefined || table.qrVersion === null) {
      table.qrVersion = 1;
      await this.tableRepository.save(table);
    }

    const payload = {
      restaurantId,
      tableId,
      qrVersion: table.qrVersion,
      issuedAt: Date.now(),
    };

    const secret = this.configService.get<string>('QR_TOKEN_SECRET');
    return this.jwtService.sign(payload, { secret });
  }

  /**
   * Generate QR code data URL for a table
   */
  async generateQrCodeForTable(
    tableId: string,
    restaurantId: string,
    restaurantName?: string,
  ): Promise<TableQrData> {
    const table = await this.tableRepository.findOne({
      where: { id: tableId },
      relations: ['restaurant'],
    });

    if (!table) {
      throw new Error('Table not found');
    }

    // Generate QR token
    const qrToken = await this.generateQrToken(tableId, restaurantId);

    // Generate guest URL
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL environment variable is not configured');
    }
    const qrUrl = `${frontendUrl}/guest?token=${encodeURIComponent(qrToken)}`;

    // Generate QR code image as data URL - High quality for scanning
    const qrImageDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 800,
      margin: 1,
      errorCorrectionLevel: 'L', // Low error correction for smaller QR modules
      type: 'image/png',
      rendererOpts: {
        quality: 1.0,
      },
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return {
      tableId,
      tableName: table.name,
      restaurantId,
      restaurantName: restaurantName || table.restaurant?.name || 'Restaurant',
      qrToken,
      qrUrl,
      qrImageDataUrl,
    };
  }

  /**
   * Generate QR codes for all tables in a restaurant
   */
  async generateQrCodesForRestaurant(
    restaurantId: string,
    restaurantName?: string,
  ): Promise<TableQrData[]> {
    const tables = await this.tableRepository.find({
      where: { restaurant_id: restaurantId },
      order: { name: 'ASC' },
    });

    const results: TableQrData[] = [];
    for (const table of tables) {
      try {
        const qrData = await this.generateQrCodeForTable(
          table.id,
          restaurantId,
          restaurantName,
        );
        results.push(qrData);
      } catch (error) {
        console.error(`Failed to generate QR for table ${table.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Generate PDF with QR codes for all tables
   */
  async generateBulkQrPdf(
    restaurantId: string,
    restaurantName: string,
  ): Promise<Buffer> {
    const tables = await this.generateQrCodesForRestaurant(
      restaurantId,
      restaurantName,
    );

    if (tables.length === 0) {
      throw new Error('No tables found for this restaurant');
    }

    // Generate HTML content for PDF
    const htmlContent = this.generatePdfHtml({
      restaurantName,
      generatedAt: new Date(),
      tables,
    });

    // Launch puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate PDF for a single table QR code
   */
  async generateSingleQrPdf(
    tableId: string,
    restaurantId: string,
    restaurantName?: string,
  ): Promise<Buffer> {
    const qrData = await this.generateQrCodeForTable(
      tableId,
      restaurantId,
      restaurantName,
    );

    // Generate HTML for single QR
    const htmlContent = this.generateSingleQrHtml(qrData);

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate HTML for bulk QR PDF
   */
  private generatePdfHtml(data: BulkQrPdfData): string {
    const tableCards = data.tables
      .map(
        (table) => `
      <div class="qr-card">
        <div class="qr-header">
          <h3>${table.tableName}</h3>
          <p class="restaurant-name">${table.restaurantName}</p>
        </div>
        <div class="qr-image">
          <img src="${table.qrImageDataUrl}" alt="QR Code for ${table.tableName}" />
        </div>
        <div class="qr-footer">
          <p class="instructions">Scan to order</p>
          <p class="table-id">Table #${table.tableId.slice(0, 8)}</p>
        </div>
      </div>
    `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #f5f5f5;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #10b981;
            }
            .header h1 {
              color: #1f2937;
              font-size: 24px;
              margin-bottom: 8px;
            }
            .header p {
              color: #6b7280;
              font-size: 14px;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            .qr-card {
              background: white;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              border: 1px solid #e5e7eb;
            }
            .qr-header {
              margin-bottom: 15px;
            }
            .qr-header h3 {
              color: #1f2937;
              font-size: 18px;
              margin-bottom: 4px;
            }
            .restaurant-name {
              color: #6b7280;
              font-size: 12px;
            }
            .qr-image {
              margin: 15px 0;
            }
            .qr-image img {
              width: 350px;
              height: 350px;
            }
            .qr-footer {
              margin-top: 15px;
            }
            .instructions {
              color: #10b981;
              font-weight: 600;
              font-size: 14px;
            }
            .table-id {
              color: #9ca3af;
              font-size: 10px;
              margin-top: 4px;
            }
            @media print {
              body {
                background: white;
              }
              .qr-card {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${data.restaurantName}</h1>
            <p>QR Codes for Tables • Generated on ${data.generatedAt.toLocaleDateString()}</p>
          </div>
          <div class="qr-grid">
            ${tableCards}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML for single QR PDF (larger format)
   */
  private generateSingleQrHtml(data: TableQrData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: white;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 40px;
            }
            .qr-container {
              text-align: center;
              max-width: 400px;
            }
            .restaurant-name {
              color: #6b7280;
              font-size: 18px;
              margin-bottom: 10px;
            }
            .table-name {
              color: #1f2937;
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 30px;
            }
            .qr-image {
              margin: 30px 0;
            }
            .qr-image img {
              width: 500px;
              height: 500px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .instructions {
              color: #10b981;
              font-size: 24px;
              font-weight: 600;
              margin-top: 30px;
            }
            .sub-instructions {
              color: #9ca3af;
              font-size: 14px;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <p class="restaurant-name">${data.restaurantName}</p>
            <h1 class="table-name">${data.tableName}</h1>
            <div class="qr-image">
              <img src="${data.qrImageDataUrl}" alt="QR Code" />
            </div>
            <p class="instructions">Scan to Order</p>
            <p class="sub-instructions">Point your camera at the QR code to view the menu</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Rotate QR code for a table (invalidates old QR codes)
   */
  async rotateQrCode(tableId: string): Promise<string> {
    const table = await this.tableRepository.findOne({
      where: { id: tableId },
    });

    if (!table) {
      throw new Error('Table not found');
    }

    // Increment version
    table.qrVersion = (table.qrVersion || 0) + 1;
    await this.tableRepository.save(table);

    // Generate new token
    return this.generateQrToken(tableId, table.restaurant_id);
  }
}
