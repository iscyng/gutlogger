# GutLogger – Architecture Overview

```mermaid
graph TD
  subgraph "Frontend – React & Vite"
    UI["FileUploader / FileList\n(user selects .log files)"]
    Parser["logParser.ts\n• extractSamplePushData\n• extractCleaningCycleData\n• extractEvents"]
    Charts["Analysis Panels\n— Full-Cycle Pressure\n— Sample-Push Pressure\n— Cleaning-Cycle Pressure"]
    Export["Excel Export (xlsx)"]
    UI --> Parser
    Parser --> Charts
    Charts --> Export
  end

  subgraph "Supabase Edge Function"
    Fn2["analyze-additional-logs"]
  end

  Charts --> Fn2
  Fn2 -- "stats JSON" --> Charts
  Export --> XLSX["gutlogger_analysis.xlsx"]
```

The diagram shows:

1. **Frontend workflow**: users upload log files, the in-browser parser extracts relevant sections, and the data feeds various charts/panels. A single Excel export gathers all computed metrics.
2. **Edge functions** (optional): provide AI Q&A and extended statistics. These are called only when the corresponding panels need them. 