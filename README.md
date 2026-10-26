# CVeat administrator permissions update

1. Back up your project.
2. Run the included supabase/migrations/202610260002_admin_permissions.sql in Supabase SQL Editor BEFORE installing the code. Audit Logs setup must already be complete.
3. Exactly one current admin: automatically becomes owner. Multiple admins: replace `owner_id uuid := null;` in the setup block with `owner_id uuid := 'YOUR-ADMIN-USER-UUID'::uuid;`. Copy your UUID from Users. Then run the entire script.
4. Copy the included app/, lib/, supabase/ files into matching project folders. These are complete files; preserve all other files.
5. Open /admin/permissions as the owner. Existing admins retain section/article access. Only the owner can edit grants; owners cannot be edited here. New admins have no implicit section grants.
6. Verify a restricted admin is denied access and see the saved permission change in Audit Logs.

Server-enforced capabilities: Overview, Users, Revenue, AI Economics, Audit Logs, article viewing/creation/editing/deletion/publication; owner-only management. Permission saves and audit records commit atomically. Version checking rejects stale saves. Navigation follows grants. Light/dark styles included.

The APIs fail closed if permission tables cannot be read. Complete SQL setup before deployment. Customer features and MFA flow are preserved.

Validation: staged TypeScript; targeted lint; mocked authorization, assignment and route-coverage tests; local PostgreSQL-engine tests for bootstrap, owner/self protection, unauthorized RPC denial, stale versions, migration replay, atomic audit rollback and append-only logs. Live Supabase setup has NOT been applied. A production build has not been run for this staged package.
