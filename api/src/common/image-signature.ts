/**
 * Verifica que un buffer corresponda realmente a una imagen PNG o JPEG
 * comprobando los magic bytes al inicio del archivo.
 *
 * PNG: 0x89 0x50 0x4E 0x47 (‰PNG)
 * JPEG: 0xFF 0xD8 0xFF
 */
export function isPngOrJpeg(buf: Buffer): boolean {
  if (!buf || buf.length < 4) return false;

  // PNG signature: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return true;
  }

  // JPEG signature: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return true;
  }

  return false;
}
