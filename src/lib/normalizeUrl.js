export function normalizeUrl(input) {
  if (!input) return "";
  let url = input.trim();

  // If user forgets protocol, add https://
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  try {
    const u = new URL(url);

    // basic normalization: lowercase host, remove trailing slash
    const host = u.host.toLowerCase();
    let path = u.pathname || "/";
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

    // keep query for now (pilot). Later we can strip utm_ params.
    const query = u.search || "";

    return `https://${host}${path}${query}`.toLowerCase();
  } catch {
    // fallback: just lower + trim trailing slash
    url = url.toLowerCase();
    if (url.endsWith("/") && url.length > 1) url = url.slice(0, -1);
    return url;
  }
}
