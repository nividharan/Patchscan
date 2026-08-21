import { Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { RawBugFinding } from '../analyzer';

export async function runFileTests(
  page: Page,
  targetUrl: string,
  onLog: (msg: string, type?: 'action' | 'bug' | 'log') => void
): Promise<RawBugFinding[]> {
  const bugs: RawBugFinding[] = [];
  onLog('📁 [File Testing] Scanning for file upload/download elements...', 'action');

  const fileInputs = await page.$$('input[type="file"]');
  onLog(`[File Testing] Found ${fileInputs.length} file input(s).`);

  for (const fileInput of fileInputs) {
    const accept = await fileInput.getAttribute('accept') || '*/*';
    const inputId = await fileInput.getAttribute('id') || 'file-input';

    onLog(`[File Testing] Testing file input #${inputId} (accepts: ${accept})`, 'action');

    // Test 1: Upload wrong file type
    if (accept && accept !== '*/*' && !accept.includes('*')) {
      const wrongFile = path.join(os.tmpdir(), 'webhealer_wrong_type_test.exe');
      fs.writeFileSync(wrongFile, 'fake exe content');

      try {
        const errsBefore = await page.evaluate(() =>
          document.querySelectorAll('[role="alert"], .error, .invalid').length
        );
        await fileInput.setInputFiles(wrongFile);
        await page.waitForTimeout(500);
        const errsAfter = await page.evaluate(() =>
          document.querySelectorAll('[role="alert"], .error, .invalid').length
        );

        if (errsAfter === errsBefore) {
          bugs.push({
            id: `file-wrong-type-${Date.now()}`,
            type: 'CONSOLE_ERROR',
            message: `File input #${inputId} accepted a wrong file type (.exe) without showing a validation error. The server-side must also validate file types.`,
            url: targetUrl,
            timestamp: new Date().toISOString(),
            category: 'FILE_UPLOAD',
            actionTaken: `Upload wrong file type to input#${inputId}`,
          });
          onLog(`[File Testing] 💥 Wrong file type accepted without validation!`, 'bug');
        } else {
          onLog(`[File Testing] ✓ Correct validation triggered for wrong file type.`);
        }
      } catch (_) {}
      fs.unlinkSync(wrongFile);
    }

    // Test 2: Upload zero-byte / corrupted file
    const emptyFile = path.join(os.tmpdir(), 'webhealer_empty_test.txt');
    fs.writeFileSync(emptyFile, '');
    try {
      await fileInput.setInputFiles(emptyFile);
      await page.waitForTimeout(500);
      onLog(`[File Testing] Tested empty (0-byte) file upload.`);
    } catch (_) {}
    fs.unlinkSync(emptyFile);

    // Test 3: Upload large file (simulate > 10MB)
    const largeFile = path.join(os.tmpdir(), 'webhealer_large_test.txt');
    fs.writeFileSync(largeFile, 'X'.repeat(10 * 1024 * 1024)); // 10MB
    try {
      await fileInput.setInputFiles(largeFile);
      await page.waitForTimeout(500);
      onLog(`[File Testing] Tested large file (10MB) upload.`);
    } catch (_) {}
    try { fs.unlinkSync(largeFile); } catch (_) {}
  }

  // Check download links
  onLog('[File Testing] Checking download links...', 'action');
  const downloadLinks = await page.$$('a[download], a[href$=".pdf"], a[href$=".csv"], a[href$=".zip"]');
  onLog(`[File Testing] Found ${downloadLinks.length} download link(s).`);

  for (const link of downloadLinks.slice(0, 3)) {
    const href = await link.getAttribute('href');
    if (href) {
      try {
        const response = await page.context().request.get(
          href.startsWith('http') ? href : new URL(href, targetUrl).toString()
        );
        if (response.status() >= 400) {
          bugs.push({
            id: `file-download-dead-${Date.now()}`,
            type: 'NETWORK_FAILURE',
            message: `Download link "${href}" returns HTTP ${response.status()}. The file does not exist or the download route is broken.`,
            url: targetUrl,
            timestamp: new Date().toISOString(),
            category: 'FILE_UPLOAD',
            actionTaken: `GET ${href}`,
          });
          onLog(`[File Testing] 💥 Broken download link: ${href}`, 'bug');
        } else {
          onLog(`[File Testing] ✓ Download link OK: ${href} (HTTP ${response.status()})`);
        }
      } catch (_) {}
    }
  }

  onLog(`[File Testing] Suite complete. Found ${bugs.length} file-related issue(s).`);
  return bugs;
}
