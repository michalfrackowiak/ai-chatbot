CREATE TABLE ledger (
 id uuid primary key default gen_random_uuid(), owner uuid not null constraint "ledger_owner_User_id_fk" references "User"(id),
 kind text not null check(kind in ('income','expense')), description text not null,
 cents bigint not null check(cents>0), booked date not null, sample text, unique(owner,sample)
);
--> statement-breakpoint
CREATE TABLE ai_policy (id integer primary key, daily_limit integer check(daily_limit>=0));
--> statement-breakpoint
INSERT INTO ai_policy VALUES (1,NULL);
--> statement-breakpoint
CREATE TABLE ai_call (id uuid primary key default gen_random_uuid(), started timestamptz not null default now(), model text not null, input integer, output integer, usd numeric);
--> statement-breakpoint
CREATE INDEX ai_call_started ON ai_call(started);
