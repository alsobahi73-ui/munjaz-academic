import hashlib
from http.cookiejar import CookieJar
import json
from pathlib import Path
import sqlite3
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import build_opener, HTTPCookieProcessor, Request
from concurrent.futures import ThreadPoolExecutor
from server import make_server, VisitorStore


class ServerTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory(prefix='munjiz-counter-')
        self.db = Path(self.folder.name) / 'visitors.sqlite3'
        self.server = make_server(port=0, db_path=self.db)
        self.server.RequestHandlerClass.func.log_message = lambda *args: None
        self.worker = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.worker.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}'
        self.cookies = CookieJar()
        self.client = build_opener(HTTPCookieProcessor(self.cookies))

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.worker.join()
        self.folder.cleanup()

    def visit(self, client=None):
        return (client or self.client).open(Request(self.url + '/api/visitors', data=b'{}', headers={'Content-Type': 'application/json'}))

    def test_cookie_deduplication_persistence_and_no_personal_fields(self):
        self.assertEqual(json.load(self.client.open(self.url + '/api/visitors'))['visitors'], 0)
        first = self.visit()
        self.assertEqual(json.load(first)['visitors'], 1)
        self.assertIn('HttpOnly', first.headers['Set-Cookie'])
        self.assertIn('SameSite=Lax', first.headers['Set-Cookie'])
        token = next(iter(self.cookies)).value
        self.assertEqual(json.load(self.visit())['visitors'], 1)
        self.assertEqual(VisitorStore(self.db).count(), 1)
        fresh = build_opener(HTTPCookieProcessor(CookieJar()))
        self.assertEqual(json.load(self.visit(fresh))['visitors'], 2)
        with sqlite3.connect(self.db) as connection:
            self.assertEqual([row[1] for row in connection.execute('PRAGMA table_info(visitors)')], ['token_hash'])
            self.assertIn((hashlib.sha256(token.encode()).hexdigest(),), list(connection.execute('SELECT * FROM visitors')))

    def test_private_paths_and_vendor_traversal_are_not_public(self):
        self.assertEqual(self.client.open(self.url + '/').status, 200)
        self.assertEqual(self.client.open(self.url + '/service-assistant.js').status, 200)
        for path in ['/.git/config', '/.local/visitors.sqlite3', '/server.py', '/tests/test_server.py', '/vendor/../server.py', '/vendor/%2e%2e/server.py', '/vendor/']:
            with self.assertRaises(HTTPError) as failure: self.client.open(self.url + path)
            self.assertEqual(failure.exception.code, 404, path)

    def test_rejected_requests_do_not_change_count(self):
        for body, headers, expected in [
            (b'{}', {'Content-Type': 'application/json', 'Origin': 'https://other.example'}, 403),
            (b'{', {'Content-Type': 'application/json'}, 400),
            (b'{"email":"not-stored@example.com"}', {'Content-Type': 'application/json'}, 400),
            (b'a' * 129, {'Content-Type': 'application/json'}, 413),
            (b'{}', {'Content-Type': 'text/plain'}, 415),
        ]:
            with self.assertRaises(HTTPError) as failure:
                self.client.open(Request(self.url + '/api/visitors', data=body, headers=headers))
            self.assertEqual(failure.exception.code, expected)
        self.assertEqual(VisitorStore(self.db).count(), 0)

    def test_concurrent_repeat_visits_do_not_double_count(self):
        store = VisitorStore(self.db)
        _, token = store.visit(None)
        with ThreadPoolExecutor(max_workers=6) as pool:
            counts = list(pool.map(lambda _: store.visit(token)[0], range(20)))
        self.assertEqual(counts, [1] * 20)
        self.assertEqual(store.count(), 1)


if __name__ == '__main__': unittest.main()
