CREATE TABLE IF NOT EXISTS "AiUsage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"chatId" uuid,
	"model" varchar(64) NOT NULL,
	"promptTokens" integer DEFAULT 0 NOT NULL,
	"completionTokens" integer DEFAULT 0 NOT NULL,
	"costMicros" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "AppSetting" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"type" varchar NOT NULL,
	"amount" integer NOT NULL,
	"category" varchar(64) NOT NULL,
	"description" text NOT NULL,
	"occurredAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"source" varchar DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UsageLimit" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"maxMessagesPerDay" integer,
	"maxMonthlySpendMicros" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UsageLimit" ADD CONSTRAINT "UsageLimit_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "AiUsage_userId_createdAt_idx" ON "AiUsage" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Transaction_userId_occurredAt_idx" ON "Transaction" USING btree ("userId","occurredAt");