import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  constructor(private readonly configService: ConfigService) {}

  async uploadFile(file: Express.Multer.File, restaurantId: string) {
    if (!file) {
      return null;
    }

    try {
      // 1. Define paths
      const uploadRoot = join(process.cwd(), 'uploads');
      const restaurantFolder = join(uploadRoot, restaurantId);

      // 2. Ensure directories exist
      if (!existsSync(uploadRoot)) {
        mkdirSync(uploadRoot);
      }
      if (!existsSync(restaurantFolder)) {
        mkdirSync(restaurantFolder);
      }

      // 3. Prepare filename
      const originalName = file.originalname.split('.')[0];
      const sanitizedName = this.slugify(originalName);
      const uniqueSuffix = uuidv4().split('-')[0];
      const fileName = `${sanitizedName}-${uniqueSuffix}.webp`;
      const filePath = join(restaurantFolder, fileName);

      // 4. Process image with sharp
      // Resize to max 1200px width/height while maintaining aspect ratio
      // Convert to webp with quality 80
      await sharp(file.buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toFile(filePath);

      // 5. Build full URL
      const port = this.configService.get('PORT') || 3000;
      // In production, you might have a different APP_URL
      const baseUrl =
        this.configService.get('APP_URL') || `http://localhost:${port}`;
      const url = `${baseUrl}/uploads/${restaurantId}/${fileName}`;

      return {
        originalname: file.originalname,
        filename: fileName,
        url: url,
        mimetype: 'image/webp',
        size: file.size, // This is original size, sharp result might differ but usually smaller
      };
    } catch (error) {
      console.error('Image processing error:', error);
      throw new InternalServerErrorException(
        'Görsel işlenirken bir hata oluştu.',
      );
    }
  }

  async deleteFile(url: string) {
    if (!url) return;
    try {
      // Parse URL to get the relative path
      // Expected: http://localhost:3000/uploads/restaurant-id/filename.webp
      const urlPath = new URL(url).pathname; // /uploads/restaurant-id/filename.webp
      const relativePath = urlPath.replace(/^\//, ''); // uploads/restaurant-id/filename.webp
      const fullPath = join(process.cwd(), relativePath);

      if (existsSync(fullPath)) {
        require('fs').unlinkSync(fullPath);
      }
    } catch (error) {
      console.error('File deletion error:', error);
      // We don't throw here to avoid blocking product updates if file deletion fails
    }
  }

  private slugify(text: string): string {
    const trMap: { [key: string]: string } = {
      ç: 'c',
      Ç: 'C',
      ğ: 'g',
      Ğ: 'G',
      ı: 'i',
      İ: 'I',
      ö: 'o',
      Ö: 'O',
      ş: 's',
      Ş: 'S',
      ü: 'u',
      Ü: 'U',
    };

    let processed = text;
    Object.keys(trMap).forEach((key) => {
      processed = processed.replace(new RegExp(key, 'g'), trMap[key]);
    });

    return processed
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
