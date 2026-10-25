import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThreatMap } from "./ThreatMap";
import {
  Shield,
  Radar,
  Globe2,
  Search,
  ExternalLink,
  RefreshCw,
  Database,
  AlertTriangle,
  Crosshair,
  Activity,
} from "lucide-react";
import { matches, sourceFresh, validateData, type Intelligence } from "./data";
import "leaflet/dist/leaflet.css";
import "./style.css";

function App() {
  const [data, setData] = useState<Intelligence>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<
    "overview" | "indicators" | "vulnerabilities" | "sources"
  >("overview");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}data/intelligence.json`,
        { cache: "no-store" },
      );
      if (!response.ok)
        throw new Error(`Data request failed (${response.status})`);
      setData(validateData(await response.json()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load intelligence");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const indicators = (data?.indicators ?? []).filter((r) =>
    matches(query, [r.ip, r.malware, r.country, r.status, r.port]),
  );
  const cves = (data?.vulnerabilities ?? []).filter((r) =>
    matches(query, [r.id, r.vendor, r.product, r.title, r.description]),
  );
  const mapped = indicators.filter((r) => r.location);
  const healthy = Object.values(data?.sources ?? {}).filter((s) =>
    sourceFresh(s),
  ).length;
  const nav = [
    ["overview", "Overview", Radar],
    ["indicators", "Threat indicators", Crosshair],
    ["vulnerabilities", "Exploited CVEs", AlertTriangle],
    ["sources", "Data sources", Database],
  ] as const;
  return (
    <div className="app">
      <aside>
        <a className="brand" href="#" onClick={() => setTab("overview")}>
          <Shield size={33} />
          <span>
            BlueSignal's<span className="brand-sub">Threat Map</span>
          </span>
        </a>
        <div className="workspace-label">INTELLIGENCE WORKSPACE</div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={tab === id ? "selected" : ""}
              onClick={() => {
                setTab(id);
                setQuery("");
                setPage(0);
              }}
            >
              <Icon size={18} />
              {label}
              {id === "overview" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="aside-bottom">
          <Shield size={19} />
          <div>
            Public intelligence<span>Evidence. Context. Defense.</span>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            BlueSignal's Threat Map <span>/</span> Threat Intelligence
          </div>
          <div className="header-state">
            <span className={healthy === 2 ? "dot" : "dot amber"} />
            {healthy === 2 ? "Feeds current" : "Feed status needs attention"}
          </div>
        </header>
        <div className="content">
          <div className="title-row">
            <div>
              <div className="eyebrow">GLOBAL THREAT VISIBILITY</div>
              <h1>{nav.find((n) => n[0] === tab)?.[1]}</h1>
              <p>
                Actionable intelligence. A clearer view of the threat landscape.
              </p>
            </div>
            <button
              className="refresh"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} />
              {loading ? "Refreshing…" : "Refresh snapshot"}
            </button>
          </div>
          {error && (
            <div role="alert" className="notice">
              {error} <button onClick={() => void load()}>Retry</button>
            </div>
          )}
          {data && healthy < 2 && (
            <div className="notice">
              <AlertTriangle size={16} />
              Some feeds are unavailable or older than 48 hours. Retained
              records may be stale; see Data sources for collection details.
            </div>
          )}
          <section className="stats">
            <Stat
              label="C2 INDICATORS"
              value={data?.indicators.length}
              icon={<Crosshair />}
              note="Feodo Tracker · reported endpoints"
            />
            <Stat
              label="EXPLOITED VULNERABILITIES"
              value={data?.vulnerabilities.length}
              icon={<AlertTriangle />}
              note="CISA Known Exploited Vulnerabilities"
            />
            <Stat
              label="COUNTRIES OBSERVED"
              value={
                data
                  ? new Set(
                      data.indicators
                        .map((i) => i.country)
                        .filter((c) => c && c !== "Unknown"),
                    ).size
                  : undefined
              }
              icon={<Globe2 />}
              note="Countries reported by source"
            />
            <Stat
              label="CURRENT FEEDS"
              value={data ? `${healthy} / 2` : undefined}
              icon={<Activity />}
              note="Successful collection within 48 hours"
            />
          </section>
          {(tab === "overview" || tab === "indicators") && (
            <section className="panel map-panel">
              <div className="panel-title">
                <div>
                  <h2>
                    <Globe2 size={18} />
                    Global command & control activity
                  </h2>
                  <p>Reported infrastructure · approximate IP locations</p>
                </div>
                <span className="pill">{mapped.length} mapped endpoints</span>
              </div>
              <div className="map">
                <ThreatMap indicators={mapped} />
                {!mapped.length && (
                  <div className="map-empty">
                    {loading
                      ? "Loading intelligence…"
                      : "No geolocated indicators available"}
                    <small>
                      Only verified source records appear on this map.
                    </small>
                  </div>
                )}
              </div>
              <div className="map-footer">
                <span>
                  <i />
                  Reported C2 endpoint
                </span>
                <span>
                  IP location does not establish attacker origin ·{" "}
                  {indicators.length - mapped.length} without coordinates
                </span>
              </div>
            </section>
          )}
          {(tab === "overview" ||
            tab === "indicators" ||
            tab === "vulnerabilities") && (
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h2>
                    {tab === "indicators"
                      ? "Threat indicators"
                      : "Known exploited vulnerabilities"}
                  </h2>
                  <p>
                    {tab === "indicators"
                      ? "Investigate source-reported command and control endpoints."
                      : "Prioritize remediation using the CISA KEV catalog."}
                  </p>
                </div>
                <span className="pill">
                  {(tab === "indicators"
                    ? indicators
                    : cves
                  ).length.toLocaleString()}{" "}
                  records
                </span>
              </div>
              <label className="search">
                <Search size={17} />
                <input
                  aria-label="Search intelligence"
                  placeholder={
                    tab === "indicators"
                      ? "Search IP, malware, country or port…"
                      : "Search CVE, vendor, product or description…"
                  }
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                />
                <kbd>SEARCH</kbd>
              </label>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {(tab === "indicators"
                        ? [
                            "INDICATOR",
                            "MALWARE",
                            "COUNTRY",
                            "STATUS",
                            "LAST ONLINE",
                          ]
                        : [
                            "CVE ID",
                            "VENDOR / PRODUCT",
                            "VULNERABILITY",
                            "RANSOMWARE",
                            "DATE ADDED",
                          ]
                      ).map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tab === "indicators"
                      ? indicators.slice(page * 20, page * 20 + 20).map((r) => (
                          <tr key={`${r.ip}:${r.port}`}>
                            <td className="mono">
                              {r.ip}
                              <span className="muted">:{r.port}</span>
                            </td>
                            <td>{r.malware}</td>
                            <td>{r.country}</td>
                            <td>
                              <span className="tag">{r.status}</span>
                            </td>
                            <td>{r.lastSeen || "Unknown"}</td>
                          </tr>
                        ))
                      : cves.slice(page * 20, page * 20 + 20).map((r) => (
                          <tr key={r.id}>
                            <td>
                              <a
                                className="cve-link"
                                href={`https://nvd.nist.gov/vuln/detail/${r.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {r.id}
                                <ExternalLink size={12} />
                              </a>
                            </td>
                            <td>
                              {r.vendor}
                              <small>{r.product}</small>
                            </td>
                            <td>
                              <details>
                                <summary>{r.title}</summary>
                                <p>{r.description}</p>
                                <p>
                                  <strong>Required action:</strong> {r.action}
                                </p>
                                <p>Due: {r.dueDate}</p>
                              </details>
                            </td>
                            <td>
                              <span
                                className={
                                  r.ransomware === "Known"
                                    ? "tag danger"
                                    : "tag"
                                }
                              >
                                {r.ransomware}
                              </span>
                            </td>
                            <td>{r.dateAdded}</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
                {(tab === "indicators" ? indicators : cves).length === 0 && (
                  <div className="empty">
                    {loading
                      ? "Loading source records…"
                      : query
                        ? "No records match your search."
                        : "No source records available. Check feed status for details."}
                  </div>
                )}
              </div>
              <div className="pagination">
                <span>
                  Page {page + 1} of{" "}
                  {Math.max(
                    1,
                    Math.ceil(
                      (tab === "indicators" ? indicators : cves).length / 20,
                    ),
                  )}
                </span>
                <div>
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    disabled={
                      (page + 1) * 20 >=
                      (tab === "indicators" ? indicators : cves).length
                    }
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          )}
          {tab === "sources" && (
            <section className="panel sources">
              <h2>Source transparency</h2>
              <p>
                Refresh reloads the published snapshot. Scheduled GitHub Actions
                collect upstream data every six hours.
              </p>
              {Object.entries(data?.sources ?? {}).map(([name, s]) => (
                <article key={name}>
                  <h3>
                    {name === "cisa" ? "CISA KEV" : "Feodo Tracker"}{" "}
                    <span className={sourceFresh(s) ? "tag" : "tag danger"}>
                      {sourceFresh(s)
                        ? "Current"
                        : s.status === "error"
                          ? "Collection failed"
                          : "Stale"}
                    </span>
                  </h3>
                  <p>
                    Last successful collection:{" "}
                    {s.lastSuccess
                      ? new Date(s.lastSuccess).toLocaleString()
                      : "Never"}{" "}
                    · {s.count} records
                  </p>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    Upstream source <ExternalLink size={12} />
                  </a>
                  {s.error && <p className="source-error">{s.error}</p>}
                </article>
              ))}
              <article>
                <h3>
                  URLhaus & ThreatFox <span className="tag">Disabled</span>
                </h3>
                <p>
                  Not collected or redistributed. API authentication, licensing,
                  and redistribution terms must be verified before activation.
                  No credentials are embedded in this application.
                </p>
                <a
                  href="https://urlhaus.abuse.ch/api/"
                  target="_blank"
                  rel="noreferrer"
                >
                  URLhaus API
                </a>{" "}
                ·{" "}
                <a
                  href="https://threatfox.abuse.ch/api/"
                  target="_blank"
                  rel="noreferrer"
                >
                  ThreatFox API
                </a>
              </article>
              <article>
                <h3>Geolocation & map</h3>
                <p>
                  Optional server-side IP geolocation uses ipwho.is. Coordinates
                  are approximate and may identify hosting providers. Map tiles
                  use CARTO’s label-free dark style, with English country and
                  city names from Natural Earth. Viewing the map sends tile
                  requests to that service.
                </p>
              </article>
            </section>
          )}
          <footer>
            <span>
              <Shield size={13} /> BlueSignal's Threat Map{" "}
              <span className="muted">/ Threat Intelligence</span>
            </span>
            <span>
              Snapshot:{" "}
              {data
                ? new Date(data.generatedAt).toLocaleString()
                : "Unavailable"}
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
function Stat({
  label,
  value,
  icon,
  note,
}: {
  label: string;
  value?: number | string;
  icon: React.ReactNode;
  note: string;
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        {label}
        {icon}
      </div>
      <strong>{value === undefined ? "—" : value.toLocaleString()}</strong>
      <p>{note}</p>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
