type BranchForMap = {
  name?: string | null;
  address?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  map_lat?: number | string | null;
  map_lng?: number | string | null;
  map_url?: string | null;
  is_active?: boolean | null;
  show_on_site?: boolean | null;
};

type BranchCoordinates = {
  lat: number;
  lng: number;
};

export type BranchMapMarker = BranchCoordinates & {
  name: string;
  address: string;
  openUrl: string;
  x: number;
  y: number;
};

const knownBranchCoordinates = [
  {
    pattern: /осканова[,\s]+3|осканова.*д\.?\s*3/i,
    coordinates: { lat: 52.596328, lng: 39.4900857 },
  },
  {
    pattern: /славянова[,\s]+1|славянова.*д\.?\s*1/i,
    coordinates: { lat: 52.6064322, lng: 39.5048586 },
  },
];

function numericCoordinate(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function coordinatesFromMapUrl(mapUrl: string | null | undefined): BranchCoordinates | null {
  if (!mapUrl) return null;

  try {
    const url = new URL(mapUrl);
    const ll = url.searchParams.get("ll");
    if (ll) {
      const [lng, lat] = ll.split(",").map((value) => Number(value));
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }

    const text = decodeURIComponent(mapUrl);
    const match = text.match(/(?:ll=|[?&]pt=)(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (match) {
      const lng = Number(match[1]);
      const lat = Number(match[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  } catch {
    const match = mapUrl.match(/(?:ll=|[?&]pt=)(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (match) {
      const lng = Number(match[1]);
      const lat = Number(match[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }

  return null;
}

export function branchCoordinates(branch: BranchForMap): BranchCoordinates | null {
  const lat = numericCoordinate(branch.latitude ?? branch.lat ?? branch.map_lat);
  const lng = numericCoordinate(branch.longitude ?? branch.lng ?? branch.map_lng);
  if (lat !== null && lng !== null) return { lat, lng };

  const mapUrlCoordinates = coordinatesFromMapUrl(branch.map_url);
  if (mapUrlCoordinates) return mapUrlCoordinates;

  const address = String(branch.address || "");
  const known = knownBranchCoordinates.find((item) => item.pattern.test(address));
  return known?.coordinates || null;
}

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

export function buildYandexMapOpenUrl(marker: Pick<BranchMapMarker, "address" | "lat" | "lng">) {
  const params = new URLSearchParams({
    text: marker.address,
    ll: `${marker.lng},${marker.lat}`,
    z: "16",
    pt: `${marker.lng},${marker.lat},pm2rdm`,
  });

  return `https://yandex.ru/maps/?${params.toString()}`;
}

function markerPositions(markers: Array<Omit<BranchMapMarker, "x" | "y" | "openUrl">>) {
  if (markers.length === 0) return [];

  const lats = markers.map((marker) => marker.lat);
  const lngs = markers.map((marker) => marker.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = Math.max(maxLat - minLat, 0.002);
  const lngRange = Math.max(maxLng - minLng, 0.002);

  return markers.map((marker) => ({
    ...marker,
    x: 12 + ((marker.lng - minLng) / lngRange) * 76,
    y: 12 + ((maxLat - marker.lat) / latRange) * 76,
    openUrl: buildYandexMapOpenUrl(marker),
  }));
}

export function resolveBranchMapMarkers(branches: BranchForMap[]): BranchMapMarker[] {
  const markers = publicMapBranches(branches)
    .map((branch) => {
      const address = String(branch.address || "").trim();
      const coordinates = branchCoordinates(branch);
      if (!address || !coordinates) return null;

      return {
        name: String(branch.name || "Филиал").trim(),
        address,
        lat: coordinates.lat,
        lng: coordinates.lng,
      };
    })
    .filter(Boolean) as Array<Omit<BranchMapMarker, "x" | "y" | "openUrl">>;

  return markerPositions(markers);
}

export function buildYandexStaticMapUrl(markers: BranchMapMarker[], options: { width?: number; height?: number } = {}) {
  if (markers.length === 0) return "";

  const avgLat = markers.reduce((sum, marker) => sum + marker.lat, 0) / markers.length;
  const avgLng = markers.reduce((sum, marker) => sum + marker.lng, 0) / markers.length;
  const pointText = markers
    .map((marker) => `${marker.lng},${marker.lat},pm2rdm`)
    .join("~");
  const params = new URLSearchParams({
    l: "map",
    ll: `${avgLng},${avgLat}`,
    z: markers.length > 1 ? "13" : "16",
    size: `${options.width || 650},${options.height || 300}`,
    pt: pointText,
  });

  return `https://static-maps.yandex.ru/1.x/?${params.toString()}`;
}
