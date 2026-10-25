#!/usr/bin/env python3
"""Collect public intelligence, atomically retaining last good data on failures."""
import argparse
import ipaddress
import json
import os
from pathlib import Path
import time
from datetime import datetime, timezone
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
FEODO = 'https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json'
KEV = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'
KEV_MIRROR = 'https://raw.githubusercontent.com/cisagov/kev-data/main/known_exploited_vulnerabilities.json'

def now():
    return datetime.now(timezone.utc).isoformat()

def fetch(url):
    request = Request(url, headers={'User-Agent': 'OffensiveDefenders-TIC/1.0 (public threat research)'})
    with urlopen(request, timeout=30) as response:
        return json.load(response)

def normalize_feodo(rows):
    if not isinstance(rows, list):
        raise ValueError('Expected Feodo list')
    result = []
    for row in rows:
        address = str(ipaddress.ip_address(row['ip_address']))
        port = int(row['port'])
        if not 1 <= port <= 65535:
            raise ValueError('Invalid port')
        result.append({'ip': address, 'port': port, 'malware': str(row.get('malware', 'Unknown')),
                       'country': str(row.get('country', 'Unknown')), 'status': str(row.get('status', 'unknown')),
                       'firstSeen': str(row.get('first_seen', '')), 'lastSeen': str(row.get('last_online', '')),
                       'source': 'Feodo Tracker'})
    return result

def normalize_kev(payload):
    rows = payload['vulnerabilities']
    if not isinstance(rows, list) or not rows:
        raise ValueError('Empty or invalid KEV catalog')
    result = []
    for row in rows:
        cve = row['cveID']
        import re
        if not re.fullmatch(r'CVE-\d{4}-\d{4,}', cve):
            raise ValueError('Invalid CVE identifier')
        result.append({'id': cve, 'vendor': row['vendorProject'], 'product': row['product'],
                       'title': row['vulnerabilityName'], 'description': row['shortDescription'],
                       'dateAdded': row['dateAdded'], 'dueDate': row['dueDate'],
                       'action': row['requiredAction'],
                       'ransomware': row.get('knownRansomwareCampaignUse', 'Unknown'), 'source': 'CISA KEV'})
    return result

def geolocate(rows, cache, limit=100):
    """Public IP lookup only; cache coordinates, never send browser/user IPs."""
    lookups = 0
    for row in rows:
        ip = row['ip']
        if not ipaddress.ip_address(ip).is_global:
            continue
        if ip not in cache and lookups < limit:
            lookups += 1
            try:
                data = fetch('https://ipwho.is/' + ip)
                if data.get('success') and isinstance(data.get('latitude'), (int, float)) and isinstance(data.get('longitude'), (int, float)):
                    cache[ip] = {'lat': data['latitude'], 'lon': data['longitude'], 'country': data.get('country', ''), 'resolvedAt': now()}
            except Exception as error:
                print(f'Geolocation unavailable: {type(error).__name__}')
            time.sleep(1)
        if ip in cache:
            geo = cache[ip]
            if -90 <= geo['lat'] <= 90 and -180 <= geo['lon'] <= 180:
                row['location'] = geo
    return rows

def save(path, payload):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(payload, indent=2) + '\n')
    os.replace(temporary, path)

def collect(output, with_geo=False):
    output.mkdir(parents=True, exist_ok=True)
    target = output / 'intelligence.json'
    previous = json.loads(target.read_text()) if target.exists() else {}
    document = {'generatedAt': now(), 'indicators': previous.get('indicators', []), 'vulnerabilities': previous.get('vulnerabilities', []), 'sources': {}}
    failures = 0
    for name, key, urls, parser in [('feodo', 'indicators', [FEODO], normalize_feodo), ('cisa', 'vulnerabilities', [KEV, KEV_MIRROR], normalize_kev)]:
        errors = []
        for url in urls:
            try:
                document[key] = parser(fetch(url))
                document['sources'][name] = {'status': 'ok', 'lastSuccess': now(), 'url': url, 'count': len(document[key])}
                break
            except Exception as error:
                errors.append(f'{type(error).__name__}: {error}')
        else:
            failures += 1
            prior = previous.get('sources', {}).get(name, {})
            document['sources'][name] = {'status': 'error', 'lastSuccess': prior.get('lastSuccess'), 'url': urls[0], 'count': len(document[key]), 'error': '; '.join(errors)}
    if with_geo:
        cache_path = output / 'geolocation.json'
        cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
        geolocate(document['indicators'], cache)
        save(cache_path, cache)
    else:
        old_locations = {r['ip']: r['location'] for r in previous.get('indicators', []) if 'location' in r}
        for row in document['indicators']:
            if row['ip'] in old_locations:
                row['location'] = old_locations[row['ip']]
    save(target, document)
    print(json.dumps(document['sources'], indent=2))
    return failures

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT / 'public/data')
    parser.add_argument('--geolocate', action='store_true')
    args = parser.parse_args()
    raise SystemExit(1 if collect(args.output, args.geolocate) else 0)
