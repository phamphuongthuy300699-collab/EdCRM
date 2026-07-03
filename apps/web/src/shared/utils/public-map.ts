type BranchForMap = {
  name?: string | null;
  address?: string | null;
  is_active?: boolean | null;
  show_on_site?: boolean | null;
};

export function publicMapBranches(branches: BranchForMap[]) {
  return branches.filter((branch) => {
    const address = String(branch.address || "").trim();
    return address && branch.is_active !== false && branch.show_on_site !== false;
  });
}

export function publicFooterMapBranches(branches: BranchForMap[], fallbackAddress?: string | null, fallbackName?: string | null) {
  const visibleBranches = publicMapBranches(branches);
  if (visibleBranches.length > 0) return visibleBranches;

  const address = String(fallbackAddress || "").trim();
  if (!address) return [];

  return [{ name: fallbackName || null, address }];
}

export function buildYandexMapEmbedUrl(branches: BranchForMap[]) {
  const addresses = publicMapBranches(branches)
    .map((branch) => String(branch.address || "").trim())
    .filter(Boolean);

  if (addresses.length === 0) return "";

  const query = addresses.join(" ; ");
  const params = new URLSearchParams({
    mode: "search",
    text: query,
    z: addresses.length > 1 ? "11" : "15",
  });

  return `https://yandex.ru/map-widget/v1/?${params.toString()}`;
}
