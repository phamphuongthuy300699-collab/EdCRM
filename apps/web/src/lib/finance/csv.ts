const escapeCell = (value: unknown) => {
  const text = value == null ? "" : String(value);
  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function createCsv(headers: string[], rows: unknown[][]) {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCell).join(";")).join("\r\n")}`;
}

export function csvResponse(filename: string, headers: string[], rows: unknown[][]) {
  return new Response(createCsv(headers, rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
