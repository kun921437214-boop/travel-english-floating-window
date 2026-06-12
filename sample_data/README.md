# Sample Data

This directory contains small, sanitized examples only. It is safe to commit to GitHub.

The real Excel workbook and generated full JSON are intentionally kept out of Git:

- `data/澳新旅行英语_340句_915词.xlsx`
- `src/data/travel-english.json`
- `mobile-web/src/data/travel-english.json`

To rebuild real app data locally, place the Excel file in `data/` and run:

```bash
npm run convert:data
```
