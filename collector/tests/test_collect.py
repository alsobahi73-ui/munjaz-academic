import copy
import json
from pathlib import Path
import tempfile
import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
from urllib.error import HTTPError

from collector.collect import Client, articles, collect

RSS = b'''<rss version="2.0"><channel><title>Fixture</title><link>https://fixture.test/</link><description>Test only</description><item><title>Test headline</title><link>https://fixture.test/news/1</link><pubDate>Sat, 10 Oct 2026 10:00:00 GMT</pubDate><description>Short summary</description></item></channel></rss>'''
ATOM = b'''<feed xmlns="http://www.w3.org/2005/Atom"><title>Fixture</title><id>https://fixture.test/</id><updated>2026-10-10T10:00:00Z</updated><entry><id>https://fixture.test/news/1</id><title>Atom headline</title><link href="/news/1"/><updated>2026-10-10T10:00:00Z</updated><summary>Summary</summary></entry></feed>'''
SOURCE = {'id': 'fixture', 'name': 'Test fixture only', 'url': 'https://fixture.test/',
          'type': 'official', 'tier': 'ministry', 'category': 'general'}
CONFIG = {'user_agent': 'MunjazAcademicCollector/1.0', 'categories': ['general'],
          'schedule_hours': {'ministry': 1, 'university': 6}, 'sources': [SOURCE]}
NOW = datetime(2026, 10, 10, tzinfo=timezone.utc)


class FakeClient:
    def __init__(self, pages=None):
        self.pages = pages or {'https://fixture.test/': RSS}
        self.calls = []

    def get(self, url):
        self.calls.append(url)
        result = self.pages[url]
        if isinstance(result, Exception):
            raise result
        return result


