# Source access and terms verification

Verified 2026-10-25 via HTTPS. These notes record observed provider documentation, not a grant of rights beyond that documentation.

| Source        | Verified access                                                                                                         | Use in application                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Feodo Tracker | Recommended JSON endpoint returned HTTP 200; real records collected                                                     | Enabled. abuse.ch Terms of Use section 3.4 explicitly exempts Feodo Tracker and identifies CC0 use for commercial and noncommercial purposes.  |
| CISA KEV      | Official CISA GitHub mirror returned real catalog; primary www.cisa.gov endpoint was inaccessible from this environment | Enabled with provenance and official mirror fallback. CISA catalog is a US government public resource.                                         |
| ipwho.is      | HTTPS lookup returned coordinates for the source-reported public indicator                                              | Optional collection enrichment; bounded to 100 new IPs per run, cached. No bulk-provider service guarantee is assumed.                         |
| URLhaus       | Community API documentation returned HTTP 200                                                                           | Disabled. Documentation requires an Auth-Key. Authenticated API access was not tested because no abuse.ch key binding was configured.          |
| ThreatFox     | Community API documentation returned HTTP 200                                                                           | Disabled. Documentation requires Auth-Key HTTP header. Authenticated API access was not tested because no abuse.ch key binding was configured. |

## URLhaus / ThreatFox decision

Reviewed:

- https://urlhaus.abuse.ch/api/
- https://threatfox.abuse.ch/api/
- https://abuse.ch/terms-of-use/ (page states last updated 21 October 2026)

Both community API pages refer to fair-use principles and state that commercial or for-profit use may require a paid enhanced API subscription. General terms sections 3 and 4 describe not-for-profit usage limits and commercial subscriptions. The explicit CC0 exception in section 3.4 lists Feodo Tracker, SSL Blacklist, and YARAify; it does **not** list URLhaus or ThreatFox. We did not establish a blanket license for public redistribution of URLhaus or ThreatFox datasets in a static GitHub Pages site. Free API availability alone is insufficient to establish redistribution rights.

Before enabling either service, the owner must confirm its eligibility and public redistribution rights with abuse.ch/Spamhaus, obtain the required credentials through secure repository/environment secrets, verify an authenticated read-only request and current rate limits, and implement server-side collection with attribution and expiry handling. ThreatFox documentation states that indicators older than six months expire from API/export results. Do not put credentials into public exports or authentication-bearing download URLs in logs. No secret requirement is added while these integrations are disabled.

## Map

Leaflet displays CARTO Dark Matter label-free tiles, with visible OpenStreetMap and CARTO attribution and normal browser caching. No raster labels are requested. English country/city names are rendered separately from bundled Natural Earth `NAME_EN` fields. Sources: https://github.com/CartoDB/basemap-styles and https://carto.com/attributions . Requests use HTTPS; no offline tile downloading or prefetching is implemented. Loading the map shares normal request metadata with CARTO. Locations indicate infrastructure, not an attacker's physical location. Review CARTO's current basemap terms and service capacity if traffic grows.

Bundled country boundaries are Natural Earth 1:110m admin-0 geometry, public domain: https://www.naturalearthdata.com/about/terms-of-use/ . Retrieved from the official Natural Earth vector repository (https://github.com/nvkelso/natural-earth-vector). Properties are reduced to country names; geometry is unchanged. Boundaries provide context if remote tile requests fail and do not imply political endorsement.

English country labels use `NAME_EN`, `LABEL_X`, `LABEL_Y`, and `LABELRANK` from Natural Earth `ne_110m_admin_0_countries.geojson`. English city labels use `NAME_EN` (falling back to `NAMEASCII`), point coordinates, and `SCALERANK` from `ne_110m_populated_places.geojson`. Retrieved from the official Natural Earth vector repository on 2026-10-25; all geography is public domain. Only English label text, coordinates, rank, and label kind are retained in `public/data/map-labels.en.json`. No threat data is synthesized.
