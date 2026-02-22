#!/usr/bin/env node
/**
 * Creates minimal placeholder images for media folder.
 * Run: node scripts/create-placeholders.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal 1x1 gray PNG (89 bytes)
const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const files = [
  "public/media/brand/hero-logo.jpeg",
  "public/media/gallery/team-portrait.jpeg",
  "public/media/gallery/team-back.jpeg",
  "public/media/gallery/truck-road.jpeg",
  "public/media/gallery/movers-boxes.jpeg",
  "public/media/gallery/van-street.jpeg",
  "public/media/gallery/fridge-load.jpeg",
  "public/media/gallery/disposal-dumpster.jpeg",
  "public/media/gallery/keys-box.jpeg",
  "public/media/gallery/electronics.jpeg",
  "public/media/gallery/calendar.jpeg",
  "public/media/gallery/money.jpeg",
  "public/media/gallery/workshop.jpeg",
  "public/media/gallery/team-portrait-2.jpeg",
];

for (const file of files) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Write PNG content - works as placeholder (browsers detect format by magic bytes)
  fs.writeFileSync(path.join(process.cwd(), file), MINIMAL_PNG);
  console.log("Created:", file);
}

console.log("Done. Placeholder images created. Replace with real photos when available.");
