import { getDistance } from './utils';

export const KANYAKUMARI_CITIES: Record<string, { lat: number; lng: number }> = {
  Nagercoil: { lat: 8.1833, lng: 77.4119 },
  Colachel: { lat: 8.1792, lng: 77.2597 },
  Kanniyakumari: { lat: 8.0883, lng: 77.5385 },
  Kollemcode: { lat: 8.3071, lng: 77.1009 },
  Kuzhithurai: { lat: 8.3184, lng: 77.1951 },
  Padmanabhapuram: { lat: 8.2464, lng: 77.3276 },
  Agasteeswaram: { lat: 8.1096, lng: 77.5186 },
  Alloor: { lat: 8.175, lng: 77.3881 },
  Anjugramam: { lat: 8.1362, lng: 77.554 },
  Aralvaimozhi: { lat: 8.2618, lng: 77.5255 },
  Arumanai: { lat: 8.337, lng: 77.192 },
  Attoor: { lat: 8.3075, lng: 77.2543 },
  Azhagappapuram: { lat: 8.15, lng: 77.5 },
  Azhakiapandipuram: { lat: 8.2833, lng: 77.4667 },
  Boothapandy: { lat: 8.2667, lng: 77.45 },
  Edaicode: { lat: 8.324, lng: 77.165 },
  Eraniel: { lat: 8.1994, lng: 77.3069 },
  Ganapathipuram: { lat: 8.1278, lng: 77.3785 },
  Kadayal: { lat: 8.3889, lng: 77.1645 },
  Kallukoottam: { lat: 8.1867, lng: 77.2917 },
  Kappiyarai: { lat: 8.2464, lng: 77.252 },
  Karungal: { lat: 8.2195, lng: 77.2575 },
  Keezhkulam: { lat: 8.225, lng: 77.2069 },
  Killiyoor: { lat: 8.2541, lng: 77.1706 },
  Kothanalloor: { lat: 8.2667, lng: 77.3 },
  Kottaram: { lat: 8.1167, lng: 77.5333 },
  Kulasekaram: { lat: 8.3685, lng: 77.2991 },
  Kumarapuram: { lat: 8.25, lng: 77.3167 },
  Mandaikadu: { lat: 8.1578, lng: 77.2804 },
  Manavalakurichi: { lat: 8.1408, lng: 77.3062 },
  Marthandam: { lat: 8.3115, lng: 77.2185 },
  Marungoor: { lat: 8.2056, lng: 77.4944 },
  Mulagumoodu: { lat: 8.2396, lng: 77.2842 },
  Mylaudy: { lat: 8.1417, lng: 77.5028 },
  Nalloor: { lat: 8.2833, lng: 77.2 },
  Neyyoor: { lat: 8.2045, lng: 77.3112 },
  Pacode: { lat: 8.3167, lng: 77.1833 },
  Palapallam: { lat: 8.212, lng: 77.24 },
  Palugal: { lat: 8.3333, lng: 77.1333 },
  Ponmanai: { lat: 8.3512, lng: 77.3045 },
  Puthalam: { lat: 8.1064, lng: 77.4721 },
  Puthukadai: { lat: 8.2667, lng: 77.1667 },
  Reethapuram: { lat: 8.2167, lng: 77.2667 },
  'South Thamaraikulam': { lat: 8.125, lng: 77.5167 },
  Suchindram: { lat: 8.1561, lng: 77.465 },
  Thazhakudi: { lat: 8.225, lng: 77.4667 },
  Thengamputhoor: { lat: 8.1083, lng: 77.45 },
  Theroor: { lat: 8.1667, lng: 77.4667 },
  Thirparappu: { lat: 8.385, lng: 77.2628 },
  Thiruvattar: { lat: 8.3314, lng: 77.2642 },
  Thiruvithancode: { lat: 8.2333, lng: 77.2833 },
  Thuckalay: { lat: 8.2458, lng: 77.3235 },
  Unnamalaikadai: { lat: 8.3, lng: 77.1833 },
  Valvathachagostam: { lat: 8.25, lng: 77.25 },
  Vellimalai: { lat: 8.1833, lng: 77.3167 },
  Verkizhambi: { lat: 8.2833, lng: 77.25 },
  Vilaloor: { lat: 8.25, lng: 77.31 },
  Villukuri: { lat: 8.211, lng: 77.3514 },
  Muttom: { lat: 8.1264, lng: 77.3168 },
  Chothavilai: { lat: 8.0931, lng: 77.426 },
  Keeriparai: { lat: 8.3833, lng: 77.4 },
  Pechiparai: { lat: 8.4419, lng: 77.3117 },
  Rajakkamangalam: { lat: 8.1189, lng: 77.3697 },
  Kurunthancode: { lat: 8.212, lng: 77.34 },
  Melpuram: { lat: 8.3333, lng: 77.2167 },
  Vilavancode: { lat: 8.3333, lng: 77.2 },
};

export const CITIES_LIST = Object.keys(KANYAKUMARI_CITIES).sort();

const normalizeCity = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');

const CITY_LOOKUP = Object.entries(KANYAKUMARI_CITIES).reduce<Record<string, { lat: number; lng: number }>>(
  (lookup, [city, coords]) => {
    lookup[normalizeCity(city)] = coords;
    return lookup;
  },
  {}
);

CITY_LOOKUP[normalizeCity('Kurunthan code')] = KANYAKUMARI_CITIES.Kurunthancode;
CITY_LOOKUP[normalizeCity('Kurunthan Code')] = KANYAKUMARI_CITIES.Kurunthancode;
CITY_LOOKUP[normalizeCity('Kurunthancode')] = KANYAKUMARI_CITIES.Kurunthancode;

export const getKanyakumariCityCoords = (city?: string | null) => {
  if (!city) return null;
  return CITY_LOOKUP[normalizeCity(city)] || null;
};

export const shouldNotifyInstantWorker = ({
  worker,
  trade,
  sourceLat,
  sourceLng,
}: {
  worker: any;
  trade: string;
  sourceLat: number;
  sourceLng: number;
}) => {
  if (!worker?.isAvailable || !worker?.fcmToken) return false;

  const tradeProfile = worker.trades?.[trade];
  if (!tradeProfile) return false;

  const gpsLat = Number(tradeProfile.latitude ?? worker.latitude);
  const gpsLng = Number(tradeProfile.longitude ?? worker.longitude);
  const hasGpsLocation = Number.isFinite(gpsLat) && Number.isFinite(gpsLng);
  const isWithinGpsRange = hasGpsLocation
    ? getDistance(sourceLat, sourceLng, gpsLat, gpsLng) <= 15
    : false;

  const cityCoords = getKanyakumariCityCoords(tradeProfile.city || worker.city);
  const isWithinCityRange = cityCoords
    ? getDistance(sourceLat, sourceLng, cityCoords.lat, cityCoords.lng) <= 8
    : false;

  return isWithinGpsRange || isWithinCityRange;
};
