"""Polite scheduled collector. No publishing or Telegram credentials required."""
import argparse
import hashlib
import json
import os
import re
from pathlib import Path
import time
from datetime import datetime, timezone, timedelta
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.robotparser import RobotFileParser

from bs4 import BeautifulSoup
import feedparser
import yaml


def utcnow():
    return datetime.now(timezone.utc)


def stamp(value):
    return value.isoformat()


def load(path, default):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def save(path, value):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(temporary, path)


def web_url(value, base):
    url = urljoin(base, value)
    if urlsplit(url).scheme not in ('https', 'http') or not urlsplit(url).hostname:
        raise ValueError('Not an HTTP(S) URL')
    return url.split('#', 1)[0]


class Client:
    def __init__(self, agent, delay=2):
        self.agent, self.delay = agent, max(1, delay)
        self.robots, self.last = {}, {}

    def raw(self, url):
        origin = '{0.scheme}://{0.netloc}'.format(urlsplit(url))
        delay = self.delay
        robot = self.robots.get(origin)
        if robot:
            delay = max(delay, robot.crawl_delay(self.agent) or 0)
            rate = robot.request_rate(self.agent)
            if rate:
                delay = max(delay, rate.seconds / rate.requests)
        time.sleep(max(0, delay - (time.monotonic() - self.last.get(origin, 0))))
        self.last[origin] = time.monotonic()
        # Redirects are refused: every new destination must pass its own robots policy.
        import urllib.request
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None
        opener = urllib.request.build_opener(NoRedirect())
        try:
            with opener.open(Request(url, headers={'User-Agent': self.agent}), timeout=25) as response:
                body = response.read(4_000_001)
                if len(body) > 4_000_000:
                    raise ValueError('Response exceeds size limit')
                return body
        except HTTPError as exc:
            if exc.code in (301, 302, 303, 307, 308):
                raise ValueError('Redirect requires verified canonical URL') from exc
            raise

    def get(self, url):
        web_url(url, url)
        origin = '{0.scheme}://{0.netloc}'.format(urlsplit(url))
        if origin not in self.robots:
            robot = RobotFileParser()
            try:
                body = self.raw(origin + '/robots.txt').decode('utf-8', 'replace')
            except HTTPError as exc:
                if exc.code in (404, 410):
                    body = ''
                else:
                    raise ValueError('robots.txt unavailable; refusing to crawl') from exc
            except ValueError as exc:
                # raw() wraps redirect responses in ValueError: follow a same-origin
                # robots.txt redirect once (e.g. trailing slash) for the policy
                # document only. Content URLs still refuse redirects.
                cause = exc.__cause__
                target = cause.headers.get('Location', '') if isinstance(cause, HTTPError) else ''
                if (isinstance(cause, HTTPError)
                        and cause.code in (301, 302, 303, 307, 308)
                        and urlsplit(target).netloc.lower() == urlsplit(origin).netloc.lower()):
                    try:
                        body = self.raw(target).decode('utf-8', 'replace')
                    except (HTTPError, ValueError) as exc2:
                        raise ValueError('robots.txt unavailable; refusing to crawl') from exc2
                else:
                    raise
            robot.parse(body.splitlines())
            self.robots[origin] = robot
        if not self.robots[origin].can_fetch(self.agent, url):
            raise ValueError('robots.txt disallows URL')
        return self.raw(url)


def text(value):
    return BeautifulSoup(value or '', 'html.parser').get_text(' ', strip=True)


# --- Content curation (2026-10-14, per owner directive) ---
# Ceremonial / traditional PR items are dropped for ALL sources.
CEREMONIAL_PATTERNS = [
    r'يستقبل', r'استقبال وفد',
    r'يهن[ئى]|تهن[ئى]|تهنئة|تهاني',
    r'زيارة تفقدية|جولة تفقدية|يتفقد',
    r'يفتتح (?:مبن|بناية|قاعة|مختبر|مشروع|جسر)|افتتاح (?:مبن|بناية|قاعة|مختبر|مشروع)',
    r'حفل تخرج|حفل تكريم|احتفالية|تكريم|يكرم',
    r'مذكرة تفاهم|توقيع اتفاقية|يوقع (?:مذكرة|اتفاقية)',
    r'برقية|تعزية|يعزي|مواساة',
    r'كتاب شكر|شكر وتقدير',
    r'اجتماع مجلس|مجلس (?:الجامعة|الكلية) يعقد|ترأس اجتماع|برئاسة',
    r'وفد رسمي|يشارك في أعمال',
]

