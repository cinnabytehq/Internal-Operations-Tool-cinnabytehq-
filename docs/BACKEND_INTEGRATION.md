# Backend integration guide

How CinnabyteHQ's backend is put together, how to extend it, and where **Supabase Auth** and **Row Level Security** plug in next.

Search the code for the connection points:

```bash
grep -rn "TODO(auth)" src    # session, acting user, permission checks
grep -rn "TODO(api)"  src    # features that still live in the browser (notification read state)
```

---

## 1. Request flow

```
UI ──► Astro ──► REST API ──► service layer ──► Supabase ──► PostgreSQL
```

| Step | Where | Responsibility |
| --- | --- | --- |
| UI | `src/pages/*.astro`, `src/components/**`, `src/scripts/*` | Render and interact. Get data **only** through the API client. |
| API client | `src/lib/api/client.ts` (`browser.ts`, `server.ts`) | Typed `fetch` wrappers such as `getRequests()` → `GET /api/requests`. Throws `ApiError(status, message, code, fields)`. |
| Middleware | `src/middleware.ts` | Time zone, the acting user (development only), and the `/setup` fallback. |
| REST API | `src/pages/api/**` | Parse and validate (`src/lib/validation.ts`), call one service, return `{ data }` or `{ error }` (`src/lib/http.ts`). |
| Services | `src/services/*` | Queries, workflow rules, approval routing, permission checks and activity logging. Map database errors to safe messages (`errors.ts`). |
| Supabase client | `src/lib/supabase.ts` | Server-only singleton using the service-role key, built from `astro:env/server`. |
| Database | `supabase/migrations/*.sql` | Schema, constraints, indexes, triggers, RLS. |

Rules the code follows:

- **The UI never imports `@/services` or `@/lib/supabase`.** Server-rendered pages use `serverApi(Astro)`, which calls the same HTTP endpoints as the browser and forwards cookies.
- **Services never trust the caller for identity.** The acting user comes from `context.locals.user` (set by the middleware) through `requireUser(context)`, never from the request body.
- **The browser never sees database errors.** Unknown errors are logged with `console.error('[db] …')` and returned as `INTERNAL`, with a "We couldn't …" message.

## 2. Adding an endpoint

1. **Schema:** add a Zod schema to `src/lib/validation.ts`. Use `z.strictObject` so unknown fields are rejected.
2. **Service:** add a function to `src/services/<entity>.ts`. It should:
   - query through `db()`
   - pass results through `unwrap(result, 'do the thing')`
   - throw `ServiceError` or `notFound()` for expected failures
   - call `logActivity()` for anything a person would want in the history
3. **Route:** add a file under `src/pages/api/`:

   ```ts
   export const POST = handle(async (context) => {
     const input = await readBody(context.request, mySchema);
     return created(await myService(input, requireUser(context)));
   });
   ```
4. **Client:** add a method to `createApiClient()` in `src/lib/api/client.ts`.
5. **Docs:** add the endpoint to `docs/API.md`.

## 3. Schema changes

Add a new numbered file, such as `supabase/migrations/002_add_attachments.sql`, instead of editing `001`. Update `src/types/index.ts` to match, because types are `snake_case` and mirror the columns one to one. Then update `supabase/seed.sql` if the demo data should use the change.

Generated types (`supabase gen types typescript --project-id …`) would make query results type-safe. They aren't used yet, so embedded selects are cast to the hand-written types in `src/types`.

## 4. Consistency without transactions

`supabase-js` talks to PostgREST, which runs each call in its own transaction. Multi-step writes are ordered so that a failure part-way leaves valid data:

| Operation | Steps | Safeguard |
| --- | --- | --- |
| Decide approval | Update the approval (`where status = 'pending'`), update the request, log activity | The conditional update makes a double decision return `409` instead of overwriting |
| Move a request to review | Update the request, create an approval, log activity | A partial unique index allows one pending approval per request |
| Comment | Touch the request's `updated_at`, then log a `commented` event | The log is `required`, so a failure surfaces as an error |

