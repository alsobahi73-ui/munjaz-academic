"""Static site and an anonymous browser counter; Python standard library only."""
import argparse
from functools import partial
import hashlib
from http.cookies import CookieError, SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
PUBLIC_FILES = {'index.html', 'tools.html', 'services.html', 'styles.css', 'app.js', 'tool-directory.js', 'quiz-core.js', 'quiz-export.js', 'service-assistant.js', 'services-catalog.js', 'services-page.js', 'visitor-counter.js'}
COOKIE = 'munjiz_visitor'


class VisitorStore:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.path) as connection:
            connection.execute('PRAGMA journal_mode=WAL')
            connection.execute('CREATE TABLE IF NOT EXISTS visitors (token_hash TEXT PRIMARY KEY)')

    def count(self):
        with sqlite3.connect(self.path) as connection:
            return connection.execute('SELECT COUNT(*) FROM visitors').fetchone()[0]

    def visit(self, token):
        digest = hashlib.sha256(token.encode()).hexdigest() if re.fullmatch(r'[0-9a-f]{64}', token or '') else None
        with sqlite3.connect(self.path, timeout=10) as connection:
            connection.execute('BEGIN IMMEDIATE')
            known = digest and connection.execute('SELECT 1 FROM visitors WHERE token_hash=?', (digest,)).fetchone()
            new_token = None
            if not known:
                new_token = secrets.token_hex(32)
                digest = hashlib.sha256(new_token.encode()).hexdigest()
                connection.execute('INSERT INTO visitors(token_hash) VALUES (?)', (digest,))
            count = connection.execute('SELECT COUNT(*) FROM visitors').fetchone()[0]
        return count, new_token


def make_server(host='127.0.0.1', port=8000, db_path=None, secure_cookies=False):
    store = VisitorStore(db_path or ROOT / '.local' / 'visitors.sqlite3')

    class Handler(SimpleHTTPRequestHandler):
        def end_headers(self):
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Cache-Control', 'no-cache')
            super().end_headers()

        def json_response(self, status, data, cookie=None):
            body = json.dumps(data, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            if cookie:
                value = f'{COOKIE}={cookie}; Path=/; Max-Age=7776000; HttpOnly; SameSite=Lax'
                if secure_cookies: value += '; Secure'
                self.send_header('Set-Cookie', value)
            self.end_headers()
            self.wfile.write(body)

        def public_path(self):
            path = unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
            parts = Path(path).parts
            if any(part.startswith('.') for part in parts): return False
            if path not in PUBLIC_FILES and not path.startswith('vendor/'): return False
            target = (ROOT / path).resolve()
            return target.is_relative_to(ROOT) and target.is_file()

        def do_GET(self):
            if urlsplit(self.path).path == '/api/visitors':
                try: self.json_response(200, {'visitors': store.count(), 'metric': 'anonymous_browsers'})
                except sqlite3.Error: self.json_response(503, {'error': 'Counter unavailable'})
            elif self.public_path(): super().do_GET()
            else: self.send_error(404)

        def do_HEAD(self):
            if self.public_path(): super().do_HEAD()
            else: self.send_error(404)

        def do_POST(self):
            if urlsplit(self.path).path != '/api/visitors':
                self.send_error(404); return
            origin = self.headers.get('Origin')
            if origin:
                parsed = urlsplit(origin)
                if parsed.scheme not in ('http', 'https') or parsed.netloc != self.headers.get('Host'):
                    self.json_response(403, {'error': 'Origin rejected'}); return
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                self.json_response(415, {'error': 'JSON required'}); return
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if length < 0 or length > 128:
                    self.close_connection = True
                    self.json_response(413, {'error': 'Body too large'}); return
                if json.loads(self.rfile.read(length) or b'{}') != {}:
                    self.json_response(400, {'error': 'Empty object required'}); return
                cookie = SimpleCookie(); cookie.load(self.headers.get('Cookie', ''))
                token = cookie[COOKIE].value if COOKIE in cookie else None
                count, new_token = store.visit(token)
                self.json_response(200, {'visitors': count, 'metric': 'anonymous_browsers'}, new_token)
            except (ValueError, UnicodeError, CookieError): self.json_response(400, {'error': 'Invalid request'})
            except sqlite3.Error: self.json_response(503, {'error': 'Counter unavailable'})

    return ThreadingHTTPServer((host, port), partial(Handler, directory=str(ROOT)))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--db', default=os.environ.get('MUNJIZ_DB_PATH'))
    parser.add_argument('--secure-cookies', action='store_true')
    args = parser.parse_args()
    with make_server(args.host, args.port, args.db, args.secure_cookies) as server:
        print(f'Munjiz Academic: http://{args.host}:{server.server_port}', flush=True)
        try: server.serve_forever()
        except KeyboardInterrupt: pass