# Private-sector sources keep ONLY academic-substance items:
# conferences, research publications, appointments, jobs, journals, publishers.
PRIVATE_ALLOW_PATTERNS = [
    r'مؤتمر|مؤتمرات|ندوة علمية',
    r'بحث علمي|البحوث|بحوث|ورقة علمية|نشر (?:بحث|البحوث|الأبحاث)',
    r'مجلة|مجلات|دورية علمية',
    r'دار نشر|دور النشر',
    r'تعيين|تعيينات|وظيفة|وظائف|فرص عمل|فرصة عمل|درجات وظيفية',
]


def _matches_any(patterns, value):
    return any(re.search(pattern, value) for pattern in patterns)


def content_filter(item, source):
    """Return a drop-reason string, or None to keep the item.

    Ceremonial items are dropped for every source. Items from private-sector
    sources are additionally required to match the academic allowlist.
    """
    haystack = '{} {}'.format(item.get('title') or '', item.get('summary') or '')
    if _matches_any(CEREMONIAL_PATTERNS, haystack):
        return 'ceremonial'
    if source.get('sector') == 'private' and not _matches_any(PRIVATE_ALLOW_PATTERNS, haystack):
        return 'private_non_academic'
    return None


def parse_feed(body, source, base):
    parsed = feedparser.parse(body)
    if not parsed.version or parsed.bozo:
        raise ValueError('Invalid RSS/Atom feed')
    result = []
    for entry in parsed.entries:
        title, link = entry.get('title'), entry.get('link')
        date = entry.get('published') or entry.get('updated')
        if not title or not link or not date:
            raise ValueError('Feed item missing title/link/publication date')
        result.append({'title': title, 'url': web_url(link, base), 'date': date,
                       'summary': text(entry.get('summary', ''))[:350]})
    return result


def extract_page(body, source, base):
    selectors = source.get('selectors')
    if not selectors:
        raise ValueError('No official feed and no verified HTML selectors')
    page = BeautifulSoup(body, 'html.parser')
    rows = page.select(selectors['item'])
    if not rows:
        raise ValueError('News selector matched no articles')
    result = []
    date_sel = selectors.get('date')
    for row in rows:
        title = row.select_one(selectors['title'])
        link = row.select_one(selectors['link'])
        date = row.select_one(date_sel) if date_sel else None
        summary = row.select_one(selectors['summary']) if selectors.get('summary') else None
        if not title or not link or not link.get('href'):
            raise ValueError('HTML article missing title/link')
        if not date and not source.get('date_page_selector'):
            raise ValueError('HTML article missing publication date')
        result.append({'title': title.get_text(' ', strip=True),
                       'url': web_url(link['href'], base),
                       'date': (date.get('datetime') or date.get_text(' ', strip=True)) if date else '',
                       'summary': summary.get_text(' ', strip=True)[:350] if summary else ''})
    return result


def backfill_dates(batch, source, client, log):
    """Fetch each dateless item's page and extract its date.

    Only used when the listing has no dates but date_page_selector is set.
    Items whose page yields no date are dropped (never invent dates).
    """
    selector = source.get('date_page_selector')
    if not selector:
        return batch
    kept = []
    for item in batch:
        if item.get('date'):
            kept.append(item)
            continue
        try:
            page = BeautifulSoup(client.get(item['url']), 'html.parser')
            found = page.select_one(selector)
            item['date'] = (found.get('datetime') or found.get_text(' ', strip=True)) if found else ''
        except Exception as exc:
            log.write(json.dumps({'time': stamp(utcnow()), 'id': source['id'],
                                  'skipped': item['url'], 'reason': f'{type(exc).__name__}: {exc}'},
                                 ensure_ascii=False) + '\n')
            continue
        if item['date']:
            kept.append(item)
        else:
            log.write(json.dumps({'time': stamp(utcnow()), 'id': source['id'],
                                  'skipped': item['url'], 'reason': 'no date on article page'},
                                 ensure_ascii=False) + '\n')
    return kept