Other activity logging is best effort: a failed log is recorded on the server and doesn't fail the change the user made. To make any of these atomic, move them into a Postgres function and call it with `db().rpc('decide_approval', {...})`.

<a id="authentication"></a>
## 5. Authentication (next phase)

### Today: development user

`getDevUser()` in `src/services/profiles.ts` loads the profile whose email is `DEV_USER_EMAIL`, and caches it for 30 seconds. The middleware puts it on `locals.user`, and every API call acts as that person. This is marked **DEVELOPMENT ONLY** in the code, the UI (the DEV badge and the user-menu notice), `.env.example` and the README. It isn't authentication.

### Steps to add Supabase Auth

1. **Install** `@supabase/ssr`.
2. **Link profiles to auth users.** Add a migration:

   ```sql
   alter table public.profiles
     add constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade;

   create function public.handle_new_user() returns trigger
   language plpgsql security definer set search_path = '' as $$
   begin
     insert into public.profiles (id, email, full_name)
     values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
     return new;
   end $$;

   create trigger on_auth_user_created
     after insert on auth.users for each row execute function public.handle_new_user();
   ```

   The seed would then create `auth.users` rows first, or you could sign up the demo people.
3. **Middleware** (`src/middleware.ts`): build a server client from the request cookies, read the user and load their profile:

   ```ts
   const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
     cookies: {
       getAll: () => parseCookieHeader(context.request.headers.get('cookie') ?? ''),
       setAll: (list) => list.forEach(({ name, value, options }) => context.cookies.set(name, value, options)),
     },
   });
   const { data } = await supabase.auth.getUser();
   context.locals.user = data.user ? await getProfile(data.user.id) : null;
   ```

   Redirect page requests without a user to `/login`. API routes already answer through `requireUser()`, which should return `401 UNAUTHORIZED` once auth exists (the status code is already mapped in `src/lib/http.ts`).
4. **Pages:** add `src/pages/login.astro`, built on `BaseLayout`, and enable **Sign out** in `UserMenu.astro`.
5. **Remove** `getDevUser()`, `DEV_USER_EMAIL`, the DEV badge and the user-menu notice.
6. **Cookies already flow.** `serverApi(Astro)` forwards the `cookie` header, so API routes called from server-rendered pages see the same session as the browser.

### Row Level Security

RLS is already **enabled with no policies** on every table, which is why the anon key can't read anything today. Once users sign in you can either:

- **keep the service-role client** for server logic and rely on the service-layer checks (simplest), or
- **run queries as the user** (a per-request client built with the anon key and the user's JWT) and add policies, so the database enforces access even if a check is missed.

Policy sketches for the second option:

```sql
-- Everyone signed in can read the workspace.
create policy "read requests" on public.requests for select to authenticated using (true);

-- Requesters create their own requests.
create policy "create own requests" on public.requests for insert to authenticated
  with check (requester_id = (select auth.uid()));

-- Requester, assignee or an admin/manager can update.
create policy "update requests" on public.requests for update to authenticated
  using (
    (select auth.uid()) in (requester_id, assignee_id)
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'manager'))
  );

-- Only the approver (or an admin) decides an approval.
create policy "decide approvals" on public.approvals for update to authenticated
  using (
    approver_id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

-- Activity is written by the server only: no insert policy for users.
create policy "read activity" on public.activity_logs for select to authenticated using (true);
```

The service layer's checks, marked `TODO(auth)` (approver or admin, requester or admin, owner or admin, self or admin), are the same rules. Keep both: the service returns friendly `403` messages, and RLS acts as the backstop.

## 6. Deployment notes

- CinnabyteHQ runs as a Node server (`npm run build && npm start`) on any host that can run Node 22: Render, Railway, Fly.io or a VPS.
- Set the environment variables in the host's settings. They're read at runtime, so the same build works in staging and production.
- If the host puts a proxy in front that changes the `Host` header, set `INTERNAL_API_URL` (for example `http://127.0.0.1:$PORT`) so server-rendered pages call the API directly.
- **Don't deploy publicly until authentication exists.** With the development user, anyone who can reach the server acts as an admin.
