"""Guest service requests, wizard navigation, real counters and mobile header."""
import json
import os
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright, expect

URL = 'http://127.0.0.1:8000'
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
    page = context.new_page(); errors = []; sent = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: sent.append(request.url) if 'wa.me' in request.url else None)
    before = context.request.get(URL + '/api/visitors').json()['visitors']
    page.goto(URL, wait_until='networkidle')
    expect(page.locator('#visitorBadge')).to_have_attribute('aria-label', f'عدد المتصفحات الزائرة: {before + 1}')
    first = context.request.get(URL + '/api/visitors').json()['visitors']
    page.reload(wait_until='networkidle')
    assert context.request.get(URL + '/api/visitors').json()['visitors'] == first
    assert page.evaluate("localStorage.getItem('munjaz.profile')") is None
    def check(name): checks.append(name); print('PASS:', name, flush=True)
    check('server counter increases once per browser, not per reload')

    page.locator('[data-open-service-assistant]').first.click()
    def choose(key): page.locator(f'#serviceWizardChoices [data-choice="{key}"]').click()
    choose('grad'); choose('document'); choose('format'); choose('thesis')
    expect(page.locator('#serviceOrderView')).to_be_visible()
    expect(page.locator('#orderService')).to_have_value('thesis-format')
    expect(page.locator('#orderAudience')).to_have_value('grad')
    expect(page.locator('#serviceRecommendation')).to_contain_text('الخدمة المقترحة')
    assert page.locator('#authModal').is_visible() is False
    page.locator('#orderDetails').fill('أحتاج ضبط الهوامش والفهرس وتنسيق الرسالة قبل المناقشة.')
    page.locator('#orderName').fill('اسم <اختبار>')
    page.locator('#orderIntegrity').check()
    page.locator('#serviceOrderForm button[type="submit"]').click()
    expect(page.locator('#serviceOrderReady')).to_be_visible()
    target = urlsplit(page.locator('#serviceOrderWhatsapp').get_attribute('href'))
    assert target.netloc == 'wa.me' and target.path == '/9647819934210'
    text = parse_qs(target.query)['text'][0]
    assert 'تنسيق الرسائل والأطاريح' in text and 'اسم <اختبار>' in text and 'الهوامش' in text
    assert page.locator('#serviceRecommendation script').count() == 0
    assert not sent
    check('guest recommendation opens prefilled order and prepares the real WhatsApp URL without sending')
    page.locator('#orderDetails').fill('أحتاج تنسيقاً مختلفاً للعمل الأكاديمي ومراجعة الفهارس.')
    expect(page.locator('#serviceOrderReady')).to_be_hidden()
    assert page.locator('#serviceOrderWhatsapp').get_attribute('href') is None
    check('editing a request invalidates the old outgoing message')
    page.locator('#serviceChooseAgain').click()
    choose('all'); choose('research'); page.locator('#serviceWizardBack').click()
    choose('communication'); choose('training')
    expect(page.locator('#orderService')).to_have_value('training')
    expect(page.locator('#orderAudience')).to_have_value('all')
    page.locator('#serviceRequestModal [data-close-modal]').click()
    check('back navigation recomputes suggestions and anonymous audience is supported')
    page.locator('[data-pick="faculty"]').click()
    page.locator('[data-request-service="promotion"]').click()
    expect(page.locator('#orderService')).to_have_value('promotion')
    assert page.locator('#orderService option').count() == 10
    page.locator('#serviceRequestModal [data-close-modal]').click()
    check('existing service cards open a guest order and retain all ten services')
    for width in (320, 390, 820, 1024, 1440):
        page.set_viewport_size({'width':width,'height':900})
        expect(page.locator('#visitorBadge')).to_be_visible()
        expect(page.locator('#authBtn')).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
    page.set_viewport_size({'width':390,'height':844})
    page.locator('#authBtn').click()
    page.get_by_role('button', name='متابعة كزائر', exact=True).click()
    expect(page.locator('#authModal')).not_to_be_visible()
    page.locator('[data-open-service-assistant]').first.click()
    choose('all'); choose('publication'); choose('journal')
    assert page.locator('#serviceRequestModal .modal-box').evaluate('e => e.scrollWidth <= e.clientWidth + 1')
    page.locator('#serviceRequestModal [data-close-modal]').click()
    check('header icons, guest continuation and order form fit phone and desktop widths')
    assert not errors, errors
    context.close()
    fresh = browser.new_context()
    fresh_page = fresh.new_page(); fresh_page.goto(URL, wait_until='networkidle')
    assert fresh.request.get(URL + '/api/visitors').json()['visitors'] == first + 1
    fresh.close()
    fallback = browser.new_context()
    fallback_page = fallback.new_page()
    fallback_page.route('**/api/visitors', lambda route: route.fulfill(status=503, body='{}', content_type='application/json'))
    fallback_page.goto(URL, wait_until='networkidle')
    expect(fallback_page.locator('#visitorCount')).to_have_text('—')
    expect(fallback_page.locator('#visitorBadge')).to_have_attribute('aria-label', 'عدد الزوار غير متاح حالياً')
    fallback_page.locator('[data-open-service-assistant]').first.click()
    expect(fallback_page.locator('#serviceWizard')).to_be_visible()
    fallback.close(); browser.close()
    check('a new browser is counted; counter failure never invents a number or blocks ordering')
print(f'{len(checks)} service browser check groups passed.')
