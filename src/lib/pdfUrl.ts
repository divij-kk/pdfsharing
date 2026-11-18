/**
 * Products migrated from the old Google Sheet may still point at a Google
 * Drive share link rather than a Firebase Storage URL. Drive links need to
 * be converted to the /preview embed format to show in an iframe; Firebase
 * Storage download URLs (and any other direct link) are used as-is.
 */
export function toViewableUrl(pdfUrl: string): string {
  const driveMatch =
    pdfUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || pdfUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && pdfUrl.includes('drive.google.com')) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  return pdfUrl;
}
