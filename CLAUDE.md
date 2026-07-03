# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LOCI is a mobile application built with Ionic React and Capacitor for tracking personal objects via QR/barcode scanning and geolocation. The app communicates with a backend API (LOCI.Api) for user authentication, object management, and scan logging.

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts the Vite development server at http://localhost:5173 |
| `npm run build` | Compiles TypeScript and builds production web assets |
| `npm run preview` | Previews the production build locally |
| `npm run test.unit` | Runs unit tests with Vitest |
| `npm run test.e2e` | Runs end-to-end tests with Cypress (headless) |
| `npm run lint` | Executes ESLint for code quality |

### Capacitor-specific commands (run after `npm run build`)

- `npx cap add android` / `npx cap add ios` – Add native platforms
- `npx cap copy` – Copies web assets to native projects
- `npx cap sync` – Installs dependencies and copies assets
- `npx cap open android` / `npx cap open ios` – Open platform in Android Studio / Xcode
- `npx cap run android` / `npx cap run ios` – Build, install, and launch on device/emulator

## Architecture Overview

### Tech Stack

- **Frontend**: React 19, Ionic React 8, TypeScript
- **Build Tool**: Vite
- **Testing**: Vitest (unit), Cypress (e2e)
- **Styling**: Ionic CSS utilities + custom CSS variables
- **Native Bridge**: Capacitor 8 with plugins:
  - Camera, Barcode Scanning (ML Kit), Geolocation, Preferences, Filesystem, Network, Haptics, Local Notifications, Status Bar, App, Keyboard
- **State Management**: React hooks + Context‑like services (AuthService, StorageService)
- **Styling Customization**: `src/theme/variables.css` overrides Ionic color palette

### Folder Structure

```
src/
├── App.tsx          # Root component with routing and auth guard
├── main.tsx         # Entry point
├── vite-env.d.ts    # Vite TypeScript declarations
├── setupTests.ts    # Vitest/Jest DOM setup
├── components/      # Reusable UI components (e.g., ObjetCard)
├── models/          # TypeScript interfaces and types (Objet, DTOs, UserSession, SyncQueueItem)
├── pages/           // View components mapped to routes
│   ├── auth/        // LoginPage, RegisterPage
│   ├── Dashboard.tsx
│   ├── ObjetsPage.tsx
│   ├── ObjetDetailPage.tsx
│   ├── ScannerPage.tsx
│   ├── CartePage.tsx
│   └── ParametresPage.tsx
├─ services/         // Service classes encapsulating API and native calls
│   ├── ApiService.ts        // REST client with JWT auth
│   ├── AuthService.ts       // Login/logout/session (Capacitor Preferences)
│   ├── QrService.ts         // QR code generation & export
│   └── StorageService.ts    // Local object cache & offline sync queue
└── theme/           // CSS variable overrides
```

### State & Data Flow

- **Authentication**: `AuthService` manages JWT tokens stored in Capacitor Preferences. `App.tsx` uses `useEffect` to check login status on load and conditionally renders auth tabs or main tabs.
- **Object Data**: 
  - Remote: Fetched via `ApiService.getObjets()` from `/objets` endpoint.
  - Local cache: `StorageService` provides `getObjets/saveObjets/upsertObjet` for offline-first object listing.
  - Updates: `StorageService.upsertObjet` merges remote changes into local cache; `ApiService` handles persistence.
- **Offline Scans**: Scan events are queued in `StorageService.getPendingSync()` (SyncQueueItem) and replayed via `ApiService.syncPending()` when online.
- **QR Handling**: `QrService` generates Data URLs for display and exports PNGs to the device's Documents directory.

### Key Services

- **ApiService**: Central REST client; automatically attaches JWT bearer token; includes helpers for network checks (`isOnline`), object CRUD, scan posting, and sync queue processing.
- **AuthService**: Wraps `/auth/register` and `/auth/login` endpoints; stores session (`UserSession`); provides `getToken`, `isLoggedIn`, `logout`.
- **QrService**: Uses `qrcode` library to generate high‑resilience QR codes (error correction H) and Capacitor Filesystem to save PNGs.
- **StorageService**: Abstracts Capacitor Preferences for:
  - `loci_objets`: array of `Objet[] (or full) object list)
  - `loci_sync_queue`: array `[]`: queue of `SyncQueueItem` for offline scan retry

### Routing & Navigation

- Built with `react-router-dom` and Ionic Router outlets.
- Public routes: `/login`, `/register`.
- Protected main tabs under `/tabs/*` (Dashboard, Objets, Scanner, Carte, Parametres).
- Object detail: `/tabs/objets/:id` (view/edit) and `/tabs/objets/nouveau` (create).
- Default redirect: authenticated → `/tabs/dashboard`; unauthenticated → `/login`.

### Styling & Theming

- Ionic's CSS utilities are imported globally via `@ionic/react/css/*.css`.
- Custom theme variables are defined in `src/theme/variables.css` (primary, secondary, etc.).
- Components use Ionic slots (`start`, `end`) for icons and status indicators.

## Common Tasks

### Running the Application

1. Start dev server: `npm run dev`
2. For device testing:
   - Build web: `npm run build`
   - Sync to native: `npx cap copy` (or `npx cap sync`)
   - Open Android Studio: `npx cap open android`
   - Run on emulator/device from IDE, or via CLI: `npx cap run android`

### Testing

- **Unit tests**: Write `.test.tsx` files alongside components or in `__tests__` folders; run with `npm run test.unit`.
- **E2E tests**: Cypress specs reside in `cypress/e2e/`; run with `npm run test.e2e`.
- **Test helpers**: `setupTests.ts` configures Jest DOM globals for Vitest.

### Linting & Formatting

- ESLint configuration is in `eslint.config.js`; run `npm run lint`.
- No formatter is configured by default; follow existing code style (2‑space tabs, Prettier‑like formatting observed).

### Environment Configuration

- API base URL is hardcoded in `src/services/AuthService.ts` (`API_BASE`).  
  - For Android emulator: `http://10.0.2.2:5000/api`
  - For physical device: `http://<YOUR_LOCAL_IP>:5000/api`
  - For production: update to your domain.
- Consider moving to environment variables via `import.meta.env` if needed.

### Working with Capacitor Native Projects

- After any web build (`npm run build`), run `npx cap copy` to update native assets.
- Install additional Capacitor plugins via `npm install <plugin>` and `npx cap sync`.
- When planning native code changes (Android/Java or iOS/Swift), open the respective project with `npx cap open android` or `npx cap open ios`.
- Keep `capacitor.config.ts` in sync with plugin configuration (e.g., barcode scanner permissions).

## Notes for Contributors

- All new components should follow the existing pattern: stateless functional components with props interfaces.
- Services should be singleton objects (exported as literal) for easy import.
- When adding new API endpoints, extend `ApiService` and update corresponding models in `src/models/ObjetModel.ts`.
- Keep CSS in Angular/Ionic style: use Ionic utility classes (`ion-padding`, `ion-margin`, etc.) and CSS variables for theming.
- Write unit tests for service methods and complex components; e2e tests cover critical user flows (login, object creation, scan, map view).