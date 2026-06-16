import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { extname, resolve } from 'node:path';
import type { MultipartFile } from '@fastify/multipart';

const IMAGE_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export class ProductImageError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ProductImageError';
    this.statusCode = statusCode;
  }
}

const getUploadsRoot = (): string => resolve(process.cwd(), 'uploads');

export const saveProductImage = async (
  file: MultipartFile,
): Promise<{ imageUrl: string; imagePath: string }> => {
  const extension = IMAGE_MIME_TYPES[file.mimetype];
  if (!extension) {
    throw new ProductImageError(
      400,
      'Only JPG, PNG, WEBP, and GIF images are supported.',
    );
  }

  const uploadsRoot = getUploadsRoot();
  await mkdir(uploadsRoot, { recursive: true });

  const originalExtension = extname(file.filename).toLowerCase();
  const safeExtension = originalExtension || extension;
  const filename = `${randomUUID()}${safeExtension}`;
  const imagePath = resolve(uploadsRoot, filename);

  await pipeline(file.file, createWriteStream(imagePath));

  return {
    imageUrl: `/uploads/${filename}`,
    imagePath,
  };
};

export const deleteProductImageByUrl = async (
  imageUrl: string | null | undefined,
): Promise<void> => {
  if (!imageUrl?.startsWith('/uploads/')) {
    return;
  }

  const filename = imageUrl.replace('/uploads/', '');
  if (!filename) {
    return;
  }

  await rm(resolve(getUploadsRoot(), filename), { force: true });
};

export const deleteProductImageByPath = async (
  imagePath: string | null | undefined,
): Promise<void> => {
  if (!imagePath) {
    return;
  }

  await rm(imagePath, { force: true });
};
