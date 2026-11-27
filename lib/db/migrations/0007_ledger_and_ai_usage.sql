CREATE TABLE IF NOT EXISTS "AiCall" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"model" text NOT NULL,
	"inputTokens" integer,
	"outputTokens" integer,
	"imageCount" integer,
	"costMicros" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "AiSettings" (
	"id" integer PRIMARY KEY NOT NULL,
	"monthlyLimit" integer,
	"monthlyBudgetMicros" bigint
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "LedgerEntry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"kind" varchar NOT NULL,
	"amountMinor" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"description" text NOT NULL,
	"date" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "containsLedgerData" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_call_created" ON "AiCall" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_owner_date" ON "LedgerEntry" USING btree ("userId","date");