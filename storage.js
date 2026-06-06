const fs = require('fs');
const path = require('path');
const { del, get, put } = require('@vercel/blob');

const ROOT_DIR = __dirname;
const IMAGES_DIR = path.join(ROOT_DIR, 'images');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const LOCAL_METADATA_PATH = path.join(IMAGES_DIR, 'metadata.json');
const LOCAL_ENQUIRIES_PATH = path.join(DATA_DIR, 'enquiries.json');
const LOCAL_SITE_CONTENT_PATH = path.join(DATA_DIR, 'site-content.json');
const BLOB_METADATA_PATH = 'data/metadata.json';
const BLOB_ENQUIRIES_PATH = 'data/enquiries.json';
const BLOB_SITE_CONTENT_PATH = 'data/site-content.json';
const BLOB_ENABLED = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

ensureDirectory(IMAGES_DIR);
ensureDirectory(DATA_DIR);

async function loadMetadata(fallback = []) {
  return readJsonArray(BLOB_METADATA_PATH, LOCAL_METADATA_PATH, fallback);
}

async function saveMetadata(value) {
  await saveJson(BLOB_METADATA_PATH, LOCAL_METADATA_PATH, value);
}

async function loadEnquiries(fallback = []) {
  return readJsonArray(BLOB_ENQUIRIES_PATH, LOCAL_ENQUIRIES_PATH, fallback);
}

async function saveEnquiries(value) {
  await saveJson(BLOB_ENQUIRIES_PATH, LOCAL_ENQUIRIES_PATH, value);
}

async function loadSiteContent(fallback) {
  return readJsonObject(BLOB_SITE_CONTENT_PATH, LOCAL_SITE_CONTENT_PATH, fallback);
}

async function saveSiteContent(value) {
  await saveJson(BLOB_SITE_CONTENT_PATH, LOCAL_SITE_CONTENT_PATH, value);
}

async function storeUploadedImage(file) {
  const safeName = sanitizeFilename(file.originalname);
  const filename = `${Date.now()}-${safeName}`;

  if (BLOB_ENABLED) {
    try {
      const blob = await put(`images/${filename}`, file.buffer, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: file.mimetype || 'application/octet-stream'
      });

      // Handle multiple possible URL properties from Vercel Blob
      const imageUrl = blob.url || blob.publicUrl || `https://blob.vercel-storage.com/${blob.pathname}`;

      return {
        filename,
        imageUrl: imageUrl.toString(),
        storagePath: blob.pathname || `images/${filename}`
      };
    } catch (error) {
      console.error('Failed to upload to Vercel Blob:', error);
      // Fallback to local storage if blob upload fails
      fs.writeFileSync(path.join(IMAGES_DIR, filename), file.buffer);
      return {
        filename,
        imageUrl: `/images/${encodeURIComponent(filename)}`,
        storagePath: `images/${filename}`
      };
    }
  }

  // Local storage
  fs.writeFileSync(path.join(IMAGES_DIR, filename), file.buffer);

  return {
    filename,
    imageUrl: `/images/${encodeURIComponent(filename)}`,
    storagePath: `images/${filename}`
  };
}

async function removeStoredImage(image) {
  if (!image || typeof image !== 'object') {
    return;
  }

  // Try to delete from Vercel Blob first
  if (BLOB_ENABLED && typeof image.storagePath === 'string' && image.storagePath.startsWith('images/')) {
    try {
      await del(image.storagePath);
      console.log(`Deleted blob: ${image.storagePath}`);
      return;
    } catch (error) {
      // BlobNotFoundError is fine (already deleted), other errors should be logged
      if (error && error.name === 'BlobNotFoundError') {
        console.log(`Blob already deleted: ${image.storagePath}`);
      } else {
        console.error(`Failed to delete blob ${image.storagePath}:`, error);
        // Don't throw - continue to try local deletion
      }
    }
  }

  // Try to delete local file
  if (typeof image.filename === 'string' && image.filename) {
    const localFilePath = path.join(IMAGES_DIR, path.basename(image.filename));
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        console.log(`Deleted local file: ${image.filename}`);
      }
    } catch (error) {
      console.error(`Failed to delete local file ${image.filename}:`, error);
    }
  }
}

