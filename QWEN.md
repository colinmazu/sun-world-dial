# Coding rules for this folder

- Answer what the user asks, and nothing more. If a message is a question or chat, reply in text only. Do not read
  files, edit files, or run commands unless the user asks you to.
- Plain HTML, CSS, and JavaScript (ES modules). The only libraries allowed are Three.js, loaded from the CDN through
  the import map in `index.html`, SunCalc, already in `vendor/suncalc.js`, and exifr, already in
  `vendor/exifr-lite.umd.js`. No npm, no package.json, no build tools.
- Do not edit anything in `vendor/` or `assets/`.
- Never start a web server or any other command that keeps running. The user runs the server.
- Do not create extra files such as test pages, copies, or previews. Do not use the artifact tool.
- Keep code simple and readable. Add a short comment above each function. Use 2-space indentation.
