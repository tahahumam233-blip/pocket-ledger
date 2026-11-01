import { askConfirm } from './confirm';

function download(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isNotAllowed(error: unknown) {
  return error instanceof DOMException && error.name === 'NotAllowedError';
}

/**
 * Web version: opens the iPhone share sheet (Save to Files, AirDrop, Mail…).
 * Safari only allows sharing straight after a tap, so when preparing the file
 * took too long the person is asked to tap once more.
 */
export async function shareTextFile(
  fileName: string,
  content: string,
  mimeType: string,
  dialogTitle = 'Share',
): Promise<boolean> {
  const file = new File([content], fileName, { type: mimeType });
  const canShareFiles =
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (!canShareFiles) {
    download(file);
    return true;
  }

  try {
    await navigator.share({ files: [file], title: fileName });
    return true;
  } catch (error) {
    if (isAbort(error)) return false;
    if (!isNotAllowed(error)) throw error;
  }

  const again = await askConfirm({
    title: `${dialogTitle} is ready`,
    message: `${fileName} has been prepared. Tap Save to choose where to keep it.`,
    confirmLabel: 'Save',
  });
  if (!again) return false;
  try {
    await navigator.share({ files: [file], title: fileName });
    return true;
  } catch (error) {
    if (isAbort(error)) return false;
    download(file);
    return true;
  }
}

/**
 * Web version: shares text through the iPhone share sheet (Messages, WhatsApp,
 * Mail, Notes). Falls back to copying it when sharing is not available.
 */
export async function shareText(title: string, message: string): Promise<boolean> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text: message });
      return true;
    } catch (error) {
      if (isAbort(error)) return false;
      if (!isNotAllowed(error)) throw error;
      const again = await askConfirm({
        title: `${title} is ready`,
        message: 'Tap Share to choose where to send it.',
        confirmLabel: 'Share',
      });
      if (!again) return false;
      try {
        await navigator.share({ title, text: message });
        return true;
      } catch (retryError) {
        if (isAbort(retryError)) return false;
      }
    }
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(message);
    return true;
  }
  throw new Error('Sharing is not available in this browser.');
}
