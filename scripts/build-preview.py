"""Generate one review HTML with inline code, fonts, DOCX template and file readers.

No Git writes, deployments or invented news. Source application modules stay intact.
"""
import base64
import hashlib
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path('/tmp/munjiz-preview-fonts')
CACHE.mkdir(exist_ok=True)
def encoded(data): return base64.b64encode(data).decode('ascii')
def inline_script(source): return '<script>' + re.sub(r'</script', r'<\\/script', source, flags=re.I) + '</script>\n'
def inner_main(text): return re.search(r'<main id="main">(.*?)</main>', text, re.S).group(1)
def read(name): return (ROOT/name).read_text()

home,tools,services=map(read,['index.html','tools.html','services.html'])
head=home[:home.index('  <main id="main">')]
head=head.replace('<title>مُنجز أكاديمي | لا نكتب عنك... نُنجز معك</title>', '<title>معاينة مُنجز أكاديمي — نسخة للمراجعة</title>')
head=re.sub(r'  <link[^>]+(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]+>\n','',head)
head=head.replace('  <link rel="stylesheet" href="styles.css">', '<style>'+read('styles.css')+'\n[data-preview-view][hidden] {display:none!important;}\n</style>')

# Google serves the same approved Tajawal family. Preserve TLS, capture a local cache,
# and embed the OFL licence so the review file does not require a font connection.
font_css=CACHE/'tajawal.css'
if not font_css.exists():
    url='https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap'
    request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36'})
    with urllib.request.urlopen(request,timeout=30) as response: font_css.write_bytes(response.read())
css=font_css.read_text()
for index,url in enumerate(dict.fromkeys(re.findall(r'url\((https://fonts\.gstatic\.com/[^)]+)\)',css))):
    suffix=Path(url).suffix; path=CACHE/f'font-{index}{suffix}'
    if not path.exists():
        with urllib.request.urlopen(url,timeout=30) as response: path.write_bytes(response.read())
    mime='font/woff2' if suffix=='.woff2' else 'font/ttf'
    css=css.replace(url,f'data:{mime};base64,{encoded(path.read_bytes())}')
licence=CACHE/'OFL.txt'
if not licence.exists():
    with urllib.request.urlopen('https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/OFL.txt',timeout=30) as response: licence.write_bytes(response.read())
head=head.replace('</head>', '<style>'+css+'</style>\n</head>')

tool_main=inner_main(tools)
tool_dialogs=re.findall(r'<dialog\b.*?</dialog>',tool_main,re.S)
tool_main=re.sub(r'<dialog\b.*?</dialog>','',tool_main,flags=re.S)
footer=home[home.index('  <!-- ============ Footer'):home.index('  <!-- ============ Integrity Charter Modal')]
shared_dialogs=re.findall(r'<dialog\b.*?</dialog>',home[home.index('  <!-- ============ Integrity Charter Modal'):],re.S)
service_dialog=re.search(r'<dialog class="modal" id="serviceRequestModal".*?</dialog>',services,re.S).group(0)
template='data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,'+encoded((ROOT/'resources/research-plan.docx').read_bytes())
tool_main=tool_main.replace('resources/research-plan.docx',template)
tool_main=tool_main.replace('وخط Tajawal يُحمّل من Google Fonts.', 'وخط Tajawal مضمن داخل نموذج المعاينة.')
content=head+'<main id="main">\n'
news_strip='''<aside class="jobs-ticker container" aria-label="أحدث إعلانات التعيينات الموثقة"><strong>آخر التعيينات الموثقة</strong><div id="jobsTicker"></div><a href="#jobs">عرض التعيينات ←</a></aside>'''
home_main=inner_main(home).replace('    <!-- ============ Two clear routes',news_strip+'\n    <!-- ============ Two clear routes',1)
content=content.replace('<a href="services.html">الخدمات المدفوعة</a>','<a href="services.html">الخدمات المدفوعة</a><a href="#jobs">التعيينات</a>')
for name,markup in [('home',home_main),('tools',tool_main),('services',inner_main(services)),('jobs',read('jobs-section.html'))]:
    content+=f'<div data-preview-view="{name}"'+(' hidden' if name!='home' else '')+'>'+markup+'</div>\n'
