# P&D Build&Remodel -- Audited website

Build: 2026.10.09-audit-1

## Open the desktop package

Extract the entire ZIP first. Keep index.html, styles.css, site.js and the assets folder together. Open index.html in a regular browser such as Edge or Chrome. Do not open it while it is still inside the ZIP. The separate phone/PC preview is a single self-contained HTML file with a diagnostic strip; that strip is not in this publishing page.

If a local browser policy restricts files, use a local web server or test deployment rather than disabling browser security. This package has not been published online and does not create a public website address.

## Files

- index.html: page content, four project stories, reviews, showroom and gallery.
- styles.css: the single design system, responsive rules, frame and photo viewer.
- site.js: one motion controller plus independent filters and photo viewer.
- assets/: original-size and responsive image variants, logo and actual Kona texture.
- asset-manifest.json: source filenames, source hashes and output dimensions.
- AUDIT-REPORT.md: confirmed findings, changes, tests and limitations.
- audit-test-results.json: recorded results for this build, not an automatic test runner.

## Motion and phone previews

Content is visible by default. Animations require the viewer to execute JavaScript and provide the animation API. Reduced Motion is respected. The footer includes manual pause/replay controls. The standalone preview includes a status strip to distinguish active scripts, reduced motion and a static preview. A local attachment viewer is not the same test environment as the eventual hosted website. Physical iPhone/Safari testing remains necessary before launch.

## Publishing

The deployable files are index.html, styles.css, site.js and assets/. Keep their paths intact. AUDIT-REPORT.md, audit-test-results.json and asset-manifest.json can stay private in your working copy rather than be uploaded. Do not use the large self-contained preview as the production index.

No estimate form backend, payments, tracking, domain or hosting account is included. The contact buttons use the owner's supplied telephone, SMS and email destinations. Test each handoff and verify the Facebook page after deployment. Owner review of project claims and client permissions remains required.

## Future changes

Change component styles in styles.css instead of layering new style blocks. Keep each gallery thumbnail tied to its matching enlarged view. Keep the reviews and Project 02 photo pairing in regression checks. Uploaded originals have finite resolution; the build does not fabricate higher-resolution craftsmanship detail.
