/**
 * Injects crawlable SEO tags into dist/index.html after `expo export`.
 * Client-side meta in App.js helps browsers; this helps Googlebot see tags in raw HTML.
 */
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://arthub.studiobuda.co.il';
const MAIN_SITE_URL = 'https://www.studiobuda.co.il';
const TITLE = 'ArtHub | סטודיו בודה';
const DESCRIPTION =
  'ArtHub של סטודיו בודה — הרשמה לשיעורים, יומן אישי וניהול כניסות. חלק מאתר סטודיו בודה.';

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error(`[inject-seo-meta] index.html not found at ${indexPath}`);
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

html = html.replace(/<html\b[^>]*>/i, '<html lang="he" dir="rtl">');
html = html.replace(/<title>[^<]*<\/title>/i, `<title>${TITLE}</title>`);

const seoBlock = `
    <meta name="description" content="${DESCRIPTION}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${SITE_URL}/" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="he_IL" />
    <meta property="og:site_name" content="StudioBuda ArtHub" />
    <meta property="og:title" content="${TITLE}" />
    <meta property="og:description" content="${DESCRIPTION}" />
    <meta property="og:url" content="${SITE_URL}/" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${TITLE}" />
    <meta name="twitter:description" content="${DESCRIPTION}" />
`;

if (!html.includes('name="description"')) {
  html = html.replace(/<title>[^<]*<\/title>/i, (match) => `${match}\n${seoBlock}`);
}

const noscriptHe = `
    <noscript>
      <p>ArtHub של סטודיו בודה — הרשמה לשיעורים ויומן אישי.</p>
      <p><a href="${MAIN_SITE_URL}">לאתר סטודיו בודה</a></p>
    </noscript>
`;

html = html.replace(
  /<noscript>[\s\S]*?<\/noscript>/i,
  noscriptHe.trim()
);

fs.writeFileSync(indexPath, html, 'utf8');
console.log(`[inject-seo-meta] Updated ${path.relative(process.cwd(), indexPath)}`);