content+='</main>\n'+footer+'\n'.join(tool_dialogs+shared_dialogs+[service_dialog])

assets={}
for folder in ['vendor/pdfjs/cmaps','vendor/pdfjs/standard_fonts']:
    for path in sorted((ROOT/folder).iterdir()):
        if path.suffix in ['.bcmap','.pfb','.ttf']: assets[path.relative_to(ROOT).as_posix()]=encoded(path.read_bytes())
assets['pdfModule']=encoded((ROOT/'vendor/pdfjs/pdf.min.mjs').read_bytes())
assets['pdfWorker']=encoded((ROOT/'vendor/pdfjs/pdf.worker.min.mjs').read_bytes())
bootstrap='const previewBinaryAssets='+json.dumps(assets,separators=(',',':'))+''';
(() => {
  const bytes = key => Uint8Array.from(atob(previewBinaryAssets[key]), char => char.charCodeAt(0));
  window.MunjizPreviewAssets = {
    pdf: URL.createObjectURL(new Blob([bytes('pdfModule')], {type:'text/javascript'})),
    worker: URL.createObjectURL(new Blob([bytes('pdfWorker')], {type:'text/javascript'})),
    CMapReaderFactory: class { async fetch({name}) { const key='vendor/pdfjs/cmaps/'+name+'.bcmap'; if (!previewBinaryAssets[key]) throw new Error('Missing bundled CMap'); return {cMapData:bytes(key),compressionType:1}; } },
    StandardFontDataFactory: class { async fetch({filename}) { const key='vendor/pdfjs/standard_fonts/'+filename; if (!previewBinaryAssets[key]) throw new Error('Missing bundled standard font'); return bytes(key); } },
  };
})();'''
content+=inline_script(bootstrap)
for name in ['vendor/jszip/jszip.min.js','vendor/mammoth/mammoth.browser.min.js']:
    content+=inline_script(read(name))
quiz=read('quiz-core.js').replace('  function loadMammoth() {','  function loadMammoth() {\n    if (window.mammoth) return Promise.resolve(window.mammoth);')
quiz=quiz.replace("import('./vendor/pdfjs/pdf.min.mjs')", 'import(window.MunjizPreviewAssets.pdf)')
quiz=quiz.replace("new URL('./vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href", 'window.MunjizPreviewAssets.worker')
quiz=quiz.replace("cMapUrl: new URL('./vendor/pdfjs/cmaps/', document.baseURI).href, cMapPacked: true,\n        standardFontDataUrl: new URL('./vendor/pdfjs/standard_fonts/', document.baseURI).href", 'CMapReaderFactory: window.MunjizPreviewAssets.CMapReaderFactory,\n        StandardFontDataFactory: window.MunjizPreviewAssets.StandardFontDataFactory')
assert 'import(\'./vendor/' not in quiz
content+=inline_script(quiz)
for name in ['quiz-export.js','visitor-counter.js','services-catalog.js','service-assistant.js','tool-directory.js','research-workspace.js','academic-jobs-data.js','academic-jobs.js','preview-router.js','app.js']:
    content+=inline_script(read(name))
licenses={'Tajawal OFL':licence.read_text()}
for path in (ROOT/'vendor').rglob('*LICENSE*'):
    if path.is_file(): licenses[path.relative_to(ROOT).as_posix()]=path.read_text()
content+='<script type="application/json" id="previewLicenses">'+json.dumps(licenses,ensure_ascii=False).replace('</','<\\/')+'</script>\n</body>\n</html>\n'
target=ROOT/'munjiz-preview.html'; target.write_text(content)
print(f'{target}: {target.stat().st_size:,} bytes; SHA256 {hashlib.sha256(target.read_bytes()).hexdigest()}')
