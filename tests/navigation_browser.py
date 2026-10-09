"""Check unique tool entry points, free/paid routes, filtering and old bookmarks."""
import os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect, Error as PlaywrightError

URL = os.environ.get('MUNJIZ_TEST_URL', 'http://127.0.0.1:8000').rstrip('/')
with sync_playwright() as p:
    options = {'executable_path': '/usr/bin/chromium', 'headless': True, 'args': ['--no-sandbox']}
    if proxy := os.environ.get('HTTPS_PROXY'):
        parsed = urlsplit(proxy)
        options['proxy'] = {'server': f'{parsed.scheme}://{parsed.hostname}:{parsed.port or 80}', 'bypass': '127.0.0.1,localhost'}
        if parsed.username: options['proxy']['username'] = parsed.username
        if parsed.password: options['proxy']['password'] = parsed.password
    browser = p.chromium.launch(**options)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page(); errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='networkidle')
    assert page.locator('.platform-route').count() == 2
    expect(page.locator('.route-free')).to_contain_text('مجانية بالكامل')
    expect(page.locator('.route-paid')).to_contain_text('خدمات مدفوعة')
    assert page.locator('[data-open-tool], [data-service-category], [data-open-service-assistant]').count() == 0
    page.locator('.route-free a').click()
    expect(page.locator('h1')).to_have_text('الأدوات الأكاديمية المجانية')
    ids = page.locator('[data-open-tool]').evaluate_all('(nodes) => nodes.map(node => node.dataset.openTool)')
    assert len(ids) == len(set(ids)) == 7
    assert page.locator('#assistant [data-open-tool], #library [data-open-tool]').count() == 0
    assert page.locator('#library .resource-availability').count() == 2
    expect(page.locator('#library a[download]')).to_have_count(1)
    search = page.locator('#toolSearch')
    search.fill('DOI'); expect(page.locator('.tool-tile:visible')).to_have_count(1)
    expect(page.locator('.tool-tile:visible')).to_have_attribute('data-open-tool', 'references')
    search.fill('أَسْئِلَة'); expect(page.locator('.tool-tile:visible')).to_have_count(1)
    page.locator('.tool-tile:visible .tool-open').click(); expect(page.locator('#dlg-quiz')).to_be_visible()
    page.keyboard.press('Escape'); expect(page.locator('.tool-tile:visible .tool-open')).to_be_focused()
    search.fill(''); page.locator('[data-tool-filter="research"]').click()
    expect(page.locator('.tool-tile:visible')).to_have_count(2)
    search.fill('APA'); expect(page.locator('.tool-tile:visible')).to_have_count(1)
    page.locator('[data-tool-filter="writing"]').click()
    expect(page.locator('#toolSearchEmpty')).to_be_visible()
    expect(page.locator('.tool-tile:visible')).to_have_count(0)
    search.fill(''); page.locator('[data-tool-filter="all"]').click()
    expect(page.locator('.tool-tile:visible')).to_have_count(7)
    print('PASS: two explicit free/paid routes; seven unique tools; Arabic/DOI search, categories, no-results and focus return', flush=True)

    for fragment in ['tools', 'assistant', 'library', 'tool-references']:
        page.goto(URL + '/index.html#' + fragment, wait_until='networkidle')
        page.wait_for_url('**/tools.html#' + fragment)
        if fragment == 'tool-references': expect(page.locator('#dlg-references')).to_be_visible()
    page.goto(URL + '/index.html#services', wait_until='networkidle')
    page.wait_for_url('**/services.html')
    assert page.locator('[data-service-category]').count() == 3
    assert page.locator('[data-open-tool]').count() == 0
    page.goto(URL + '/index.html', wait_until='networkidle')
    page.evaluate("location.hash = 'tool-sample'")
    page.wait_for_url('**/tools.html#tool-sample')
    expect(page.locator('#dlg-sample')).to_be_visible()
    print('PASS: existing tools, guidance, library and service bookmarks still work', flush=True)

    for width in [320, 390, 820, 1024, 1440]:
        page.set_viewport_size({'width': width, 'height': 900})
        for path in ['/index.html', '/tools.html', '/services.html']:
            page.goto(URL + path, wait_until='networkidle')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, path)
            expect(page.locator('#mainNav a[aria-current="page"]')).to_have_count(1)
        if width == 390:
            page.locator('#navToggle').click()
            page.locator('#mainNav a[href="tools.html"]').click()
            expect(page.locator('#toolSearch')).to_be_visible()
    print('PASS: three pages fit 320–1440px; shared navigation marks current page and works on mobile', flush=True)

    page.goto(URL + '/index.html#account', wait_until='networkidle')
    page.locator('#authName').fill('ملف اختبار')
    page.locator('#authEmail').fill('navigation@example.com')
    page.locator('#authAud').select_option('faculty')
    page.locator('#authSubmit').click(); expect(page.locator('#authUser')).to_be_visible()
    page.evaluate("localStorage.setItem('munjaz.references', JSON.stringify([{title:'saved'}]))")
    page.on('dialog', lambda dialog: dialog.accept())
    page.locator('#authLogout').click(); expect(page.locator('#authGuest')).to_be_visible()
    assert page.evaluate("localStorage.getItem('munjaz.profile') === null && localStorage.getItem('munjaz.references') === null")
    print('PASS: optional local profile creation and complete deletion work on landing page without tool DOM', flush=True)

    local_files_checked = False
    try:
        for name in ['index.html', 'tools.html', 'services.html']:
            page.goto((Path(__file__).resolve().parent.parent / name).as_uri(), wait_until='networkidle')
            expect(page.locator('h1')).to_be_visible()
            assert page.evaluate("getComputedStyle(document.querySelector('.site-header')).backgroundColor") == 'rgb(10, 79, 75)'
        local_files_checked = True
        print('PASS: downloaded HTML pages render content and local styles when opened directly', flush=True)
    except PlaywrightError as error:
        if 'ERR_BLOCKED_BY_ADMINISTRATOR' not in str(error): raise
        print('NOT RUN: direct file:// preview is blocked by this environment’s browser policy; HTTP checks completed.', flush=True)
    assert not errors, errors
    context.close(); browser.close()
print(f'{4 + int(local_files_checked)} navigation browser check groups passed; {int(not local_files_checked)} optional local-file group blocked by browser policy.')
