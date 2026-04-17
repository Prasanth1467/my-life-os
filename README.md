## Life OS (offline-first desktop)

### What you have
- **Next.js App Router** frontend (static export, fully offline)
- **Offline-first state engine** with schema versioning + migrations + validation
- **Local-first persistence**
  - In **Tauri**: `state.json` in the app data directory (atomic write + backup/export/import)
  - In **browser/dev**: IndexedDB fallback (same schema)
- **Screens implemented**
  - `/dashboard`, `/today`, `/checkin`, `/dsa`, `/angular`, `/smoke`, `/calendar`, `/analytics`, `/goals`, `/journal`, `/intelligence`, `/mission`

### Run (web)
```bash
npm install
npm run dev
```

### Build (offline static export)
```bash
npm run build
```

### Run / Build (desktop with Tauri)
Prereqs:
- Node.js 20+
- Rust toolchain (Cargo) installed via `rustup`

Commands:
```bash
npm run tauri:dev
```

```bash
npm run tauri:build
```

# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```
