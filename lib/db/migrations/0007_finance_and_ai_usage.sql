CREATE TABLE IF NOT EXISTS "AIUsage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"model" varchar(64) NOT NULL,
	"inputTokens" integer NOT NULL,
	"outputTokens" integer NOT NULL,
	"costUsd" numeric(12, 6) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FinanceTransaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"kind" varchar NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(64) NOT NULL,
	"occurredAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserAISettings" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"monthlyLimitUsd" numeric(10, 2) DEFAULT '10.00' NOT NULL,
	"adminLimitUsd" numeric(10, 2),
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserAISettings" ADD CONSTRAINT "UserAISettings_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "AIUsage_userId_createdAt_idx" ON "AIUsage" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "AIUsage_model_createdAt_idx" ON "AIUsage" USING btree ("model","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "FinanceTransaction_userId_occurredAt_idx" ON "FinanceTransaction" USING btree ("userId","occurredAt");--> statement-breakpoint
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_kind_check" CHECK ("kind" IN ('income', 'expense'));--> statement-breakpoint
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_amount_check" CHECK ("amount" > 0);--> statement-breakpoint
ALTER TABLE "UserAISettings" ADD CONSTRAINT "UserAISettings_monthlyLimitUsd_check" CHECK ("monthlyLimitUsd" >= 0);--> statement-breakpoint
ALTER TABLE "UserAISettings" ADD CONSTRAINT "UserAISettings_adminLimitUsd_check" CHECK ("adminLimitUsd" IS NULL OR "adminLimitUsd" >= 0);--> statement-breakpoint
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_kind_check" CHECK ("kind" IN ('income', 'expense'));--> statement-breakpoint
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_amount_check" CHECK ("amount" > 0);--> statement-breakpoint
ALTER TABLE "UserAISettings" ADD CONSTRAINT "UserAISettings_monthlyLimitUsd_check" CHECK ("monthlyLimitUsd" >= 0);--> statement-breakpoint
ALTER TABLE "UserAISettings" ADD CONSTRAINT "UserAISettings_adminLimitUsd_check" CHECK ("adminLimitUsd" IS NULL OR "adminLimitUsd" >= 0);