class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name)
        self.config = copy.deepcopy(CONFIG)

    def tearDown(self):
        self.tmp.cleanup()

    def read(self, name):
        return json.loads((self.path / name).read_text())

    def test_acceptance_and_restart_dedup(self):
        report = collect(self.config, self.path, FakeClient(), NOW)
        self.assertEqual(report['new_items'], 1)
        item = self.read('news_queue.json')[0]
        for field in ('title', 'url', 'date', 'summary', 'source', 'type', 'category'):
            self.assertTrue(item[field])
        self.assertEqual(item['title'], 'Test headline')
        self.assertEqual(collect(self.config, self.path, FakeClient(), NOW + timedelta(hours=1))['new_items'], 0)
        self.assertEqual(len(self.read('news_queue.json')), 1)
        # Removing a published item from queue must not erase permanent dedup state.
        (self.path / 'news_queue.json').write_text('[]')
        collect(self.config, self.path, FakeClient(), NOW + timedelta(hours=2))
        self.assertEqual(self.read('news_queue.json'), [])

    def test_failure_isolation_and_attention_reset(self):
        bad = dict(SOURCE, id='bad', url='https://bad.test/')
        self.config['sources'] = [bad, SOURCE]
        client = FakeClient({'https://fixture.test/': RSS, 'https://bad.test/': TimeoutError('timed out')})
        for hour in range(5):
            report = collect(self.config, self.path, client, NOW + timedelta(hours=hour))
        self.assertTrue(report['sources'][0]['needs_attention'])
        self.assertEqual(report['sources'][1]['status'], 'ok')
        self.assertEqual(len(self.read('news_queue.json')), 1)
        client.pages['https://bad.test/'] = RSS
        report = collect(self.config, self.path, client, NOW + timedelta(hours=5))
        self.assertFalse(report['sources'][0]['needs_attention'])
        self.assertIn('TimeoutError', (self.path / 'runs.log').read_text())

    def test_tier_schedule(self):
        self.config['sources'][0]['tier'] = 'university'
        client = FakeClient()
        collect(self.config, self.path, client, NOW)
        collect(self.config, self.path, client, NOW + timedelta(hours=5))
        self.assertEqual(len(client.calls), 1)
        collect(self.config, self.path, client, NOW + timedelta(hours=6))
        self.assertEqual(len(client.calls), 2)

    def test_official_atom_discovered_before_html(self):
        client = FakeClient({'https://fixture.test/': b'<link rel="alternate" type="application/atom+xml" href="/atom">',
                             'https://fixture.test/atom': ATOM})
        self.assertEqual(articles(SOURCE, client)[0]['title'], 'Atom headline')
        self.assertEqual(client.calls[-1], 'https://fixture.test/atom')

    def test_html_fallback_requires_verified_selectors(self):
        source = dict(SOURCE, selectors={'item': 'article', 'title': 'h2', 'link': 'a', 'date': 'time', 'summary': 'p'})
        client = FakeClient({'https://fixture.test/': b'<article><h2>Original headline</h2><a href="/one">Read</a><time datetime="2026-10-10">Today</time><p>Summary</p></article>'})
        item = articles(source, client)[0]
        self.assertEqual(item['date'], '2026-10-10')
        self.assertEqual(item['url'], 'https://fixture.test/one')
        with self.assertRaises(ValueError):
            articles(SOURCE, client)

    def test_malformed_feed_does_not_silently_succeed(self):
        with self.assertRaises(ValueError):
            articles(SOURCE, FakeClient({'https://fixture.test/': RSS.replace(b'<pubDate>', b'<bad>').replace(b'</pubDate>', b'</bad>')}))

    def test_unofficial_and_queue_crash_reconciliation(self):
        self.config['sources'][0]['type'] = 'unofficial'
        collect(self.config, self.path, FakeClient(), NOW)
        self.assertEqual(self.read('news_queue.json')[0]['type'], 'unofficial')
        (self.path / 'seen.json').unlink()
        collect(self.config, self.path, FakeClient(), NOW + timedelta(hours=1))
        self.assertEqual(len(self.read('news_queue.json')), 1)

    def test_robots_disallow(self):
        client = Client('MunjazAcademicCollector/1.0')
        with patch.object(client, 'raw', return_value=b'User-agent: *\nDisallow: /private') as raw:
            with self.assertRaises(ValueError):
                client.get('https://fixture.test/private')
            self.assertEqual(raw.call_count, 1)

    def test_robots_failure_closed_and_missing_allowed(self):
        client = Client('MunjazAcademicCollector/1.0')
        with patch.object(client, 'raw', side_effect=HTTPError('url', 503, 'Unavailable', {}, None)):
            with self.assertRaises(ValueError):
                client.get('https://fixture.test/')
        client = Client('MunjazAcademicCollector/1.0')
        with patch.object(client, 'raw', side_effect=[HTTPError('url', 404, 'Missing', {}, None), RSS]):
            self.assertEqual(client.get('https://fixture.test/'), RSS)

    def test_date_backfill_from_article_page(self):
        from collector.collect import backfill_dates
        import io
        listing = b"""<html><body><div class="grid"><li><a class="_link" href="https://fixture.test/post/1"><div class="title">Headline one</div></a></li></div></body></html>"""
        article = b"""<html><body><img class="post-img"/><div class="post-views"><div class="date">13-10-2026</div></div></body></html>"""
        source = dict(SOURCE)
        source['selectors'] = {'item': 'div.grid li', 'title': 'div.title', 'link': 'a._link'}
        source['date_page_selector'] = 'img.post-img + div.post-views div.date'
        client = FakeClient({'https://fixture.test/': listing,
                             'https://fixture.test/post/1': article})
        batch = articles(source, client)
        self.assertEqual(batch[0]['date'], '')
        log = io.StringIO()
        kept = backfill_dates(batch, source, client, log)
        self.assertEqual(len(kept), 1)
        self.assertEqual(kept[0]['date'], '13-10-2026')

    def test_dateless_article_page_drops_item(self):
        from collector.collect import backfill_dates
        import io
        listing = b"""<html><body><div class="grid"><li><a class="_link" href="https://fixture.test/post/9"><div class="title">No date anywhere</div></a></li></div></body></html>"""
        article = b"""<html><body><p>No date here</p></body></html>"""
        source = dict(SOURCE)
        source['selectors'] = {'item': 'div.grid li', 'title': 'div.title', 'link': 'a._link'}
        source['date_page_selector'] = 'img.post-img + div.post-views div.date'
        client = FakeClient({'https://fixture.test/': listing,
                             'https://fixture.test/post/9': article})
        batch = articles(source, client)
        log = io.StringIO()
        kept = backfill_dates(batch, source, client, log)
        self.assertEqual(kept, [])
        self.assertIn('no date on article page', log.getvalue())
    def test_robots_txt_same_origin_redirect_followed(self):
        # robots.txt 301 to a same-origin URL (e.g. trailing slash) must not
        # kill the source; content URLs still refuse redirects.
        from urllib.error import HTTPError
        client = Client('MunjazAcademicCollector/1.0')
        def fake_raw(url):
            if url.endswith('/robots.txt'):
                raise HTTPError(url, 301, 'Moved', {'Location': url + '/'}, None)
            if url.endswith('/robots.txt/'):
                return b'User-agent: *\nDisallow:\n'
            return RSS
        with patch.object(Client, 'raw', side_effect=fake_raw):
            body = client.get('https://fixture.test/?feed=rss2')
        self.assertEqual(body, RSS)

    def test_robots_txt_cross_origin_redirect_refused(self):
        from urllib.error import HTTPError
        client = Client('MunjazAcademicCollector/1.0')
        def fake_raw(url):
            if url.endswith('/robots.txt'):
                raise HTTPError(url, 301, 'Moved', {'Location': 'https://evil.test/robots.txt'}, None)
            return RSS
        with patch.object(Client, 'raw', side_effect=fake_raw):
            with self.assertRaises(ValueError):
                client.get('https://fixture.test/')
if __name__ == '__main__':
    unittest.main()
