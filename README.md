# CSV → JSON Converter (React + Vite)

Quick demo app to upload a CSV, validate rows against a simple JSON schema, preview the data, and export as JSON.

## Features
- CSV parsing with headers (PapaParse)
- JSON schema (array of fields: `name`, `type`, `required`)
- Per-row validation (required fields, number, email)
- Preview first 10 rows + validation report
- Download valid dataset as JSON

## Getting Started
```bash
npm install
npm run dev
```

## Tech
- React 18, Vite 5
- papaparse for CSV parsing
- file-saver for JSON download

## Notes
- Extend `validators.js` for more rules (dates, min/max, regex).
- Replace the default schema in the UI or edit `DEFAULT_SCHEMA` in `App.jsx`.
- Add XLSX support later via the `xlsx` package.
