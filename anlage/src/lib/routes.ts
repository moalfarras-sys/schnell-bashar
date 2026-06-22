export const appBasePath = "/pdf-anlage";
export const publicMountPath = "/pdf-anlage";

export function appPath(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${appBasePath}${normalizedPath === "/" ? "" : normalizedPath}`;
}

export function publicAssetPath(path: string) {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${publicMountPath}${normalizedPath}`;
}

