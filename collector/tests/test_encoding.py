import copy
import json
from pathlib import Path
import tempfile
import unittest

from collector.collect import collect, extract_page, html_page, news_item, repair_encoding
from test_collect import CONFIG, NOW, SOURCE, FakeClient


class NewsEncodingTests(unittest.TestCase):
    def test_lossless_windows1256_repair_and_idempotence(self):
        headline = 'كلية الرشيد الجامعة - Al-Rasheed university college'
        damaged = headline.encode('utf-8').decode('cp1256')
        self.assertNotEqual(damaged, headline)
        self.assertEqual(repair_encoding(damaged), headline)
        self.assertEqual(repair_encoding(headline), headline)
        self.assertEqual(repair_encoding('University news'), 'University news')
        self.assertEqual(repair_encoding('عنوان فقد حروفًا �'), 'عنوان فقد حروفًا �')

    def test_undeclared_utf8_html_and_declared_legacy_html(self):
        title = 'إعلان نتائج القبول'
        source = dict(SOURCE, selectors={'item': 'article', 'title': 'h2', 'link': 'a', 'date': 'time'})
        body = f'<article><h2>{title}</h2><a href="/news/1">رابط</a><time>2026-10-10</time></article>'
        self.assertEqual(extract_page(body.encode('utf-8'), source, SOURCE['url'])[0]['title'], title)
        legacy = ('<meta charset="windows-1256">' + body).encode('cp1256')
        self.assertEqual(extract_page(legacy, source, SOURCE['url'])[0]['title'], title)

    def test_non_news_entries_are_not_queued(self):
        rss = '''<rss version="2.0"><channel><title>Fixture</title><link>https://fixture.test/</link><description>Test</description>
        <item><title>Sitemap</title><link>https://fixture.test/feed/</link><pubDate>Sat, 10 Oct 2026 10:00:00 GMT</pubDate></item>
        <item><title>:</title><link>https://fixture.test/news/2</link><pubDate>Sat, 10 Oct 2026 10:00:00 GMT</pubDate></item>
        <item><title>إعلان نتائج القبول</title><link>https://fixture.test/news/3</link><pubDate>Sat, 10 Oct 2026 10:00:00 GMT</pubDate></item>
        </channel></rss>'''.encode('utf-8')
        with tempfile.TemporaryDirectory() as directory:
            report = collect(copy.deepcopy(CONFIG), Path(directory), FakeClient({SOURCE['url']: rss}), NOW)
            self.assertEqual(report['new_items'], 1)
            items = json.loads((Path(directory) / 'news_queue.json').read_text())
            self.assertEqual(items[0]['title'], 'إعلان نتائج القبول')

    def test_english_headline_is_preserved(self):
        self.assertTrue(news_item({'title': 'University honors researchers', 'url': 'https://fixture.test/news/4'}))
        self.assertFalse(news_item({'title': 'University home', 'url': 'https://fixture.test/'}))
