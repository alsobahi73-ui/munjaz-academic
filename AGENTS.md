# AGENTS.md — Munjaz Academic Platform (منصة مُنجز أكاديمي)

> Instructions for AI coding agents (Codex/CLI) working on this repository.
> The site is Arabic-first, RTL. UI copy is Modern Standard Arabic (Iraqi-friendly tone).

## Project
- Static website, no build step, no framework. Plain HTML + CSS + JS.
- Main file: `munjaz-academic-fixed.html` (single self-contained file, ~145 KB).
- Companion file: `munjaz-promotion-calculator.html` (standalone free tool, linked from the homepage).
- Font: **Noto Kufi Arabic** (Google Fonts). Never use Tajawal.
- Layout: `dir="rtl"`, `lang="ar"`. Must stay clean at 390px mobile width — no horizontal scroll, sections stack.

## Identity — FROZEN, do not change
- Name: **مُنجز أكاديمي** / **Munjaz Academic**. NEVER write "Munjiz" / "MUNJIZ" in any spelling.
- Colors: teal `#0E6B66` (dark variant `#0B4F4B`), amber `#B97A12`. All primary CTAs teal.
  Exception: the floating WhatsApp button keeps the universal WhatsApp green.
- Logo: circle-check mark (open circle, check arm piercing the gap). No graduation-cap icon, no generic check-in-box.
- No emojis anywhere in the UI (including JS-generated content). No gold buttons. No bright-green buttons.

## Positioning & ethics — RED LINE
- Positioning: «نساعد في إنجاز وإكمال». Hero tagline: «لا نكتب عنك… ننجز معك».
- NEVER offer ghostwriting. Forbidden phrasings: «نكتب عنك», «نكتب لك», «إكمال رسالتك» as writing-for-you.
  Allowed framings: editing, structuring, guidance, accompaniment — e.g. «المرافقة البحثية للرسالة», «دعم إعداد البحوث للنشر», «الإرشاد لاختيار المجلة المناسبة — دون وعد بالقبول».
- The integrity charter modal (6 points) must remain reachable from the homepage. Do not weaken its wording.

## Honesty rules — strict
- No fabricated content: no fake official documents, no fake ministry links, no placeholder phone numbers visible to users.
- Anything not ready yet shows an honest toast: «قريبًا» / «قيد التجهيز» / «قيد الإعداد». Never a dead link or fake page.
- WhatsApp number is NOT set yet: all WhatsApp CTAs must keep showing the «قيد التجهيز» toast until a real number is configured in the SITE config. Do not invent a number.

## Current structure (homepage)
- Sticky single-row header (bilingual lockup: mark + مُنجز + أكاديمي + MUNJAZ ACADEMIC subline).
- Dark-teal gradient hero (split layout: text + «مساحتك الأكاديمية» mock card).
- News ticker (46px, under header): fed from the NEWS data array; auto-hides when NEWS is empty.
- 4 audience tabs → 12 services (undergrad 10 / postgrad 14 / researchers 8+plagiarism / faculty 10+plagiarism), each card with WhatsApp CTA.
- 7 built-in tools (kept by owner decision — improve them, do not remove).
- FAQ (6 items), integrity modal, footer (privacy/terms → «قيد الإعداد» toasts), newsletter with validation.

## Working rules for agents
- One task = one scoped change. Do not reformat unrelated code.
- When editing the single-file build, keep it working standalone (no external assets except Google Fonts).
- After each change, self-check: zero JS errors, 390px mobile has no horizontal scroll, RTL intact, toasts/modals still work.
- If two agents work in parallel, NEVER assign them overlapping sections of the same file — split by section or by file.

## Launch checklist (before go-live)
- [ ] Delete all NEWS items marked «تجريبي:» (test data).
- [ ] Set the real WhatsApp number in SITE config; verify every CTA opens wa.me correctly.
- [ ] Confirm pricing content with the owner (not decided yet) — do not invent prices.
- [ ] Final pass: mobile 390px, all toasts, ticker behavior with real news.

## News automation (added 2026-10-10, owner-approved model)
- Two modes, no exceptions: OFFICIAL sources publish fully automatically (website news.json + Telegram channel); UNOFFICIAL sources publish only after the owner's one-tap approval (private chat with انشر/تجاهل buttons).
- Sources config lives in `sources.yaml`; owner confirms the official list. Official (owner-approved 2026-10-10): mohesr.gov.iq (ministry news + university news sections) + ALL Iraqi public and private universities (list built from the ministry's official university directory; tiered schedule: ministry hourly, universities every 6h).
- Always attribute the source under every item; never rewrite official headlines; never invent news.
- Dedup by URL+title hash (`seen.json`); secrets (bot token) only as environment variables / GitHub Secrets, never in code or logs.
- No paid or always-on servers — free tiers only (GitHub Actions schedule + free webhook worker).
- Build brief for Codex agents: `munjaz-news-automation-codex-brief.md` (4 parallel tasks).

## أتمتة الأخبار — الجودة والإطلاق
- مهام التنفيذ موجودة في `codex-tasks/codex-task-{1,2,3,4}-*.md`. تحقّق من وجود مكونات المهام 1–3 قبل إعلان نجاح المهمة 4؛ يوجد المجمّع والناشر الرسمي وعرض الأخبار، لكن قائمة المصادر معلّقة وفارغة ومستقبل الموافقات مفقود. لا تعتبر خادم طلبات الخدمات ناشر أخبار أو مستقبل موافقات.
- الرسمي المعتمد يُنشر تلقائيًا؛ غير الرسمي يحتاج موافقة المالك لكل خبر. لا تغيّر العنوان الرسمي، وانسب كل خبر لمصدره الحقيقي.
- اختبر دورة الجمع والطابور والنشر والموافقة والتجاهل ومنع التكرار وإعادة المحاولة بعينات معزولة ومحاكاة تيليجرام؛ لا تضع أخبارًا وهمية في الموقع أو القناة العامة.
- الأسرار في GitHub Secrets أو إعدادات بيئة التشغيل الآمنة فقط؛ لا قيم في الشيفرة أو README أو السجلات. افحص مسارات الفشل أيضًا بحثًا عن تسرب التوكن.
- وثّق الأخطاء بالعربية، واعزل أعطال المصادر، وافحص التكرار عند إعادة التشغيل والموافقة المتكررة. لا تضع علامة نجاح لفحص لم يُنفَّذ.
- حدّث `README.md` و`docs/news-qa.md` بأوامر التنفيذ الفعلية بعد دمج المكونات، بما فيها مسار مراجعة يدوي عامل عند تعطل Webhook، وأكمل قائمة الإطلاق قبل النشر.
- عند عرض 390px افحص RTL وعدم التمرير الأفقي والتنبيهات، واختفاء شريط الأخبار عند فراغها. لا تصف الشريط بأنه يعمل إذا كان غير موجود.
