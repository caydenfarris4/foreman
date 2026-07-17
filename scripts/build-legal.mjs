// Converts docs/legal/*.md into the generated HTML modules the /terms and
// /privacy pages render (lib/legal/*-html.ts). The markdown subset is only
// what those documents use: #/## headings, paragraphs, blockquotes, bullet
// and numbered lists, tables, **bold**, and [links](). Content is static
// and first-party, so rendering it with dangerouslySetInnerHTML is safe.
//
// Edit the markdown, then: node scripts/build-legal.mjs  (commit both).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const DOCS = [
  { md: "docs/legal/terms.md", out: "lib/legal/terms-html.ts", name: "termsHtml" },
  { md: "docs/legal/privacy.md", out: "lib/legal/privacy-html.ts", name: "privacyHtml" },
];

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Inline markdown: bold and links, applied after HTML-escaping.
function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_, text, href) => `<a href="${href}">${text}</a>`,
    );
}

function mdToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      out.push(`<h1>${inline(line.slice(2))}</h1>`);
      i++;
      continue;
    }
    if (line.startsWith("> ")) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
      continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i]);
        i++;
      }
      const cells = (r) =>
        r
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
      const header = cells(rows[0]);
      const body = rows.slice(2).map(cells); // rows[1] is the |---| divider
      out.push(
        `<div class="table-scroll"><table><thead><tr>${header
          .map((h) => `<th>${inline(h)}</th>`)
          .join("")}</tr></thead><tbody>${body
          .map(
            (r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`,
          )
          .join("")}</tbody></table></div>`,
      );
      continue;
    }
    if (/^[-*] /.test(line) || /^\d+\. /.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items = [];
      const re = ordered ? /^\d+\. / : /^[-*] /;
      while (i < lines.length && re.test(lines[i])) {
        items.push(lines[i].replace(re, ""));
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(
        `<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</${tag}>`,
      );
      continue;
    }
    // Paragraph: gather until a blank line or a structural line.
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#|>|\||[-*] |\d+\. )/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

mkdirSync("lib/legal", { recursive: true });
for (const { md, out, name } of DOCS) {
  const html = mdToHtml(readFileSync(md, "utf8"));
  const banner = `// GENERATED from ${md} by scripts/build-legal.mjs — do not edit by hand.\n// To change the document: edit the markdown, re-run the script, commit both.\n`;
  writeFileSync(
    out,
    `${banner}export const ${name} = ${JSON.stringify(html)};\n`,
  );
  console.log(`wrote ${out} (${html.length} chars)`);
}
