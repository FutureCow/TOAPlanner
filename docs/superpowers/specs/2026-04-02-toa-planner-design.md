# TOA Practicum Planner — Ontwerpdocument

**Datum:** 2026-04-02  
**School:** De Amersfoortse Berg  
**Doel:** Docenten kunnen practicums inplannen zodat de TOA weet wat wanneer gedaan moet worden.

---

## 1. Architectuur

### Stack
- **Frontend + Backend:** Next.js 14 (App Router, React, Tailwind CSS)
- **Database:** PostgreSQL 16 (rechtstreeks geïnstalleerd op de server)
- **ORM:** Prisma
- **Authenticatie:** NextAuth.js met Google OAuth provider
- **Procescbeheer:** PM2 of systemd
- **Reverse proxy:** Nginx (HTTPS)

### Deployment
- Next.js draait als Node.js proces op de server
- PostgreSQL draait als lokale service op dezelfde server
- Nginx proxyt HTTPS-verzoeken door naar Next.js op poort 3000
- Geen Docker

### Pagina's
| Route | Beschrijving |
|---|---|
| `/` | Weekkalender (standaard eerste vak) |
| `/[subject]` | Weekkalender voor specifiek vak |
| `/admin` | Admin-omgeving (alleen admins) |
| `/api/...` | Next.js API routes |

---

## 2. Authenticatie & Autorisatie

### Google SSO
- NextAuth.js met Google Provider
- Inlog beperkt tot schooldomein (bijv. `@amersfoortsebergschool.nl`)
- Bij eerste inlog: gebruiker aangemaakt in database met `isTeacher: true`, overige rollen `false`
- Als globale instelling `registrationOpen: false` is, wordt eerste inlog geweigerd

### Rollen (meerdere per gebruiker mogelijk)
| Rol | Kan |
|---|---|
| **isTeacher** | Eigen aanvragen aanmaken, bewerken, verwijderen |
| **isTOA** | Alle aanvragen bekijken, status wijzigen, bewerken, verwijderen |
| **isAdmin** | Alles van TOA + toegang tot `/admin` |

### Toegang (`allowed`)
- Admin kan per gebruiker `allowed` aan/uitzetten
- Geblokkeerde gebruikers (`allowed: false`) kunnen niet inloggen, ook niet als ze een geldig schooldomein hebben

---

## 3. Datamodel

### `User`
| Veld | Type | Beschrijving |
|---|---|---|
| id | String | Google user ID |
| email | String | Schoole-mailadres (uniek) |
| name | String | Volledige naam |
| image | String? | Profielfoto URL |
| abbreviation | String | Eerste 4 letters van e-mail (bijv. `beem`), automatisch gegenereerd |
| isTeacher | Boolean | Default: true |
| isTOA | Boolean | Default: false |
| isAdmin | Boolean | Default: false |
| allowed | Boolean | Mag inloggen, default: true |
| createdAt | DateTime | |

### `Request`
| Veld | Type | Beschrijving |
|---|---|---|
| id | String | CUID |
| title | String | Naam van de proef |
| classroom | String | Gewenst lokaal |
| date | DateTime | Datum van het practicum |
| period | Int | Uur-nummer (1–10) |
| subject | Enum | `NATUURKUNDE \| SCHEIKUNDE \| BIOLOGIE \| PROJECT` |
| status | Enum | `PENDING \| APPROVED_WITH_TOA \| APPROVED_WITHOUT_TOA \| REJECTED` |
| createdById | String | FK → User |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### `AppSettings`
| Veld | Type | Beschrijving |
|---|---|---|
| id | Int | Altijd 1 (singleton) |
| registrationOpen | Boolean | Nieuwe aanmeldingen toegestaan |

---

## 4. Weekkalender (hoofdpagina)

### Layout
- Navigatiebalk bovenaan met tabbladen: **Natuurkunde**, **Scheikunde**, **Biologie**, **Project/NLT**, **Overzicht**
- Weeknavigatie: vorige/volgende week, "Vandaag"-knop
- Kalender: maandag t/m vrijdag als kolommen, 1e t/m 10e uur als rijen
- Huidige dag gemarkeerd

### Aanvragen in de kalender
- Aanvragen getoond als gekleurde blokjes per cel
- Elke aanvraag toont **2 regels**: naam van de proef en lokaal
- Onderaan: afkorting van de docent
- Meerdere aanvragen per cel worden gestapeld
- Kleurcodering:
  - **Grijs** — aangevraagd (`PENDING`)
  - **Groen** — goedgekeurd met TOA (`APPROVED_WITH_TOA`)
  - **Geel** — goedgekeurd zonder TOA (`APPROVED_WITHOUT_TOA`)
  - **Rood** — afgekeurd (`REJECTED`)

### Interactie
- **Hover** over een cel → **+** knopje verschijnt → klik om nieuwe aanvraag toe te voegen
- **Klik op een bestaand blokje** → detail panel opent
- In detail panel:
  - TOA/Admin: statuswijziging (grijs/groen/geel/rood), bewerken, verwijderen
  - Docent: bewerken en verwijderen van eigen aanvragen

### Overzicht-tabblad
- Toont aanvragen van alle 4 vakken gecombineerd in één kalender

---

## 5. Aanvraag aanmaken / bewerken (modal)

Velden:
- **Naam van de proef** (tekstveld, verplicht)
- **Gewenst lokaal** (tekstveld, verplicht)
- **Datum** (datumprikker, standaard ingesteld op geklikte dag)
- **Uur** (dropdown 1–10, standaard ingesteld op geklikt uur)
- **Vak** (automatisch op basis van huidig tabblad, aanpasbaar)

Na opslaan: aanvraag verschijnt direct in de kalender met status `PENDING` (grijs).

---

## 6. Admin-omgeving (`/admin`)

Alleen toegankelijk voor gebruikers met `isAdmin: true`.

### Tab 1: Aanvragen
- Tabel met alle aanvragen (alle vakken)
- Filterbaar op vak en status
- Zoekbalk op naam of docent
- Checkbox per rij voor bulk-selectie
- Bulk verwijderen van geselecteerde aanvragen

### Tab 2: Gebruikers
- Globale toggle: **Aanmeldingen open / gesloten** (schrijft naar `AppSettings.registrationOpen`)
- Tabel met alle gebruikers:
  - Profielfoto, naam, e-mail
  - Afkorting
  - Rollen als checkboxes (Docent / TOA / Admin), direct opgeslagen
  - Toegang toggle (Toegestaan / Geblokkeerd)
  - Lid-sinds datum
  - Verwijderknop (met bevestigingsdialog)
  - Bij verwijderen van een gebruiker blijven hun aanvragen bestaan (createdBy wordt null)

---

## 7. Visueel ontwerp

- **Thema:** Donker (dark mode)
- **Stijl:** Tailwind CSS, compact en functioneel
- **Geïnspireerd op:** bestaande TOA-planner screenshot van school

---

## 8. Niet in scope

- E-mailnotificaties
- Mobiele app
- Herhaalpatronen voor aanvragen
- Exportfunctie (bijv. PDF/Excel)
