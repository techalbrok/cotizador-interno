import fs from 'node:fs/promises';
import path from 'path';

const fileTypeRules = [
  {
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    signatures: [Buffer.from('%PDF-')],
  },
  {
    extensions: ['.jpg', '.jpeg'],
    mimeTypes: ['image/jpeg'],
    signatures: [Buffer.from([0xFF, 0xD8, 0xFF])],
  },
  {
    extensions: ['.png'],
    mimeTypes: ['image/png'],
    signatures: [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
  },
  {
    extensions: ['.docx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    signatures: [
      Buffer.from([0x50, 0x4B, 0x03, 0x04]),
      Buffer.from([0x50, 0x4B, 0x05, 0x06]),
      Buffer.from([0x50, 0x4B, 0x07, 0x08]),
    ],
  },
];

export const allowedUploadMimeTypes = fileTypeRules.flatMap((rule) => rule.mimeTypes);
export const allowedUploadExtensions = fileTypeRules.flatMap((rule) => rule.extensions);

const maxSignatureLength = Math.max(...fileTypeRules.flatMap((rule) => rule.signatures.map((signature) => signature.length)));

const matchesSignature = (buffer, signature) => (
  buffer.length >= signature.length
  && signature.equals(buffer.subarray(0, signature.length))
);

export const validateUploadedFileSignature = async (file) => {
  const fileExtension = path.extname(file.originalname || '').toLowerCase();
  const fileRule = fileTypeRules.find((rule) => rule.extensions.includes(fileExtension));

  if (!fileRule) {
    return {
      valid: false,
      message: `El archivo ${file.originalname} no tiene una extension permitida`,
    };
  }

  const fileHandle = await fs.open(file.path, 'r');

  try {
    const buffer = Buffer.alloc(maxSignatureLength);
    const { bytesRead } = await fileHandle.read(buffer, 0, maxSignatureLength, 0);
    const fileHeader = buffer.subarray(0, bytesRead);

    const signatureMatches = fileRule.signatures.some((signature) => matchesSignature(fileHeader, signature));

    if (!signatureMatches) {
      return {
        valid: false,
        message: `El archivo ${file.originalname} no coincide con el tipo permitido`,
      };
    }

    return { valid: true };
  } finally {
    await fileHandle.close();
  }
};

export const cleanupUploadedFiles = async (files = []) => {
  await Promise.allSettled(
    files.map(async (file) => {
      if (!file?.path) return;
      await fs.unlink(file.path);
    })
  );
};
