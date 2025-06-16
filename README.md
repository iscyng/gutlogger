# GutLogger – Log Analysis Web App

GutLogger is a React + Vite web application that lets you **upload Bubble-Sensor log files ( `.log` ) and instantly visualize & compare the pressure profiles of each test cycle**.  
It automatically extracts the key phases in every cycle and presents them in dedicated panels:

* **Full Cycle Pressure** – complete pressure trace from start to finish.
* **Sample Push Pressure** – isolates the section between "Waiting to trigger with sample" and "Triggered!" for each file and overlays multiple tests for easy comparison.  
  Includes a peak-pressure line chart, per-file stats table and unit-comparison analytics.
* **Cleaning Cycle Pressure** – shows the cleaning-only portion (Bubble Sensor Second) with the same overlay, table and analytics as the sample-push panel.
* **Additional Analysis** – battery stats, program starts and error summaries powered by Supabase edge functions.

Key features
------------
* Drag-and-drop multiple `.log` files – the app parses them in-browser (no server needed for core analysis).
* Interactive charts (Recharts) with tooltips, legends and hide/show toggles.
* Assign "Unit" labels to each file and view aggregated statistics across units.
* **Single "Export Excel" button** that generates one workbook containing:
  * A Summary sheet (Sample-push & Cleaning tables).
  * Individual sheets for every file (sample-push & cleaning data).
* Modern UI built with **shadcn-ui** + **Tailwind CSS**.

---

## Local development

```bash
# 1. Clone & install
npm i

# 2. Start dev server
npm run dev
```
The app will be available at http://localhost:5173 (default Vite port).

### Environment variables
If you want to enable the optional Supabase edge-function analysis, create a `.env` file with your Supabase URL & anon key:
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## Deployment
You can deploy with any static-hosting provider (e.g. Netlify, Vercel).  
Build the production bundle:
```bash
npm run build
```
The static files will be in `dist/`.
