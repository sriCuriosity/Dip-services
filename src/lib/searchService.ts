
export interface SearchResult {
  display_name: string;
  lat: number;
  lon: number;
  type?: string;
  region?: string;
  magicKey?: string; // Used for ArcGIS resolution
  isSuggestion?: boolean;
}

// Bounding box for Tamil Nadu, India (Strict Focus)
const TN_BBOX = {
  minLat: 8.07,
  maxLat: 13.55,
  minLng: 76.23,
  maxLng: 80.34,
};

/**
 * Strictly check if coordinates fall within Tamil Nadu bounds
 */
const isWithinTN = (lat: number, lon: number) => {
  return lat >= TN_BBOX.minLat && lat <= TN_BBOX.maxLat && lon >= TN_BBOX.minLng && lon <= TN_BBOX.maxLng;
};

export const SearchService = {
  /**
   * 1. Get real-time Suggestions (Place Autocomplete style)
   */
  async suggest(query: string, proximity?: { lat: number; lon: number }): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];

    const cleanQuery = query.trim();
    const bboxString = `${TN_BBOX.minLng},${TN_BBOX.minLat},${TN_BBOX.maxLng},${TN_BBOX.maxLat}`;
    
    try {
      // PHASE A: Photon (OSM Autocomplete) — Excellent for POIs (Temples, Schools, Colleges)
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=10&lang=en&bbox=${bboxString}`;
      const photonRes = await fetch(photonUrl);
      const photonData = await photonRes.json();

      let results: SearchResult[] = [];

      if (photonData.features) {
        results = photonData.features.map((f: any) => {
          const p = f.properties;
          const mainName = p.name || p.street || p.city || p.town;
          const subText = [p.street, p.city || p.town || p.district, 'Tamil Nadu'].filter(Boolean).filter(s => s !== mainName);
          
          return {
            display_name: `${mainName}, ${subText.join(', ')}`,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            type: p.osm_value || p.type || p.category,
            isSuggestion: false
          };
        });
      }

      // PHASE B: ArcGIS Suggest — Robust for Addresses and Neighborhoods
      const locBias = proximity ? `&location=${proximity.lon},${proximity.lat}&distance=50000` : '';
      const searchExtent = encodeURIComponent(
        JSON.stringify({
          xmin: TN_BBOX.minLng, ymin: TN_BBOX.minLat,
          xmax: TN_BBOX.maxLng, ymax: TN_BBOX.maxLat,
          spatialReference: { wkid: 4326 }
        })
      );
      
      const arcgisSuggestUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?text=${encodeURIComponent(cleanQuery)}&f=json&maxSuggestions=10&countryCode=IND&category=Landmark,Education,School,College,University,Hospital,Medical,Business,Shop,Public Institution,Neighborhood,Address,City&searchExtent=${searchExtent}${locBias}`;
      
      const arcRes = await fetch(arcgisSuggestUrl);
      const arcData = await arcRes.json();

      if (arcData.suggestions) {
        const arcResults = arcData.suggestions.map((s: any) => ({
          display_name: s.text,
          magicKey: s.magicKey,
          isSuggestion: true,
          lat: 0,
          lon: 0
        }));
        results = [...results, ...arcResults];
      }

      // Post-filter as a safety net
      const filtered = results.filter(r => 
        r.isSuggestion || (r.lat >= TN_BBOX.minLat && r.lat <= TN_BBOX.maxLat && r.lon >= TN_BBOX.minLng && r.lon <= TN_BBOX.maxLng)
      );

      return filtered.slice(0, 15);
    } catch (err) {
      console.warn('POI search error:', err);
    }
    return [];
  },

  /**
   * 2. Resolve a suggestion to Coordinates
   */
  async resolve(suggestion: SearchResult): Promise<SearchResult | null> {
    if (!suggestion.magicKey) return suggestion; 

    try {
      // Precise candidate resolution
      const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?magicKey=${suggestion.magicKey}&SingleLine=${encodeURIComponent(suggestion.display_name)}&f=json&outFields=Match_addr,Addr_type,Region,Type&maxLocations=1`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.candidates && data.candidates.length > 0) {
        const c = data.candidates[0];
        
        // Final geographic safeguard
        if (!isWithinTN(c.location.y, c.location.x)) {
           const searchExtent = JSON.stringify({
             xmin: TN_BBOX.minLng, ymin: TN_BBOX.minLat,
             xmax: TN_BBOX.maxLng, ymax: TN_BBOX.maxLat,
             spatialReference: { wkid: 4326 }
           });
           const fallbackUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(suggestion.display_name)}&f=json&searchExtent=${encodeURIComponent(searchExtent)}&maxLocations=1`;
           const fbRes = await fetch(fallbackUrl);
           const fbData = await fbRes.json();
           if (fbData.candidates && fbData.candidates.length > 0) {
             const fb = fbData.candidates[0];
             if (isWithinTN(fb.location.y, fb.location.x)) {
               return {
                  display_name: fb.address,
                  lat: fb.location.y,
                  lon: fb.location.x,
                  type: fb.attributes.Type || fb.attributes.Addr_type
               };
             }
           }
           return null; // Outside TN
        }

        return {
          display_name: c.address,
          lat: c.location.y,
          lon: c.location.x,
          type: c.attributes.Type || c.attributes.Addr_type,
          region: c.attributes.Region
        };
      }
    } catch (err) {
      console.error('Resolve error:', err);
    }
    return null;
  },

  /**
   * 3. Helper to search directly for an address string (Used for routing destinations)
   */
  async search(query: string): Promise<SearchResult[]> {
    const suggestions = await this.suggest(query);
    if (!suggestions.length) return [];
    
    const resolved = await Promise.all(
      suggestions.slice(0, 3).map(s => this.resolve(s))
    );
    
    return resolved.filter((r): r is SearchResult => r !== null);
  },

  async reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
      const res = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${lon},${lat}&f=json&langCode=en,ta&outFields=Address,Neighborhood,District,City,Subregion,Region,Postal`);
      const data = await res.json();
      
      if (data.address) {
        const a = data.address;
        const parts = [a.Address, a.Neighborhood, a.District, a.City, a.Subregion, a.Region, a.Postal].filter(Boolean);
        const unique = Array.from(new Set(parts));
        return unique.length >= 2 ? unique.join(', ') : a.LongLabel || 'Selected Location';
      }
      
      const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=en,ta`);
      const nomData = await nomRes.json();
      if (nomData.address) {
        const n = nomData.address;
        const parts = [n.house_number, n.road, n.suburb, n.village, n.town, n.city, n.district, n.state].filter(Boolean);
        return parts.join(', ');
      }
      return 'Selected Location';
    } catch {
      return 'Selected Location';
    }
  }
};
