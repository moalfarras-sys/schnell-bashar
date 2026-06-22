export async function fetchPdfImage(publicPath: string): Promise<Buffer | null> {
  if (!publicPath) return null;
  
  const isRemote = publicPath.startsWith("http://") || publicPath.startsWith("https://");
  
  if (!isRemote) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const localPath = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
    } catch {
      // Ignore local fs errors
    }
  }

  try {
    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL 
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` 
      : process.env.NEXT_PUBLIC_SITE_URL || "https://schnellsicherumzug.de";
      
    const url = isRemote ? publicPath : `${baseUrl}${publicPath.startsWith("/") ? "" : "/"}${publicPath}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (e) {
    console.error("Failed to fetch pdf image:", e);
    return null;
  }
}
