import "dotenv/config";

function printHeader(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  const key = process.env.ORS_API_KEY;
  const baseUrl = (process.env.ORS_BASE_URL || "https://api.openrouteservice.org").replace(/\/+$/, "");
  const endpoint = `${baseUrl}/v2/directions/driving-car/json`;

  printHeader("ORS Env");
  if (!key) {
    console.error("ORS_API_KEY missing");
    process.exit(1);
  }

  console.log(`ORS_API_KEY length: ${key.length}`);
  console.log(`ORS_BASE_URL: ${baseUrl}`);
  console.log(`Directions endpoint: ${endpoint}`);
  console.log("Authorization header format: Authorization: <KEY> (no Bearer)");

  const body = {
    coordinates: [
      [13.405, 52.52],
      [13.3777, 52.5163],
    ],
    units: "km",
  };

  printHeader("Directions Test");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const responseText = await response.text().catch(() => "");
    console.log(`HTTP ${response.status}`);
    console.log(responseText || "<empty body>");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Request error: ${message}`);
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
