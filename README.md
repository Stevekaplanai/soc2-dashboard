# 💥 SOC2 Dashboard — The Vanta Killer

> Open-source SOC2 compliance dashboard. Evidence upload, AI-powered control mapping, human review gate, full audit log. The $100K/yr Vanta alternative — for free.

**Live demo:** The homepage shows your live compliance numbers pulled from your Supabase database.

## What this is

SOC2 compliance is 3 tables in a trench coat:

1. **controls** — Seeded SOC2 Trust Services Criteria (71 controls across 5 categories)
2. **evidence** — Files uploaded as proof, linked to controls, with AI proposals and human review
3. **control_status** — A Postgres VIEW that computes which controls are passing/in-review/not-started

The workflow:
1. Upload evidence (PDF, screenshot, doc) against a control
2. Claude reads the file and proposes which controls it satisfies (with confidence levels)
3. An admin reviews the AI proposal, views the file, and clicks Accept or Reject
4. The control turns green on the dashboard
5. Every action is logged in the audit trail

**The human review gate is non-negotiable.** AI proposes, a human confirms. Always. No auto-approval at any confidence level. This is what makes your SOC2 audit defensible.

## Tech Stack

- **Next.js 16** with React 19 (App Router)
- **Supabase** (auth, database, storage)
- **Tailwind CSS v4** + custom shadcn-style UI components
- **Claude API** for AI evidence analysis
- **TypeScript** throughout
- Deploy on **Vercel**

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/Stevekaplanai/soc2-dashboard.git
cd soc2-dashboard
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project (free tier is fine)
2. Go to **SQL Editor**
3. Paste the migration file from `/supabase/migrations/0001_soc2_dashboard.sql` — run it
4. Paste the seed file from `/supabase/seed.sql` — run it (loads 71 SOC2 controls)
5. The migration creates the private `evidence-files` bucket and its upload rules
6. Copy your **Project URL** and **anon key** from Settings > API

### 3. Configure environment

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Create your admin user

1. Go to `/auth/signup` and create an account
2. In Supabase SQL editor, run:

```sql
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'steve@stevekaplan.ai';
```

3. Log out and log back in — you now have access to `/dashboard/review`

## Deploy to Vercel

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com), click "Add New Project", import the repo
3. Set these environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
4. Click Deploy (~90 seconds)

## Project Structure

```
soc2-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing page (live compliance numbers)
│   │   ├── globals.css             # Tailwind + theme
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Controls dashboard (grouped by category)
│   │   │   └── review/page.tsx     # Admin review queue
│   │   ├── auth/
│   │   │   ├── login/page.tsx      # Supabase auth login
│   │   │   ├── signup/page.tsx     # Supabase auth signup
│   │   │   └── signout/route.ts    # Sign out route handler
│   │   └── api/
│   │       └── signed-url/route.ts # Generate signed URLs for evidence files
│   ├── components/
│   │   ├── ui/                     # Badge, Button, Card, Sheet components
│   │   ├── dashboard-client.tsx   # Dashboard with collapsible categories + upload sheet
│   │   ├── upload-evidence.tsx     # Evidence upload form
│   │   └── review-queue-client.tsx# Admin review queue with Accept/Reject/Ask
│   ├── lib/
│   │   ├── supabase/               # Client, server, admin Supabase clients
│   │   ├── actions.ts              # Server actions (upload, review)
│   │   ├── claude.ts               # Claude AI evidence analysis
│   │   ├── types.ts                # TypeScript types
│   │   └── utils.ts                # cn() helper
│   └── proxy.ts                   # Session refresh + dashboard access gate
├── supabase/
│   ├── migrations/
│   │   └── 0001_soc2_dashboard.sql # Tables, view, RLS, storage bucket
│   └── seed.sql                    # 71 SOC2 Trust Services Criteria controls
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

## Database Schema

### `controls`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Auto-generated |
| code | TEXT UNIQUE | e.g. "CC6.1" |
| title | TEXT | e.g. "Logical Access Controls" |
| category | TEXT | CC, A, PI, C, P |
| description | TEXT | What the control requires |
| status | TEXT | not_started / in_review / passing (computed) |

### `evidence`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Auto-generated |
| control_id | UUID FK | → controls |
| file_url | TEXT | Supabase Storage path |
| file_name | TEXT | Original filename |
| uploaded_by | UUID FK | → auth.users |
| uploaded_at | TIMESTAMPTZ | When uploaded |
| ai_proposed_controls | JSONB | Claude's analysis result |
| ai_confidence | TEXT | high / medium / low |
| review_status | TEXT | pending / accepted / rejected |
| reviewed_by | UUID FK | → auth.users (admin) |
| reviewed_at | TIMESTAMPTZ | When reviewed |
| notes | TEXT | Reviewer notes |

**Check constraint:** `review_status = 'accepted'` requires both `reviewed_by` and `reviewed_at`. The database enforces the human review gate even if application code misbehaves.

### `control_status` (VIEW)
Computed view — not a table. Returns `control_id, code, title, category, status, evidence_count, last_evidence_at`. The dashboard reads this view. Always current.

### `audit_log`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Auto-generated |
| action | TEXT | uploaded / accepted / rejected / requested_more_info |
| evidence_id | UUID FK | → evidence |
| control_id | UUID FK | → controls |
| performed_by | UUID FK | → auth.users |
| performed_at | TIMESTAMPTZ | When action occurred |
| note | TEXT | Optional note |

## RLS Policies

- **controls**: Readable by any authenticated user; not user-editable
- **control_status** (view): Readable by authenticated users and obeys the underlying RLS rules
- **evidence**: Users see only their own uploads; admins see all; review changes go through the admin-only database function
- **audit_log**: Readable by admins and written by trusted server/review paths only
- **Storage (evidence-files)**: Users upload to their own folder; admins see all

## The AI Feature (Lesson 5)

When evidence is uploaded, Claude analyzes it:
1. File uploaded to Supabase Storage (private bucket, signed URLs)
2. Server action generates a short-lived signed URL
3. Claude receives the file + the full SOC2 controls list as context
4. Returns JSON: `[{control_code, control_title, confidence, reasoning}]`
5. Results stored in `evidence.ai_proposed_controls` and `evidence.ai_confidence`
6. Admin sees the proposal in the review queue with color-coded confidence

The app uses `claude-sonnet-4-6`. DOCX files are converted to text with Mammoth before analysis; PDF and image files are sent as native document/image inputs.

**Supported file types:** PDF (native), PNG/JPG (native), DOCX (text extraction)

## The Gotcha (Lesson 6): Never Let AI Auto-Approve

The AI analysis function **only** writes to `ai_proposed_controls` and `ai_confidence`. It never touches `review_status`. The `review_status` column only moves via explicit admin Accept/Reject actions. There's a database check constraint enforcing this.

Claude proposes. A human confirms. Always.

## Cost

- **Vercel hobby tier:** $0/month
- **Supabase free tier:** $0/month
- **Claude API:** ~$0.01-0.03 per evidence analysis (cents)
- **Total:** ~$0/month for a full SOC2 compliance tool

Vanta charges $100K/year for the same workflow. You own this one.

## License

MIT — do whatever you want with it.

## Built as part of The Vibe Stack

→ [skool.com/thevibestack](https://skool.com/thevibestack)