async function readStoredImage(image) {
  if (!image || typeof image !== 'object') {
    return null;
  }

  // Try Vercel Blob first
  if (BLOB_ENABLED && typeof image.storagePath === 'string' && image.storagePath.startsWith('images/')) {
    const blob = await readBlobImage(image.storagePath);
    if (blob && blob.statusCode === 200 && blob.stream) {
      return {
        kind: 'blob',
        stream: blob.stream,
        contentType: blob.blob?.contentType || 'application/octet-stream',
        cacheControl: blob.blob?.cacheControl || 'public, max-age=3600'
      };
    }
  }

  // Try local file
  if (typeof image.filename === 'string' && localImageExists(image.filename)) {
    return {
      kind: 'local',
      filePath: path.join(IMAGES_DIR, path.basename(image.filename))
    };
  }

  return null;
}

function localImageExists(filename) {
  if (typeof filename !== 'string' || !filename) {
    return false;
  }

  return fs.existsSync(path.join(IMAGES_DIR, path.basename(filename)));
}

async function readJsonArray(blobPath, localPath, fallback) {
  const blobValue = await readBlobJson(blobPath);
  if (typeof blobValue !== 'undefined') {
    return Array.isArray(blobValue) ? blobValue : fallback;
  }

  return readLocalJsonArray(localPath, fallback);
}

async function readJsonObject(blobPath, localPath, fallback) {
  const blobValue = await readBlobJson(blobPath);
  if (typeof blobValue !== 'undefined') {
    return blobValue && typeof blobValue === 'object' && !Array.isArray(blobValue)
      ? blobValue
      : fallback;
  }

  return readLocalJsonObject(localPath, fallback);
}

async function saveJson(blobPath, localPath, value) {
  if (BLOB_ENABLED) {
    try {
      await put(blobPath, JSON.stringify(value, null, 2), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json'
      });
    } catch (error) {
      console.error(`Failed to save to Blob ${blobPath}:`, error);
      // Fallback to local storage
    }
  }

  // Always save locally as backup
  const tempPath = `${localPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tempPath, localPath);
}

async function readBlobJson(blobPath) {
  if (!BLOB_ENABLED) {
    return undefined;
  }

  try {
    const blob = await get(blobPath, {
      access: 'private'
    });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return undefined;
    }

    const text = await new Response(blob.stream).text();
    return JSON.parse(text);
  } catch (error) {
    if (error && error.name !== 'BlobNotFoundError') {
      console.error(`Failed to read ${blobPath}:`, error);
    }

    return undefined;
  }
}

async function readBlobImage(blobPath) {
  if (!BLOB_ENABLED) {
    return null;
  }

  try {
    const publicBlob = await get(blobPath, {
      access: 'public'
    });
    if (publicBlob) {
      return publicBlob;
    }
  } catch (error) {
    if (error && error.name !== 'BlobNotFoundError') {
      console.error(`Failed to read public blob ${blobPath}:`, error);
    }
  }

  try {
    const privateBlob = await get(blobPath, {
      access: 'private',
      useCache: false
    });
    return privateBlob || null;
  } catch (error) {
    if (error && error.name !== 'BlobNotFoundError') {
      console.error(`Failed to read private blob ${blobPath}:`, error);
    }

    return null;
  }
}

function readLocalJsonArray(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
    return fallback;
  }
}

function readLocalJsonObject(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
    return fallback;
  }
}

function ensureDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function sanitizeFilename(filename) {
  const safeName = path.basename(typeof filename === 'string' ? filename : 'upload').replace(
    /[^a-zA-Z0-9._-]+/g,
    '-'
  );

  return safeName || 'upload';
}

module.exports = {
  IMAGES_DIR,
  loadEnquiries,
  loadMetadata,
  loadSiteContent,
  localImageExists,
  readStoredImage,
  removeStoredImage,
  saveEnquiries,
  saveMetadata,
  saveSiteContent,
  storeUploadedImage
};
