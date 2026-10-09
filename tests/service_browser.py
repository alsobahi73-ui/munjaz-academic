"""Approved category-first service directory and direct WhatsApp links; no real messages."""
import os
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('MUNJIZ_TEST_URL', 'http://127.0.0.1:8000')
checks = []
with sync_playwright() as p:
    options = {'executable_path': '/usr/bin/chromium', 'headless': True, 'args': ['--no-sandbox']}
    proxy = os.environ.get('HTTPS_PROXY')
    if proxy:
        parsed = urlsplit(proxy)
        options['proxy'] = {'server': f'{parsed.scheme}://{parsed.hostname}:{parsed.port or 80}', 'bypass': '127.0.0.1,localhost'}
        if parsed.username: options['proxy']['username'] = parsed.username
        if parsed.password: options['proxy']['password'] = parsed.password
    browser = p.chromium.launch(**options)
    context = browser.new_context(viewport={'width':1440,'height':1000})
    # Explicitly intercept WhatsApp to test navigation without contacting the service.
    context.route('https://wa.me/**', lambda route: route.fulfill(status=200, body='<p>Intercepted WhatsApp navigation</p>', content_type='text/html'))
    page = context.new_page(); errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    def check(name): checks.append(name); print('PASS:', name, flush=True)
    page.goto(URL + '/services.html', wait_until='networkidle')
    expect(page.locator('#categoryPicker')).to_be_visible()
    assert page.locator('[data-service-category]').count() == 3
    assert page.locator('.academic-service-card').count() == 0
    assert page.locator('form').count() == 0
    assert not any(script.get_attribute('src') == 'app.js' for script in page.locator('script').all())
    seen = set()
    for category, count in [('undergrad',4),('grad',5),('professionals',6)]:
        page.locator(f'[data-service-category="{category}"]').click()
        expect(page.locator('#servicesPanel')).to_be_visible()
        assert page.locator('.academic-service-card').count() == count
        cards = page.locator('.academic-service-card')
        for card in cards.all():
            seen.add(card.get_attribute('data-service-id'))
            link = card.locator('a[data-request-service]')
            target = urlsplit(link.get_attribute('href'))
            assert target.netloc == 'wa.me' and target.path == '/9647819934210'
            assert card.locator('h3').inner_text() in parse_qs(target.query)['text'][0]
            assert card.locator('.paid-service-badge').inner_text() == 'خدمة مدفوعة'
            assert link.get_attribute('target') == '_blank'
        page.locator('#backToCategories').click()
        expect(page.locator('#categoryPicker')).to_be_visible()
        assert page.locator('.academic-service-card').count() == 0
    assert len(seen) == 15
    check('three category cards first; exact 4/5/6 approved paid services appear only after selection')
    page.locator('[data-service-category="undergrad"]').click()
    with page.expect_popup() as popup: page.locator('[data-request-service="reports-seminars"]').click()
    popup.value.wait_for_load_state()
    assert popup.value.url.startswith('https://wa.me/9647819934210?')
    assert 'إعداد التقارير والسمنرات' in parse_qs(urlsplit(popup.value.url).query)['text'][0]
    popup.value.close(); page.locator('#backToCategories').click()
    check('order click opens WhatsApp directly with request type and no intervening form')
    page.locator('[data-open-service-assistant]').click()
    def choose(value): page.locator(f'#serviceWizardChoices [data-choice="{value}"]').click()
    choose('grad'); choose('thesis'); choose('thesis-typesetting')
    expect(page.locator('#serviceSuggestionView')).to_be_visible()
    expect(page.locator('#serviceRecommendation')).to_contain_text('تنضيد الرسائل والأطاريح')
    assert 'تنضيد الرسائل والأطاريح' in parse_qs(urlsplit(page.locator('#serviceDirectWhatsapp').get_attribute('href')).query)['text'][0]
    assert page.locator('#serviceRequestModal form, #serviceRequestModal input, #serviceRequestModal textarea').count() == 0
    page.locator('#serviceChooseAgain').click(); choose('professionals'); choose('book')
    expect(page.locator('#serviceRecommendation')).to_contain_text('تأليف الكتب')
    page.locator('#serviceRequestModal [data-close-modal]').click()
    check('assistant recommends approved services and offers direct WhatsApp without a data form')
    for width in [320,390,820,1024,1440]:
        page.set_viewport_size({'width':width,'height':900})
        for category in ['undergrad','grad','professionals']:
            page.locator(f'[data-service-category="{category}"]').click()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width,category)
            page.locator('#backToCategories').click()
        page.locator('#visitorFooterBadge').scroll_into_view_if_needed()
        expect(page.locator('#visitorFooterBadge')).to_be_visible()
        assert page.locator('#visitorFooterBadge [data-visitor-count]').inner_text() == page.locator('#visitorCount').inner_text()
    check('all categories fit phone/desktop; footer visitor icon matches the header counter')
    page.goto(URL + '/services.html#grad',wait_until='networkidle')
    assert page.locator('.academic-service-card').count() == 5
    page.reload(wait_until='networkidle'); assert page.locator('.academic-service-card').count() == 5
    page.locator('#backToCategories').click(); page.go_back(wait_until='networkidle')
    assert page.locator('.academic-service-card').count() == 5
    check('category deep links, refresh and browser back retain the intended view')
    page.goto(URL,wait_until='networkidle')
    page.evaluate("localStorage.setItem('munjaz.audience', JSON.stringify('grad'))")
    page.reload(wait_until='networkidle')
    assert page.locator('.platform-route').count() == 2
    assert page.locator('[data-service-category], [data-open-tool]').count() == 0
    assert page.locator('.academic-service-card').count() == 0
    page.locator('.route-paid a').click()
    expect(page.locator('[data-service-category]')).to_have_count(3)
    page.locator('[data-service-category="professionals"]').click()
    assert page.locator('.academic-service-card').count() == 6
    page.locator('#backToCategories').click()
    page.locator('#visitorFooterBadge').scroll_into_view_if_needed()
    expect(page.locator('#visitorFooterBadge')).to_be_visible()
    page.goto(URL + '/services.html',wait_until='networkidle'); page.locator('#authBtn').click()
    expect(page.locator('#authModal')).to_be_visible()
    page.get_by_role('button', name='متابعة كزائر', exact=True).click()
    check('homepage separates free/paid routes; services remain category-first and account is optional')
    assert not errors, errors
    fallback = context.new_page()
    fallback.route('**/api/visitors', lambda route: route.fulfill(status=503,body='{}',content_type='application/json'))
    fallback.goto(URL+'/services.html',wait_until='networkidle')
    expect(fallback.locator('#visitorFooterBadge [data-visitor-count]')).to_have_text('—')
    fallback.locator('[data-service-category="undergrad"]').click()
    assert fallback.locator('.academic-service-card').count() == 4
    check('counter outage leaves counts unavailable and never blocks service selection')
    context.close(); browser.close()
print(f'{len(checks)} approved-service browser check groups passed.')
