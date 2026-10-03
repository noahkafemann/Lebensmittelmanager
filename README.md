# Lebensmittelmanager

Intelligenter Vorrats- und Rezeptmanager (React + TypeScript + Supabase) für private Haushalte.

## 1) Voraussetzungen

- Node.js 20+
- npm 10+
- Supabase-Projekt
- GitHub-Repository mit aktiviertem GitHub Pages

## 2) Installation und lokaler Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 3) Supabase-Projekt anlegen

1. Neues Projekt auf https://supabase.com erstellen.
2. **Project URL** und **anon public key** notieren.
3. Auth aktivieren (E-Mail/Passwort).
4. Unter Authentication → URL Configuration die App-URL hinterlegen.

## 4) Umgebungsvariablen

`.env.local`:

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_BASE_PATH=/Lebensmittelmanager/
```

## 5) SQL-Migrationen ausführen

Reihenfolge:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_seed_examples.sql`

Danach optional (eingeloggt als Haushaltsmitglied) Beispielrezepte laden:

```sql
select public.seed_example_recipes_for_current_household();
```

## 6) E-Mail-Bestätigung und Passwort-Reset

- Authentication → Providers → Email aktiv lassen.
- **Confirm email** aktivieren.
- Redirect URLs setzen, z. B.:
  - `http://localhost:5173/Lebensmittelmanager/`
  - `https://<user>.github.io/Lebensmittelmanager/`

## 7) GitHub-Pages-Konfiguration

- Repo Settings → Pages → Source: GitHub Actions.
- Variable `VITE_BASE_PATH` auf `/Lebensmittelmanager/` setzen.

## 8) GitHub-Actions Workflow

Workflow-Datei: `.github/workflows/deploy.yml`

Benötigte Repository Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BASE_PATH`

> Der Anon-Key ist öffentlich nutzbar und nur zusammen mit RLS sicher.

## 9) Ersten Haushalt und Admin einrichten

1. Nutzer registrieren und E-Mail bestätigen.
2. Anmelden.
3. In **Haushalt** einen Haushalt anlegen.
4. Die Funktion `create_household_with_admin` setzt den aktuellen Nutzer als `admin`.

## 10) Weitere Familienmitglieder hinzufügen

1. Admin erstellt Einladung in **Haushalt**.
2. Admin gibt Token an Mitglied weiter.
3. Mitglied registriert sich mit derselben E-Mail.
4. Mitglied akzeptiert Einladung per Token in **Haushalt**.

## 11) Sicherheitsmodell

- Private Tabellen haben RLS (`households`, `household_members`, `household_invites`, `pantry_items`, `recipes`, `recipe_ingredients`, `recipe_steps`, `shopping_items`, `pantry_transactions`).
- Zugriff ausschließlich für Mitglieder des jeweiligen Haushalts.
- Einladungen nur über sichere RPCs (`create_household_invite`, `accept_household_invite`).
- Kochabschluss atomar über RPC `complete_cooking`.
- Kein Service-Role-Key im Frontend.

### Wichtige RPC-Funktionen

- `create_household_with_admin`
- `create_household_invite`
- `accept_household_invite`
- `complete_cooking`
- `purchase_item_to_pantry`
- `seed_example_recipes_for_current_household`

## 12) Sicherheitstests (mit zwei Testkonten)

- Konto A in Haushalt A, Konto B in Haushalt B.
- Prüfen:
  - A kann keine Daten von B lesen (`select` per UI/API).
  - A kann keine Daten von B ändern/löschen.
  - Member kann keine Admin-Rolle vergeben.
  - Einladungstoken muss zu eingeloggter E-Mail passen.
  - Kochmodus erzeugt keine negativen Bestände.

## 13) Tests und Qualität

Automatisierte Tests:

```bash
npm run test
```

Abgedeckt:

- Mengenumrechnung/Einheiten
- Haltbarkeitsklassifizierung
- Rezept-Matching (fehlende Zutaten)

Manuelle Tests nötig für:

- Supabase Auth-End-to-End
- RLS-Isolation zwischen Haushalten
- Multi-User-Synchronisation

## 14) Build

```bash
npm run build
```

## 15) Hinweise zu direktem Seitenaufruf unter GitHub Pages

- `VITE_BASE_PATH` und `BrowserRouter basename={import.meta.env.BASE_URL}` sind bereits integriert.
- Für SPA-Fallback kann zusätzlich ein `404.html` auf `index.html` zeigen (optional, je nach Pages-Setup).

