type BranchForMap = {
  name?: string | null;
  address?: string | null;
};

export function buildYandexMapEmbedUrl(branches: BranchForMap[]) {
  const addresses = branches
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
