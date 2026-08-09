export function redirectToPath(path: string, status = 303) {
  return new Response(null, {
    status,
    headers: {
      Location: path,
    },
  });
}

export function getSafeRedirectPath(value: string | null, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
