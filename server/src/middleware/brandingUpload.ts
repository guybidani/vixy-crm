import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs";

/**
 * Branding asset upload (workspace logos).
 *
 * Stored under uploads/branding/ so the serve route can distinguish brand
 * assets (publicly served, no auth) from user documents (authenticated only).
 */

const BRANDING_DIR = path.resolve(__dirname, "../../uploads/branding");

// Ensure branding directory exists
if (!fs.existsSync(BRANDING_DIR)) {
  fs.mkdirSync(BRANDING_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, BRANDING_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

// Images only for logos (SVG excluded — can contain embedded JS/XSS)
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export const brandingUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB — logos should be small
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`סוג תמונה לא נתמך: ${file.mimetype}`));
    }
  },
});

export { BRANDING_DIR };
