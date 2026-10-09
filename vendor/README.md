# Local document readers

- PDF.js / pdfjs-dist 5.4.296, Apache-2.0. Included: minified ESM reader, worker, CMaps, standard fonts, LICENSE.
- Mammoth 1.10.0, BSD-2-Clause. Included: browser bundle and LICENSE. Only extractRawText is used; document HTML is never injected.
- JSZip 3.10.2, MIT (also offered under GPL-3.0). Included: browser bundle, license and third-party notices. Used to generate editable OOXML/DOCX quizzes locally, loaded only on export.

Installed from registry.npmjs.org using npm's normal TLS and package integrity checks, with install scripts disabled. No paid service is required. These files are served locally and loaded only after the user selects the relevant file type.

To refresh, install the explicitly reviewed versions into a temporary directory with:

```sh
npm install --prefix /tmp/munjiz-libs --ignore-scripts --no-audit --no-fund pdfjs-dist@5.4.296 mammoth@1.10.0 jszip@3.10.2
```

Copy the corresponding browser files, CMaps, standard fonts and licenses, then rerun file-reader/browser tests. Do not replace versions without reviewing changes and verifying packages.
