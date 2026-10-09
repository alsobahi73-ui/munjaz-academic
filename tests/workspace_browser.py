"""Guest favorites, checklist, downloadable Word and self-contained review navigation."""
import os
from pathlib import Path
import tempfile
from urllib.parse import urlsplit
from zipfile import ZipFile
import xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright, expect

URL=os.environ.get('MUNJIZ_TEST_URL','http://127.0.0.1:8000').rstrip('/')
with tempfile.TemporaryDirectory(prefix='munjiz-workspace-') as temporary, sync_playwright() as p:
    options={'executable_path':'/usr/bin/chromium','headless':True,'args':['--no-sandbox']}
    if proxy:=os.environ.get('HTTPS_PROXY'):
        parsed=urlsplit(proxy); options['proxy']={'server':f'{parsed.scheme}://{parsed.hostname}:{parsed.port or 80}','bypass':'127.0.0.1,localhost'}
        if parsed.username: options['proxy']['username']=parsed.username
        if parsed.password: options['proxy']['password']=parsed.password
    browser=p.chromium.launch(**options)
    context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
    page=context.new_page(); errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(URL+'/tools.html',wait_until='networkidle')
    page.locator('[data-save-tool="gpa"]').click()
    expect(page.locator('[data-save-tool="gpa"]')).to_have_attribute('aria-pressed','true')
    assert page.locator('dialog[open]').count()==0
    page.reload(wait_until='networkidle'); page.locator('[data-tool-filter="favorites"]').click()
    expect(page.locator('.tool-tile:visible')).to_have_count(1)
    page.locator('.tool-tile:visible .tool-open').click(); expect(page.locator('#dlg-gpa')).to_be_visible(); page.keyboard.press('Escape')
    page.locator('[data-save-tool="gpa"]').click()
    expect(page.locator('#toolSearchEmpty')).to_contain_text('لم تحفظ أداة')
    expect(page.locator('[data-tool-filter="favorites"]')).to_be_focused()
    assert page.locator('.tool-tile').count()==7
    print('PASS: guest favorites persist, use the same seven cards and never open a tool while saving',flush=True)
    tasks=page.locator('#workflowSteps input')
    assert tasks.count()==10
    tasks.nth(0).check(); tasks.nth(3).check()
    expect(page.locator('#workflowSummary')).to_have_text('2 من 10 خطوات')
    page.reload(wait_until='networkidle'); assert page.locator('#workflowSteps input:checked').count()==2
    page.locator('#workflowReset').click(); assert page.locator('#workflowSteps input:checked').count()==0
    page.evaluate("localStorage.setItem('munjaz.researchWorkflow', '{bad'); localStorage.setItem('munjaz.toolFavorites', JSON.stringify(['unapproved']))")
    page.reload(wait_until='networkidle'); assert page.locator('#workflowSteps input:checked').count()==0
    print('PASS: ten-step local research plan persists and resets, and rejects corrupted/unknown stored values',flush=True)
    with page.expect_download() as downloadable: page.locator('#library a[download]').click()
    path=Path(temporary)/'research-plan.docx'; downloadable.value.save_as(path)
    with ZipFile(path) as archive:
        assert archive.testzip() is None
        for name in archive.namelist(): ET.fromstring(archive.read(name))
        body=archive.read('word/document.xml').decode()
        assert 'ليس قالب' in body or 'ليس قالب' in body.replace('قالب جامعة','قالب') or 'وليس قالب' in body
        assert '<w:bidi/>' in body and 'عرض البيانات الفعلية' in body
    print('PASS: real downloadable editable RTL Word template has valid XML and explicitly requires university review',flush=True)

    # Block every separate asset request. The review must carry its fonts, scripts and template.
    bundled=context.new_page(); bundled.on('pageerror',lambda error:errors.append(str(error)))
    denied=[]
    def only_review(route):
        path=urlsplit(route.request.url).path
        if path in ['/munjiz-preview.html','/api/visitors','/favicon.ico']: route.continue_()
        else: denied.append(route.request.url); route.abort()
    bundled.route('http://**/*',only_review); bundled.route('https://**/*',only_review)
    bundled.goto(URL+'/munjiz-preview.html',wait_until='networkidle')
    expect(bundled.locator('[data-preview-view="home"]')).to_be_visible()
    ids=bundled.locator('[id]').evaluate_all('(nodes)=>nodes.map(node=>node.id)')
    assert len(ids)==len(set(ids)), 'duplicate IDs in unified preview'
    bundled.locator('.route-free a').click(); expect(bundled.locator('#toolSearch')).to_be_visible()
    bundled.locator('[data-save-tool="quiz"]').click(); assert bundled.locator('dialog[open]').count()==0
    bundled.locator('#mainNav a[href="services.html"]').click()
    expect(bundled.locator('#categoryPicker')).to_be_visible()
    bundled.locator('[data-service-category="grad"]').click()
    expect(bundled.locator('.academic-service-card')).to_have_count(5)
    bundled.locator('#backToCategories').click(); expect(bundled.locator('#categoryPicker')).to_be_visible()
    bundled.locator('#mainNav a[href="tools.html"]').click()
    with bundled.expect_download() as downloadable: bundled.locator('#library a[download]').click()
    downloadable.value.save_as(Path(temporary)/'bundled-research-plan.docx')
    bundled.locator('#mainNav a[href="index.html"]').click(); expect(bundled.locator('.platform-routes')).to_be_visible()
    bundled.reload(wait_until='networkidle'); expect(bundled.locator('.platform-routes')).to_be_visible()
    assert not denied, denied
    print('PASS: one HTML file navigates home/tools/services, preserves 4/5/6 categories and downloads Word with no external asset request',flush=True)
    for width in [320,390,820,1440]:
        bundled.set_viewport_size({'width':width,'height':900})
        for fragment in ['home','tools','workspace','services','professionals','jobs']:
            bundled.evaluate('(hash)=>location.hash=hash',fragment)
            bundled.wait_for_timeout(150)
            assert bundled.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,fragment)
    print('PASS: unified preview and new workspace fit phone/desktop widths',flush=True)
    bundled.evaluate("location.hash='jobs'")
    expect(bundled.locator('#academicJobs')).to_be_visible()
    expect(bundled.locator('#academicJobsEmpty')).to_contain_text('لم تُضف إعلانات تعيين موثقة')
    assert bundled.locator('.jobs-card').count()==0
    bundled.locator('#jobGovernorate').select_option('بغداد'); bundled.locator('#jobType').select_option('teaching')
    expect(bundled.locator('#jobsCount')).to_have_text('الإعلانات الموثقة المعروضة: 0')
    bundled.locator('#jobFiltersReset').click(); assert bundled.locator('#jobGovernorate').input_value()==''
    expect(bundled.locator('#jobsTicker')).to_have_text('لم تُضف تعيينات موثقة بعد.')
    print('PASS: jobs view and homepage ticker clearly show no verified offers; province/type filters and reset work without fake data',flush=True)
    failure=browser.new_context()
    failure.add_init_script("Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError')}")
    fallback=failure.new_page(); fallback.goto(URL+'/tools.html',wait_until='networkidle')
    fallback.locator('[data-save-tool="references"]').click(); expect(fallback.locator('#toolFavoritesStatus')).to_contain_text('لهذه الزيارة فقط')
    fallback.locator('#workflowSteps input').first.check(); expect(fallback.locator('#workflowStatus')).to_contain_text('لهذه الزيارة فقط')
    print('PASS: unavailable storage is reported honestly while favorites and checklist work for the current visit',flush=True)
    assert not errors,errors
    failure.close(); context.close(); browser.close()
print('7 workspace/review browser check groups passed.')
