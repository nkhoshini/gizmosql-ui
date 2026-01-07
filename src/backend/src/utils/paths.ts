import path from 'path';
import fs from 'fs';

/**
 * Get the path to static frontend files.
 * Handles both development and packaged (pkg) environments.
 */
export function getStaticPath(dirname: string): string {
  // When running from pkg, assets are in a snapshot filesystem
  const pkgPath = path.join(dirname, '../../frontend');

  // Development path (relative to dist/backend/src)
  const devPath = path.join(dirname, '../../frontend');

  // Check if we're running from pkg snapshot
  if (fs.existsSync(pkgPath)) {
    return pkgPath;
  }

  // Fallback for development
  const srcDevPath = path.join(dirname, '../../../src/frontend/dist');
  if (fs.existsSync(srcDevPath)) {
    return srcDevPath;
  }

  return devPath;
}
