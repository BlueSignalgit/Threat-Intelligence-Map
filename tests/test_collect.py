import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from scripts.collect import collect, normalize_feodo, normalize_kev, geolocate

# Synthetic reserved addresses are test fixtures only; never published.
class CollectorTests(unittest.TestCase):
    def test_feodo_normalizes_and_rejects_invalid(self):
        result = normalize_feodo([{'ip_address':'192.0.2.1','port':'443','malware':'fixture'}])
        self.assertEqual(result[0]['port'],443)
        with self.assertRaises(ValueError): normalize_feodo([{'ip_address':'invalid','port':443}])
        with self.assertRaises(ValueError): normalize_feodo([{'ip_address':'192.0.2.1','port':70000}])

    def test_kev_rejects_empty_or_invalid(self):
        with self.assertRaises(ValueError): normalize_kev({'vulnerabilities':[]})
        with self.assertRaises(ValueError): normalize_kev({'vulnerabilities':[{'cveID':'bad'}]})

    def test_failure_preserves_last_good_and_marks_error(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)
            old={'indicators':[{'ip':'192.0.2.1','port':443}], 'vulnerabilities':[], 'sources':{'feodo':{'lastSuccess':'2025-01-01T00:00:00Z'}}}
            (path/'intelligence.json').write_text(json.dumps(old))
            with patch('scripts.collect.fetch',side_effect=OSError('offline')):
                self.assertEqual(collect(path),2)
            result=json.loads((path/'intelligence.json').read_text())
            self.assertEqual(result['indicators'],old['indicators'])
            self.assertEqual(result['sources']['feodo']['status'],'error')
            self.assertEqual(result['sources']['feodo']['lastSuccess'],'2025-01-01T00:00:00Z')

    def test_successful_empty_feodo_clears_stale_records(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch('scripts.collect.fetch',return_value=[]):
                collect(Path(directory))
            data=json.loads((Path(directory)/'intelligence.json').read_text())
            self.assertEqual(data['sources']['feodo']['status'],'ok')
            self.assertEqual(data['indicators'],[])

    def test_private_addresses_never_geolocated(self):
        with patch('scripts.collect.fetch') as fetch:
            geolocate([{'ip':'127.0.0.1'}],{})
            fetch.assert_not_called()

if __name__=='__main__': unittest.main()
