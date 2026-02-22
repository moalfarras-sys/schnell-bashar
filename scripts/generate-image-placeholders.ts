import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

const MISSING_REFERENCES = [
  "/media/gallery/calendar.jpeg",
  "/media/gallery/money.jpeg",
  "/media/gallery/team-portrait-2.jpeg",
  "/media/gallery/truck-road.jpeg",
  "/media/gallery/van-street.jpeg",
];

const JPG_1X1_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEBAPDw8PDw8PDw8PDw8PDw8PFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGhAQGy0lICUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBEQACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAABAgAD/8QAFhEBAQEAAAAAAAAAAAAAAAAAAAER/9oADAMBAAIQAxAAAAHcA//EABgQAQEBAQEAAAAAAAAAAAAAAAERACEx/9oACAEBAAEFAmM3f//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8BP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8BP//Z";

async function ensurePlaceholder(filePath: string) {
  const absolute = path.join(process.cwd(), "public", filePath.replace(/^\//, ""));
  try {
    await fs.access(absolute);
    return { created: false, filePath };
  } catch {
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    const buffer = Buffer.from(JPG_1X1_BASE64, "base64");
    await fs.writeFile(absolute, buffer);
    return { created: true, filePath };
  }
}

async function main() {
  const results = await Promise.all(MISSING_REFERENCES.map((entry) => ensurePlaceholder(entry)));
  console.log("[generate-image-placeholders] done");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error("[generate-image-placeholders] failed", error);
  process.exitCode = 1;
});

