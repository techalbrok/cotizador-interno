import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
const uploadsDirectory = path.join(projectRoot, 'uploads');

export const getProjectRoot = () => projectRoot;

export const getUploadsDirectory = () => uploadsDirectory;

export const resolveStoredUploadPath = (storedPath) => {
  if (!storedPath) {
    throw new Error('La ruta del adjunto es invalida');
  }

  const absolutePath = path.isAbsolute(storedPath)
    ? path.resolve(storedPath)
    : path.resolve(projectRoot, storedPath);

  const relativePath = path.relative(uploadsDirectory, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('La ruta del adjunto es invalida');
  }

  return absolutePath;
};
