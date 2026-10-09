"""Run against the static server on 8000; temporary files and browser storage only."""
import json
import os
from pathlib import Path
import tempfile
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit
from xml.sax.saxutils import escape
from zipfile import ZipFile, ZIP_DEFLATED
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('MUNJIZ_TEST_URL', 'http://127.0.0.1:8000').rstrip('/') + os.environ.get('MUNJIZ_TOOL_PATH', '/tools.html')
checks = []

def make_pdf(path, sentences=()):
    lines = ['BT /F1 10 Tf 40 740 Td']
    for sentence in sentences:
        safe = sentence.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
        lines.extend([f'({safe}) Tj', '0 -18 Td'])
    stream = ('\n'.join(lines) + '\nET').encode()
    objects = [b'<< /Type /Catalog /Pages 2 0 R >>', b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
               b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
               b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
               f'<< /Length {len(stream)} >>\nstream\n'.encode() + stream + b'\nendstream']
    output = bytearray(b'%PDF-1.4\n'); offsets = [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(len(output)); output.extend(f'{index} 0 obj\n'.encode() + obj + b'\nendobj\n')
    xref = len(output)
    output.extend(f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode())
    for offset in offsets[1:]: output.extend(f'{offset:010} 00000 n \n'.encode())
    output.extend(f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode())
    path.write_bytes(output)

with tempfile.TemporaryDirectory(prefix='munjiz-test-') as temporary, sync_playwright() as pw:
    folder = Path(temporary)
    english = [f'Scientific observation {i} requires systematic measurements and documented evidence from independent experiments.' for i in range(1, 61)]
    arabic = [f'الملاحظة العلمية رقم {i} تعتمد على القياسات الدقيقة وتوثيق البيانات ومراجعة النتائج التجريبية.' for i in range(1, 21)]
    txt = folder / 'lecture.txt'; txt.write_text('\n'.join(arabic), encoding='utf-8')
    docx = folder / 'lecture.docx'
    with ZipFile(docx, 'w', ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        archive.writestr('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        archive.writestr('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + ''.join(f'<w:p><w:r><w:t>{escape(line)}</w:t></w:r></w:p>' for line in arabic) + '</w:body></w:document>')
    pdf = folder / 'lecture.pdf'; make_pdf(pdf, english[:12])
    blank = folder / 'image-only.pdf'; make_pdf(blank)
    options = {'executable_path': '/usr/bin/chromium', 'headless': True, 'args': ['--no-sandbox']}
    proxy = os.environ.get('HTTPS_PROXY')
    if proxy:
        p = urlsplit(proxy)
        options['proxy'] = {'server': f'{p.scheme}://{p.hostname}:{p.port or 80}', 'bypass': '127.0.0.1,localhost'}
        if p.username: options['proxy']['username'] = p.username
        if p.password: options['proxy']['password'] = p.password
    browser = pw.chromium.launch(**options)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page(); errors = []; posts = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: posts.append(request.url) if request.method == 'POST' and not request.url.endswith('/api/visitors') else None)
    assert page.goto(URL, wait_until='networkidle').status == 200
    def open_tool(name): page.locator(f'.tool-tile[data-open-tool="{name}"] .tool-open').click()
    def close_tool(name): page.locator(f'#dlg-{name} [data-close-modal]').click()
    def check(name): checks.append(name); print('PASS:', name, flush=True)

    page.evaluate("localStorage.setItem('munjaz.audience', JSON.stringify('grad'))")
    page.reload(wait_until='networkidle')
    expect(page.locator('#toolTiles')).to_be_visible()
    assert page.evaluate("JSON.parse(localStorage.getItem('munjaz.audience'))") == 'grad'
    expect(page.locator('.tool-tile[data-open-tool="gpa"] .badge-rec')).to_be_visible()
    assert page.locator('.tool-tile').count() == 7
    check('audience persistence, single free-tool directory and application startup')
    open_tool('gpa')
    rows = page.locator('.gpa-row')
    for i, (weight, mark) in enumerate(((3, 85), (2, 90))):
        rows.nth(i).locator('.g-units').fill(str(weight)); rows.nth(i).locator('.g-mark').fill(str(mark))
    expect(page.locator('#gpaResult')).to_have_text('87%')
    rows.nth(0).locator('.g-mark').fill('150'); expect(page.locator('#gpaResult')).to_have_text('—')
    page.locator('[data-mode="gpa-points"]').click()
    rows.nth(0).locator('.g-units').fill('1'); rows.nth(0).locator('.g-mark').fill('5')
    expect(page.locator('#gpaResult')).to_have_text('—')
    page.locator('#gpaScale').select_option('5'); expect(page.locator('#gpaResult')).to_have_text('5')
    close_tool('gpa'); check('weighted average, invalid grades and explicit GPA scale')
    open_tool('sample')
    expect(page.locator('#ssResult')).to_have_text('385')
    page.locator('#ssPop').fill('-10'); expect(page.locator('#ssResult')).to_have_text('—')
    page.locator('#ssPop').fill('1000'); expect(page.locator('#ssResult')).to_have_text('278')
    close_tool('sample'); check('sample size and invalid population')
    open_tool('words'); page.locator('#wcText').fill('البَحْثُ العِلْمِيُّ مُهِمٌّ')
    expect(page.locator('#wcWords')).to_have_text('3'); close_tool('words'); check('Arabic diacritics word count')
    open_tool('units'); page.locator('#unitCategorySelect').select_option('length')
    page.locator('#unitInputValue').fill('1'); page.locator('#unitToSelect').select_option('km')
    expect(page.locator('#unitOutputResult')).to_have_text('0.001')
    page.locator('#unitFromSelect').select_option('in'); page.locator('#unitToSelect').select_option('m')
    expect(page.locator('#unitOutputResult')).to_have_text('0.0254')
    page.locator('#unitCategorySelect').select_option('temperature'); page.locator('#unitInputValue').fill('-300')
    expect(page.locator('#unitOutputResult')).to_have_text('—'); close_tool('units'); check('unit precision and absolute zero')
    open_tool('references'); page.locator('#styleIeeeBtn').click()
    for i in (1, 2):
        page.locator('#refAuthors').fill('Smith, A.'); page.locator('#refTitle').fill(f'Paper {i}')
        page.locator('#refYear').fill('2024'); page.locator('#addRefToList').click()
    expect(page.locator('#savedRefsList')).to_contain_text('[2]')
    page.locator('#addRefToList').click(); expect(page.locator('#savedRefsCount')).to_have_text('2')
    page.reload(wait_until='networkidle'); expect(page.locator('#savedRefsCount')).to_have_text('2')
    check('IEEE numbering, duplicate rejection and reference persistence')

    open_tool('quiz')
    # An old asynchronous read must not replace text after its selection is cleared.
    page.locator('#quizCustomText').fill('نص سابق يجب الاحتفاظ به')
    page.evaluate('''() => {
        window.originalQuizCore = window.MunjizQuiz;
        window.MunjizQuiz = { ...window.MunjizQuiz, extractFile(file, signal) {
            signal.addEventListener('abort', () => { window.cancelledQuizRead = true; });
            return new Promise(resolve => { window.resolveQuizRead = resolve; });
        } };
    }''')
    page.locator('#quizFileInput').set_input_files(str(txt))
    expect(page.locator('#quizCustomText')).to_be_disabled()
    expect(page.locator('#startQuizBuildBtn')).to_be_disabled()
    page.locator('#quizFileInput').set_input_files([])
    expect(page.locator('#quizCustomText')).to_be_enabled()
    expect(page.locator('#startQuizBuildBtn')).to_be_enabled()
    assert page.evaluate('window.cancelledQuizRead') is True
    page.evaluate('''async () => {
        window.resolveQuizRead('نص من قراءة قديمة يجب تجاهله');
        await new Promise(resolve => setTimeout(resolve, 0));
        window.MunjizQuiz = window.originalQuizCore;
        delete window.originalQuizCore;
    }''')
    expect(page.locator('#quizCustomText')).to_have_value('نص سابق يجب الاحتفاظ به')
    expect(page.locator('#quizFileStatus')).to_contain_text('تم إلغاء')
    check('cancelled file selection restores controls and ignores stale extraction')
    def build(count=5, kind='mixed'):
        page.locator('#quizCountSelect').fill(str(count)); page.locator('#quizTypeSelect').select_option(kind)
        page.locator('#startQuizBuildBtn').click()
    def return_to_setup(): page.locator('#quizBackSetup').click()
    def check_export(path, questions, options, keys, include_answers=False):
        with ZipFile(path) as archive:
            assert archive.testzip() is None
            for name in archive.namelist():
                if name.endswith(('.xml', '.rels')): ET.fromstring(archive.read(name))
            document = ET.fromstring(archive.read('word/document.xml'))
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs = [''.join(p.itertext()) for p in document.findall('.//w:p', ns)]
            content = '\n'.join(paragraphs)
            assert 'اختبار <تجريبي> & قابل للتعديل' in content
            assert 'المدرّس: أستاذ الاختبار' in content
            for index, question in enumerate(questions):
                assert f'{index + 1}. {question}' in paragraphs
                for option in options[index]: assert option in content
            assert bool(document.findall('.//w:br[@w:type="page"]', ns)) == include_answers
            assert ('مفتاح الإجابات — نسخة المدرّس' in content) == include_answers
            if include_answers:
                key_lines = paragraphs[paragraphs.index('مفتاح الإجابات — نسخة المدرّس') + 2:]
                assert len(key_lines) == len(questions)
                for index, line in enumerate(key_lines):
                    assert line.endswith(options[index][keys[index]])
            assert document.findall('.//w:bidi', ns)
            assert 'Tajawal' in archive.read('word/styles.xml').decode()
    for fixture in (txt, docx, pdf):
        page.locator('#quizFileInput').set_input_files(str(fixture))
        expect(page.locator('#quizFileStatus')).to_contain_text('تمت قراءة', timeout=45000)
        assert len(page.locator('#quizCustomText').input_value()) > 300
        build(5, 'mcq'); expect(page.locator('#quizReviewView')).to_be_visible()
        assert page.locator('#quizReviewList section').count() == 5
        assert page.locator('#quizReviewList input').count() == 20
        return_to_setup(); check(f'{fixture.suffix} local extraction and five source-based MCQs')
    page.locator('#quizRemoveFile').click()
    page.locator('#quizCustomText').fill('\n'.join(english))
    build(50, 'tf'); assert page.locator('#quizReviewList section').count() == 50
    assert page.locator('#quizReviewList input').count() == 100
    return_to_setup(); check('requested count 50 and true/false type')
    build(5, 'mixed')
    cards = page.locator('#quizReviewList section')
    expect(cards.nth(0).locator('select')).to_be_hidden()
    expect(cards.nth(0).locator('details')).to_be_hidden()
    assert cards.nth(0).locator('textarea').evaluate('e => e.readOnly')
    questions = [cards.nth(i).locator('textarea').input_value() for i in range(5)]
    options = [[input.input_value() for input in cards.nth(i).locator('input').all()] for i in range(5)]
    keys = [int(cards.nth(i).locator('select').input_value()) for i in range(5)]
    page.locator('#quizExportTitle').fill('اختبار <تجريبي> & قابل للتعديل')
    page.locator('#quizExportTeacher').fill('أستاذ الاختبار')
    with page.expect_download() as download:
        page.locator('#quizExportDocx').click()
    student_doc = folder / 'students.docx'; download.value.save_as(student_doc)
    assert download.value.suggested_filename == 'munjiz-quiz-students.docx'
    check_export(student_doc, questions, options, keys)
    page.locator('#quizTeacherMode').check()
    expect(cards.nth(0).locator('select')).to_be_visible()
    page.locator('#quizExportAnswers').check()
    with page.expect_download() as download:
        page.locator('#quizExportDocx').click()
    teacher_doc = folder / 'teacher.docx'; download.value.save_as(teacher_doc)
    assert download.value.suggested_filename == 'munjiz-quiz-teacher.docx'
    check_export(teacher_doc, questions, options, keys, include_answers=True)
    page.locator('#quizTeacherMode').uncheck()
    assert page.locator('#quizExportAnswers').is_checked() is False
    expect(page.locator('#quizExportAnswers')).to_be_disabled()
    check('editable RTL DOCX student copies exclude keys; teacher keys use a separate page')
    page.locator('#quizTeacherMode').check()
    cards.nth(0).locator('textarea').fill('سؤال معدل للمراجعة')
    page.locator('#quizConfirmStart').click()
    expect(page.locator('#qCurrentText')).to_have_text('سؤال معدل للمراجعة')
    answered_types = set()
    for i, key in enumerate(keys):
        expect(page.locator('#qAnswerFeedback')).to_be_hidden()
        expect(page.locator('#qAnswerFeedback')).to_have_text('')
        assert page.locator('#qCurrentOptions .correct, #qCurrentOptions .incorrect').count() == 0
        answered_types.add(page.locator('#qCurrentOptions button').count())
        page.locator('#qCurrentOptions button').nth(key if i < 3 else (key + 1) % page.locator('#qCurrentOptions button').count()).click()
        expect(page.locator('#qAnswerFeedback')).to_be_visible()
        expect(page.locator('#qAnswerFeedback')).to_contain_text(f'الإجابة الصحيحة: {options[i][key]}')
        expect(page.locator('#qCurrentOptions button').nth(key)).to_have_class('q-opt selected correct' if i < 3 else 'q-opt correct')
        assert all(button.is_disabled() for button in page.locator('#qCurrentOptions button').all())
        page.locator('#qNextBtn' if i < 4 else '#qSubmitBtn').click()
    assert answered_types == {2, 4}
    expect(page.locator('#quizScorePercent')).to_have_text('60%')
    page.locator('#quizRetryWrongBtn').click(); expect(page.locator('#quizCurrentProgress')).to_contain_text('من 2')
    expect(page.locator('#qAnswerFeedback')).to_be_hidden()
    expect(page.locator('#qCurrentOptions button').first).to_be_enabled()
    page.locator('#cancelQuizBtn').click(); check('review edits, deterministic grading and retry wrong answers')
    check('MCQ and true/false answers hidden before answering, revealed afterward and locked')
    build(2, 'mixed'); page.locator('#quizConfirmStart').click()
    page.locator('#qNextBtn').click(); page.locator('#qSubmitBtn').click()
    expect(page.locator('#quizScorePercent')).to_have_text('0%')
    assert page.locator('#quizDetailedList').inner_text().count('الحل مخفي') == 2
    assert 'الإجابة المعتمدة:' not in page.locator('#quizDetailedList').inner_text()
    page.locator('#quizNewBtn').click(); check('unanswered questions do not reveal keys in the report')
    page.locator('#quizCustomText').fill('عنوان محاضرة فقط'); build(10)
    expect(page.locator('#quizBuildMsg')).to_contain_text('خفّض العدد')
    page.locator('#quizFileInput').set_input_files(str(blank))
    expect(page.locator('#quizFileStatus')).to_contain_text('لم يُستخرج نص', timeout=45000)
    page.locator('#quizFileInput').set_input_files({'name': 'fake.docx', 'mimeType': 'application/octet-stream', 'buffer': b'not a docx'})
    expect(page.locator('#quizFileStatus')).to_contain_text('ليس DOCX')
    page.locator('#quizFileInput').set_input_files({'name': 'large.txt', 'mimeType': 'text/plain', 'buffer': b'a' * (10 * 1024 * 1024 + 1)})
    expect(page.locator('#quizFileStatus')).to_contain_text('10 ميغابايت')
    page.locator('#quizRemoveFile').click(); check('insufficient content, image-only PDF, invalid DOCX and file size limit')
    for preset in ('ethics', 'bologna'):
        page.locator('#quizPresetSelect').select_option(preset); build(10)
        assert page.locator('#quizReviewList section').count() == 10
        return_to_setup()
    close_tool('quiz'); check('ethics and Bologna independent material')
    open_tool('promotion'); page.locator('#promoCount').fill('1.9'); page.locator('#promoForm button').click()
    expect(page.locator('#promoMsg')).to_contain_text('صحيح')
    page.locator('#promoCount').fill('2'); page.locator('#promoForm button').click()
    expect(page.locator('#promoTotal')).to_have_text('24'); close_tool('promotion')
    page.locator('#authBtn').click(); page.locator('#authName').fill('Test A'); page.locator('#authEmail').fill('a@example.com')
    page.locator('#authSubmit').click(); expect(page.locator('#accName')).to_have_text('Test A')
    page.once('dialog', lambda dialog: dialog.accept()); page.locator('#authLogout').click()
    assert page.evaluate("localStorage.getItem('munjaz.promo')") is None
    expect(page.locator('#savedRefsCount')).to_have_text('0'); page.locator('#authModal [data-close-modal]').first.click()
    check('fractional promotion rejection and confirmed local data deletion')
    for width in (320, 390, 820, 1024, 1440):
        page.set_viewport_size({'width': width, 'height': 900})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.set_viewport_size({'width': 390, 'height': 844})
    open_tool('units'); expect(page.locator('#unitSwapBtn')).to_be_visible(); close_tool('units')
    open_tool('sample'); assert len(page.locator('#ssForm').evaluate('e=>getComputedStyle(e).gridTemplateColumns').split()) == 1
    close_tool('sample'); check('responsive layouts, mobile unit swap and one-column form')
    assert not errors, errors
    assert not posts, posts
    context.close()
    failure = browser.new_context()
    failure.add_init_script("Storage.prototype.setItem = function(){throw new DOMException('Denied','SecurityError')}; Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new DOMException('Denied','NotAllowedError'))}})")
    page = failure.new_page(); page.goto(URL, wait_until='networkidle')
    page.locator('#authBtn').click(); page.locator('#authName').fill('Not Saved'); page.locator('#authEmail').fill('failed@example.com')
    page.locator('#authSubmit').click(); expect(page.locator('#authMsg')).to_contain_text('تعذّر حفظ')
    page.locator('#authModal [data-close-modal]').first.click()
    open_tool('units'); page.locator('#unitCopyBtn').click(); expect(page.locator('#unitCopyBtn')).to_contain_text('تعذّر النسخ')
    failure.close(); browser.close(); check('storage and clipboard denial produce honest errors')

print(f'{len(checks)} browser check groups passed; no file uploads to a server.')
