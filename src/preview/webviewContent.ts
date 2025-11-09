export function getWebviewContent(data: any): string {
  const escapedDescription = escapeHtml(data.description ?? "");

  return /* html */ `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(data.title ?? "Sellhub Preview")}</title>
    <style>
      body {
        font-family: sans-serif;
        padding: 16px;
        color: #222;
        background: #f5f5f5;
      }
      h1 {
        color: #007acc;
      }
      pre {
        background: #fff;
        padding: 10px;
        border-radius: 6px;
        border: 1px solid #ccc;
      }
      footer {
        margin-top: 16px;
        font-size: 0.9em;
        color: #666;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(data.title ?? "Preview")}</h1>
    <pre>${escapedDescription}</pre>
    <footer>Generated at ${data.timestamp}</footer>
  </body>
  </html>`;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
