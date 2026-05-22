
async function testSearch() {
  const query = "Madurai, Tamil Nadu";
  const arcgisSearchUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(query)}&f=json&outFields=Match_addr,Addr_type,Region&maxLocations=5&countryCode=IND&langCode=en,ta`;
  
  try {
    const res = await fetch(arcgisSearchUrl);
    const data = await res.json();
    console.log("ArcGIS results for Madurai:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

testSearch();