def articles(source, client):
    base = source['url']
    body = client.get(base)
    parsed = feedparser.parse(body)
    if parsed.version:
        return parse_feed(body, source, base)
    page = BeautifulSoup(body, 'html.parser')
    feeds = [web_url(link['href'], base) for link in page.select('link[href]')
             if 'alternate' in link.get('rel', []) and
             link.get('type', '').lower() in ('application/rss+xml', 'application/atom+xml')]
    feeds += [web_url(source['feed_url'], base)] if source.get('feed_url') else []
    errors = []
    for feed in dict.fromkeys(feeds):
        # Never accept a third-party feed as an official source automatically.
        if urlsplit(feed).hostname != urlsplit(base).hostname:
            continue
        try:
            return parse_feed(client.get(feed), source, feed)
        except Exception as exc:
            errors.append(type(exc).__name__)
    if feeds and errors:
        raise ValueError('Discovered feeds failed: ' + ', '.join(errors))
    return extract_page(body, source, base)


def collect(config, output, client=None, now=None, force=False):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    now = now or utcnow()
    client = client or Client(config['user_agent'], config.get('request_delay_seconds', 2))
    queue = load(output / 'news_queue.json', [])
    seen = load(output / 'seen.json', {})
    state = load(output / 'collector_state.json', {})
    # Reconcile queue before seen: a crash after queue save must not enqueue duplicates.
    for item in queue:
        digest = hashlib.sha256((item['url'] + '\n' + item['title']).encode()).hexdigest()
        seen[digest] = item.get('collected_at', stamp(now))
    report = {'time': stamp(now), 'new_items': 0, 'sources': [],
              'directory_status': config.get('directory_status', 'unknown')}
    with (output / 'runs.log').open('a', encoding='utf-8') as log:
        for source in config['sources']:
            sid = source['id']
            status = state.setdefault(sid, {'consecutive_failures': 0})
            if not source.get('enabled', True):
                report['sources'].append({'id': sid, 'status': 'disabled'})
                continue
            interval = config['schedule_hours'][source['tier']]
            if not force and status.get('last_attempt') and now < datetime.fromisoformat(status['last_attempt']) + timedelta(hours=interval):
                report['sources'].append({'id': sid, 'status': 'not_due',
                                          'needs_attention': status['consecutive_failures'] >= 5})
                continue
            status['last_attempt'] = stamp(now)
            row = {'id': sid, 'new_items': 0}
            try:
                if source['type'] not in ('official', 'unofficial'):
                    raise ValueError('Invalid source type')
                if source['category'] not in config['categories']:
                    raise ValueError('Unknown category')
                batch = articles(source, client)
                batch = backfill_dates(batch, source, client, log)
                kept = []
                for item in batch:
                    reason = content_filter(item, source)
                    if reason:
                        log.write(json.dumps({'time': stamp(now), 'id': sid,
                                              'skipped': item['url'],
                                              'reason': 'filtered:' + reason,
                                              'title': (item.get('title') or '')[:100]},
                                             ensure_ascii=False) + '\n')
                        continue
                    kept.append(item)
                batch = kept
                for item in batch:
                    digest = hashlib.sha256((item['url'] + '\n' + item['title']).encode()).hexdigest()
                    if digest in seen:
                        continue
                    queue.append({**item, 'id': digest, 'source': source['name'],
                                  'source_id': sid, 'type': source['type'],
                                  'category': source['category'], 'collected_at': stamp(now)})
                    seen[digest] = stamp(now)
                    row['new_items'] += 1
                status['consecutive_failures'] = 0
                status['last_success'] = stamp(now)
                row['status'] = 'ok'
            except Exception as exc:
                status['consecutive_failures'] += 1
                row.update(status='failed', error=f'{type(exc).__name__}: {exc}')
            row['needs_attention'] = status['consecutive_failures'] >= 5
            row['consecutive_failures'] = status['consecutive_failures']
            report['new_items'] += row['new_items']
            report['sources'].append(row)
            log.write(json.dumps({'time': stamp(now), **row}, ensure_ascii=False) + '\n')
        log.write(json.dumps({'time': stamp(now), 'new_items': report['new_items']}, ensure_ascii=False) + '\n')
    save(output / 'news_queue.json', queue)
    save(output / 'seen.json', seen)
    save(output / 'collector_state.json', state)
    save(output / 'collector_report.json', report)
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sources', default='sources.yaml')
    parser.add_argument('--output', default='.')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    config = yaml.safe_load(Path(args.sources).read_text(encoding='utf-8'))
    if not config.get('sources') or config.get('directory_status') != 'verified':
        parser.error('Complete and verify ministry directory/source audit before production collection')
    report = collect(config, args.output, force=args.force)
    print(json.dumps(report, ensure_ascii=False))
    return 1 if all(row['status'] == 'failed' for row in report['sources']) else 0


if __name__ == '__main__':
    raise SystemExit(main())
