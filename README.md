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

---

## Original Lovable instructions (optional)

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/fa298068-0b28-49eb-8983-174dfdd89609

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/fa298068-0b28-49eb-8983-174dfdd89609) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/fa298068-0b28-49eb-8983-174dfdd89609) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
