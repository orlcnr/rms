import { HttpException, HttpStatus } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { extname } from 'path';

export const multerConfig = {
  dest: './uploads',
};

export const multerOptions = {
  // Enable file size limits
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  // Check the mimetypes to allow for upload
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      // Allow storage of file
      cb(null, true);
    } else {
      // Reject file
      cb(
        new HttpException(
          `Unsupported file type ${extname(file.originalname)}`,
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
  },
  // Storage properties
  storage: memoryStorage(),
};
