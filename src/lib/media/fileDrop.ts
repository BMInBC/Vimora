const SUPPORTED_MEDIA_EXT_REGEX =
  /\.(mp4|mov|mkv|webm|avi|wmv|flv|m4v|ts|mts|3gp|ogv|mp3|wav|aac|flac|ogg|m4a|wma|opus|aiff)$/i;

export function isSupportedMediaFilename(name: string, mimeType = ''): boolean {
  if (!name) return false;
  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
    return true;
  }
  return SUPPORTED_MEDIA_EXT_REGEX.test(name);
}

export function filterMediaFiles(files: FileList | File[] | null): File[] {
  if (!files) return [];
  const list = Array.isArray(files) ? files : Array.from(files);
  return list.filter(
    (file) => file.size > 0 && isSupportedMediaFilename(file.name, file.type)
  );
}

interface WebkitFileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (success: (file: File) => void, error?: (err: unknown) => void) => void;
  createReader?: () => {
    readEntries: (
      success: (entries: WebkitFileSystemEntry[]) => void,
      error?: (err: unknown) => void
    ) => void;
  };
}

function readAllDirectoryEntries(
  dirEntry: WebkitFileSystemEntry
): Promise<WebkitFileSystemEntry[]> {
  return new Promise((resolve) => {
    if (!dirEntry.createReader) {
      resolve([]);
      return;
    }
    const reader = dirEntry.createReader();
    const collected: WebkitFileSystemEntry[] = [];

    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (!batch || batch.length === 0) {
            resolve(collected);
          } else {
            collected.push(...batch);
            readBatch();
          }
        },
        () => resolve(collected)
      );
    };

    readBatch();
  });
}

async function traverseEntry(
  entry: WebkitFileSystemEntry,
  depth = 0
): Promise<File[]> {
  if (depth > 8) return [];

  if (entry.isFile && entry.file) {
    return new Promise((resolve) => {
      entry.file!(
        (file) => {
          if (file && file.size > 0 && isSupportedMediaFilename(file.name, file.type)) {
            resolve([file]);
          } else {
            resolve([]);
          }
        },
        () => resolve([])
      );
    });
  }

  if (entry.isDirectory) {
    const children = await readAllDirectoryEntries(entry);
    const nested = await Promise.all(
      children.map((child) => traverseEntry(child, depth + 1))
    );
    return nested.flat();
  }

  return [];
}

/**
 * Extracts all supported media files from a browser DataTransfer drop event,
 * supporting any mix of individual files and nested folders.
 */
export async function extractFilesFromDataTransfer(
  dataTransfer: DataTransfer | null
): Promise<File[]> {
  if (!dataTransfer) return [];

  // Synchronously snapshot all FileSystemEntry handles before any async awaits,
  // because Chromium clears DataTransferItemList once the event tick ends.
  const entries: WebkitFileSystemEntry[] = [];
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i] as DataTransferItem & {
        webkitGetAsEntry?: () => WebkitFileSystemEntry | null;
      };
      if (typeof item.webkitGetAsEntry === 'function') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          entries.push(entry);
        }
      }
    }
  }

  if (entries.length > 0) {
    const nestedFiles = await Promise.all(entries.map((entry) => traverseEntry(entry)));
    const flattened = nestedFiles.flat();
    if (flattened.length > 0) {
      return flattened;
    }
  }

  // Fallback for browsers without webkitGetAsEntry
  return filterMediaFiles(dataTransfer.files);
}
