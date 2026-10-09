"""Build an editable, general research-planning DOCX using standard library only."""
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent.parent
def paragraph(text, style=None):
    properties = '<w:pPr>' + (f'<w:pStyle w:val="{style}"/>' if style else '') + '<w:bidi/></w:pPr>'
    return '<w:p>' + properties + '<w:r><w:rPr><w:rtl/></w:rPr><w:t xml:space="preserve">' + escape(text) + '</w:t></w:r></w:p>'

body = [paragraph('مُنجز أكاديمي', 'Title'), paragraph('قالب عام لتنظيم خطة البحث والرسالة', 'Title'),
        paragraph('لا نكتب عنك… نُنجز معك'), paragraph('هذا القالب قابل للتعديل، وليس قالب جامعة رسمياً أو اعتماداً أكاديمياً. راجع تعليمات جامعتك ومشرفك؛ تختلف متطلبات الخط والهوامش وترتيب الفصول بين المؤسسات.'),
        paragraph('عنوان البحث: ........................................................'),
        paragraph('اسم الباحث: ........................................................'),
        paragraph('الجامعة / الكلية / القسم: ........................................................'),
        paragraph('اسم المشرف / الفريق العلمي: ........................................................'),
        paragraph('تاريخ النسخة: ........................................................')]
sections = [
    ('أولاً: بطاقة خطة البحث', ['مشكلة الدراسة والسؤال البحثي:', 'أهداف الدراسة وأهميتها:', 'حدود الدراسة: الموضوعية والمكانية والزمانية:', 'المفاهيم والمتغيرات والفرضيات إن انطبقت:', 'المنهج ومبررات اختياره:', 'مجتمع الدراسة والعينة وأداة جمع البيانات:', 'الموافقات الأخلاقية وحماية بيانات المشاركين:', 'خطة التحليل وحدود الاستنتاج:', 'الجدول الزمني وفق المواعيد الفعلية المتفق عليها:']),
    ('ثانياً: هيكلة أولية للفصول', ['الإطار العام للدراسة:', 'الإطار النظري والدراسات السابقة:', 'المنهجية وإجراءات جمع البيانات:', 'النتائج الفعلية وتحليلها:', 'المناقشة والاستنتاجات وحدود الدراسة:', 'قائمة المراجع والملاحق:']),
    ('ثالثاً: قائمة مراجعة قبل التسليم', ['☐ تطابق العنوان والمشكلة والأهداف والمنهج.', '☐ مراجعة الخطة والملاحظات مع المشرف أو الفريق العلمي.', '☐ التحقق من صحة المصادر وتوثيق الاقتباس وإعادة الصياغة.', '☐ عرض البيانات الفعلية دون اختلاق نتائج أو حذف ما يخالف التوقعات.', '☐ مراجعة الأشكال والجداول وترقيمها وإحالاتها.', '☐ تطبيق تعليمات الجامعة النافذة للخط والهوامش وترتيب الفصول.', '☐ التأكد من اتساق التوثيق والمراجع وإرفاق الموافقات اللازمة.', '☐ حفظ نسخة احتياطية ومراجعة متطلبات التسليم أو المجلة.']),
]
for title, lines in sections:
    body.append(paragraph(title, 'Heading1'))
    for line in lines:
        body.append(paragraph(line))
        if not line.startswith('☐'): body.append(paragraph('................................................................................'))
body.append(paragraph('المحتوى العلمي والبيانات مسؤولية الباحث. يدعم هذا القالب التنظيم والمراجعة ولا يحل محل الإشراف أو الموافقات الرسمية.'))
document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + ''.join(body) + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/><w:bidi/></w:sectPr></w:body></w:document>'
styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Tajawal" w:hAnsi="Tajawal" w:cs="Tajawal"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="ar-IQ" w:bidi="ar-IQ"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:after="160"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="0A4F4B"/><w:sz w:val="38"/><w:szCs w:val="38"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="8A5A0A"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style></w:styles>'''
types = '''<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'''
rels = '''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'''
word_rels = '''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'''
created=datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
core=f'''<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>قالب عام لتنظيم خطة البحث والرسالة — مُنجز أكاديمي</dc:title><dc:creator>مُنجز أكاديمي</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">{created}</dcterms:created></cp:coreProperties>'''
target=ROOT/'resources/research-plan.docx'; target.parent.mkdir(exist_ok=True)
with ZipFile(target,'w',ZIP_DEFLATED) as archive:
    for name,content in {'[Content_Types].xml':types,'_rels/.rels':rels,'word/document.xml':document,'word/styles.xml':styles,'word/_rels/document.xml.rels':word_rels,'docProps/core.xml':core}.items(): archive.writestr(name,content.encode())
print(target)
