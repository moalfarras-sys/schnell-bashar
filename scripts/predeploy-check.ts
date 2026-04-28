const baseUrl = (process.env.PREDEPLOY_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://schnellsicherumzug.de").replace(/\/$/, "");

type CheckResult = {
  path: string;
  ok: boolean;
  status: number;
  contentType: string;
  matchedPath: string;
  message: string;
};

async function check(path: string): Promise<CheckResult> {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: { "User-Agent": "SSU-predeploy-check/1.0" },
  });
  const contentType = response.headers.get("content-type") || "";
  const matchedPath = response.headers.get("x-matched-path") || "";
  const body = await response.text();

  if (path === "/") {
    const ok = response.status === 200 && !body.includes("Wartungsarbeiten") && !body.includes("noindex,nofollow");
    return {
      path,
      ok,
      status: response.status,
      contentType,
      matchedPath,
      message: ok ? "Homepage renders real content" : "Homepage still looks like maintenance/noindex content",
    };
  }

  if (path === "/robots.txt") {
    const ok =
      response.status === 200 &&
      contentType.includes("text/plain") &&
      body.includes("Sitemap:") &&
      !body.includes("<html") &&
      !body.includes("noindex");
    return {
      path,
      ok,
      status: response.status,
      contentType,
      matchedPath,
      message: ok ? "robots.txt is crawlable plain text" : "robots.txt is not valid crawl instructions",
    };
  }

  if (path === "/sitemap.xml") {
    const ok =
      response.status === 200 &&
      (contentType.includes("xml") || body.startsWith("<?xml")) &&
      body.includes("<urlset") &&
      !body.includes("<html") &&
      !body.includes("Wartungsarbeiten");
    return {
      path,
      ok,
      status: response.status,
      contentType,
      matchedPath,
      message: ok ? "sitemap.xml is valid XML" : "sitemap.xml is not valid XML sitemap content",
    };
  }

  if (path === "/admin") {
    const ok = response.status === 307 || response.status === 308 || response.status === 302 || response.status === 200;
    return {
      path,
      ok,
      status: response.status,
      contentType,
      matchedPath,
      message: ok ? "admin route responds" : "admin route did not respond as expected",
    };
  }

  return {
    path,
    ok: response.ok,
    status: response.status,
    contentType,
    matchedPath,
    message: response.ok ? "OK" : "Unexpected response",
  };
}

async function main() {
  const paths = ["/", "/robots.txt", "/sitemap.xml", "/admin"];
  const results = await Promise.all(paths.map(check));

  for (const result of results) {
    const marker = result.ok ? "OK" : "FAIL";
    console.log(
      `[predeploy:${marker}] ${result.path} status=${result.status} content-type=${result.contentType || "-"} matched=${result.matchedPath || "-"} ${result.message}`,
    );
  }

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[predeploy:FAIL]", error);
  process.exit(1);
});
