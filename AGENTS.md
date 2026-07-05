# InternNext Pro Codex Instructions

## Project

InternNext Pro is a Vite, React, and Supabase internship platform. Frontend
code lives in `frontend/`; database and Edge Function code lives in
`backend/supabase/`.

## Commands

- Install: `cd frontend && npm install`
- Development: `cd frontend && npm run dev`
- Unit tests: `cd frontend && npm run test -- --run`
- Browser tests: `cd frontend && npm run test:e2e`
- Backend helper tests: `cd backend && npm test`
- Production build: `cd frontend && npm run build`

## Environment Rules

- Never display or commit `.env` values.
- Only refer to environment variable names.
- Never place a Supabase service-role key in frontend code.
- Frontend Supabase access must use the publishable key.
- Never disable Row Level Security.

## Code Rules

- Understand existing architecture before changing it.
- Keep changes focused and preserve role separation.
- Reuse `frontend/src/lib/supabase.js` and existing API modules.
- Do not introduce mock data into production flows.
- Handle loading, empty, success, and error states.
- Use existing React Hook Form and Zod patterns.

## Database Rules

- Keep migrations in `backend/supabase/migrations/`.
- Apply migrations in filename order.
- Include appropriate RLS policies with database changes.
- Never delete production tables or data.
- Check existing queries before using table or column names.

## Git Rules

- Work on one feature at a time.
- Run tests and a production build before release.
- Never commit environment files or generated output.
- Do not commit automatically unless explicitly requested.
