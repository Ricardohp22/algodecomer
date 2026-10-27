CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"before_json" jsonb,
	"after_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_action_present" CHECK (char_length(btrim("audit_logs"."action")) > 0)
);
--> statement-breakpoint
CREATE TABLE "branch_amenities" (
	"branch_id" uuid NOT NULL,
	"amenity_code" text NOT NULL,
	CONSTRAINT "branch_amenities_code_check" CHECK ("branch_amenities"."amenity_code" IN ('parking', 'restroom', 'music', 'wifi'))
);
--> statement-breakpoint
CREATE TABLE "branch_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"opens_at" time NOT NULL,
	"closes_at" time NOT NULL,
	"service_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_hours_weekday_check" CHECK ("branch_hours"."weekday" BETWEEN 1 AND 7),
	CONSTRAINT "branch_hours_nonzero" CHECK ("branch_hours"."opens_at" <> "branch_hours"."closes_at")
);
--> statement-breakpoint
CREATE TABLE "branch_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_members_role_owner" CHECK ("branch_members"."role" = 'owner')
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"business_type" text NOT NULL,
	"phone" text NOT NULL,
	"whatsapp" text,
	"address_private" text NOT NULL,
	"address_public" text,
	"expose_public_address" boolean DEFAULT false NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"approval_status" text DEFAULT 'draft' NOT NULL,
	"publication_status" text DEFAULT 'unpublished' NOT NULL,
	"moderation_status" text DEFAULT 'clear' NOT NULL,
	"accepting_orders" text DEFAULT 'inquiries_only' NOT NULL,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_name_present" CHECK (char_length(btrim("branches"."name")) > 0),
	CONSTRAINT "branches_type_check" CHECK ("branches"."business_type" IN ('restaurante', 'fonda', 'puesto', 'cocina_en_casa', 'reposteria', 'solo_pedidos')),
	CONSTRAINT "branches_phone_e164" CHECK ("branches"."phone" ~ '^\+[1-9][0-9]{7,14}$'),
	CONSTRAINT "branches_whatsapp_e164" CHECK ("branches"."whatsapp" IS NULL OR "branches"."whatsapp" ~ '^\+[1-9][0-9]{7,14}$'),
	CONSTRAINT "branches_latitude_range" CHECK ("branches"."latitude" BETWEEN -90 AND 90),
	CONSTRAINT "branches_longitude_range" CHECK ("branches"."longitude" BETWEEN -180 AND 180),
	CONSTRAINT "branches_approval_check" CHECK ("branches"."approval_status" IN ('draft', 'pending_review', 'approved', 'rejected')),
	CONSTRAINT "branches_publication_check" CHECK ("branches"."publication_status" IN ('unpublished', 'published')),
	CONSTRAINT "branches_moderation_check" CHECK ("branches"."moderation_status" IN ('clear', 'suspended')),
	CONSTRAINT "branches_accepting_orders_check" CHECK ("branches"."accepting_orders" IN ('accepting', 'busy', 'inquiries_only', 'closed')),
	CONSTRAINT "branches_public_address_consistency" CHECK (("branches"."expose_public_address" = false AND "branches"."address_public" IS NULL) OR ("branches"."expose_public_address" = true AND "branches"."address_public" IS NOT NULL)),
	CONSTRAINT "branches_published_requires_approval" CHECK ("branches"."publication_status" = 'unpublished' OR "branches"."approval_status" = 'approved')
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"legal_display_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_name_present" CHECK (char_length(btrim("businesses"."legal_display_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "coverage_waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_type" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"zone_id" uuid,
	"consent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coverage_waitlist_contact_check" CHECK ("coverage_waitlist"."contact_type" IN ('business', 'customer')),
	CONSTRAINT "coverage_waitlist_email_normalized" CHECK ("coverage_waitlist"."email" = lower("coverage_waitlist"."email")),
	CONSTRAINT "coverage_waitlist_latitude_range" CHECK ("coverage_waitlist"."latitude" BETWEEN -90 AND 90),
	CONSTRAINT "coverage_waitlist_longitude_range" CHECK ("coverage_waitlist"."longitude" BETWEEN -180 AND 180),
	CONSTRAINT "coverage_waitlist_phone_e164" CHECK ("coverage_waitlist"."phone" IS NULL OR "coverage_waitlist"."phone" ~ '^\+[1-9][0-9]{7,14}$')
);
--> statement-breakpoint
CREATE TABLE "coverage_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"geom" geometry(MultiPolygon,4326) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coverage_zones_status_check" CHECK ("coverage_zones"."status" IN ('planned', 'waitlist', 'pilot', 'active', 'suspended')),
	CONSTRAINT "coverage_zones_name_present" CHECK (char_length(btrim("coverage_zones"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "delivery_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"radius_m" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_areas_radius_positive" CHECK ("delivery_areas"."radius_m" > 0)
);
--> statement-breakpoint
CREATE TABLE "delivery_settings" (
	"branch_id" uuid PRIMARY KEY NOT NULL,
	"delivery_enabled" boolean DEFAULT false NOT NULL,
	"pickup_enabled" boolean DEFAULT false NOT NULL,
	"dine_in_enabled" boolean DEFAULT false NOT NULL,
	"fixed_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"min_order" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_settings_fee_nonnegative" CHECK ("delivery_settings"."fixed_fee" >= 0),
	CONSTRAINT "delivery_settings_min_order_nonnegative" CHECK ("delivery_settings"."min_order" IS NULL OR "delivery_settings"."min_order" >= 0),
	CONSTRAINT "delivery_settings_has_channel" CHECK ("delivery_settings"."delivery_enabled" OR "delivery_settings"."pickup_enabled" OR "delivery_settings"."dine_in_enabled")
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_branch_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"scan_status" text DEFAULT 'not_scanned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_kind_check" CHECK ("media_assets"."kind" IN ('photo', 'visual_menu')),
	CONSTRAINT "media_assets_bytes_positive" CHECK ("media_assets"."bytes" > 0),
	CONSTRAINT "media_assets_scan_check" CHECK ("media_assets"."scan_status" IN ('not_scanned', 'clean', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "modifier_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"min_select" integer DEFAULT 0 NOT NULL,
	"max_select" integer NOT NULL,
	"selection_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modifier_groups_name_present" CHECK (char_length(btrim("modifier_groups"."name")) > 0),
	CONSTRAINT "modifier_groups_min_nonnegative" CHECK ("modifier_groups"."min_select" >= 0),
	CONSTRAINT "modifier_groups_max_gte_min" CHECK ("modifier_groups"."max_select" >= "modifier_groups"."min_select"),
	CONSTRAINT "modifier_groups_selection_check" CHECK ("modifier_groups"."selection_type" IN ('single', 'multiple')),
	CONSTRAINT "modifier_groups_single_max" CHECK ("modifier_groups"."selection_type" <> 'single' OR "modifier_groups"."max_select" = 1)
);
--> statement-breakpoint
CREATE TABLE "modifier_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_delta" numeric(12, 2) DEFAULT '0' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"max_quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modifier_options_name_present" CHECK (char_length(btrim("modifier_options"."name")) > 0),
	CONSTRAINT "modifier_options_delta_nonnegative" CHECK ("modifier_options"."price_delta" >= 0),
	CONSTRAINT "modifier_options_quantity_positive" CHECK ("modifier_options"."max_quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "plan_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"feature_code" text NOT NULL,
	"limit_value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_entitlements_limit_nonnegative" CHECK ("plan_entitlements"."limit_value" >= 0),
	CONSTRAINT "plan_entitlements_feature_present" CHECK (char_length(btrim("plan_entitlements"."feature_code")) > 0)
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"price_monthly" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_code_check" CHECK ("plans"."code" IN ('BASIC', 'PRO')),
	CONSTRAINT "plans_currency_mxn" CHECK ("plans"."currency" = 'MXN'),
	CONSTRAINT "plans_price_nonnegative" CHECK ("plans"."price_monthly" >= 0),
	CONSTRAINT "plans_name_present" CHECK (char_length(btrim("plans"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_name_present" CHECK (char_length(btrim("product_categories"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_modifier_groups" (
	"product_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_delta" numeric(12, 2) DEFAULT '0' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_name_present" CHECK (char_length(btrim("product_variants"."name")) > 0),
	CONSTRAINT "product_variants_delta_nonnegative" CHECK ("product_variants"."price_delta" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"base_price" numeric(12, 2) NOT NULL,
	"availability_status" text DEFAULT 'available' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"search_text" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_name_present" CHECK (char_length(btrim("products"."name")) > 0),
	CONSTRAINT "products_price_nonnegative" CHECK ("products"."base_price" >= 0),
	CONSTRAINT "products_availability_check" CHECK ("products"."availability_status" IN ('available', 'sold_out', 'scheduled', 'on_request'))
);
--> statement-breakpoint
CREATE TABLE "visual_menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"page_count" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visual_menus_page_count_positive" CHECK ("visual_menus"."page_count" IS NULL OR "visual_menus"."page_count" > 0)
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_amenities" ADD CONSTRAINT "branch_amenities_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_hours" ADD CONSTRAINT "branch_hours_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_members" ADD CONSTRAINT "branch_members_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_members" ADD CONSTRAINT "branch_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coverage_waitlist" ADD CONSTRAINT "coverage_waitlist_zone_id_coverage_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."coverage_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_areas" ADD CONSTRAINT "delivery_areas_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_settings" ADD CONSTRAINT "delivery_settings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_branch_id_branches_id_fk" FOREIGN KEY ("owner_branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_group_id_modifier_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_entitlements" ADD CONSTRAINT "plan_entitlements_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_group_id_modifier_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_menus" ADD CONSTRAINT "visual_menus_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_menus" ADD CONSTRAINT "visual_menus_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_amenities_pair_unique" ON "branch_amenities" USING btree ("branch_id","amenity_code");--> statement-breakpoint
CREATE INDEX "branch_hours_branch_id_idx" ON "branch_hours" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_members_pair_unique" ON "branch_members" USING btree ("branch_id","user_id");--> statement-breakpoint
CREATE INDEX "branches_business_id_idx" ON "branches" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "branches_plan_id_idx" ON "branches" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "branches_publication_idx" ON "branches" USING btree ("approval_status","publication_status");--> statement-breakpoint
CREATE INDEX "businesses_owner_user_id_idx" ON "businesses" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "coverage_waitlist_email_idx" ON "coverage_waitlist" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "coverage_zones_name_unique" ON "coverage_zones" USING btree ("name");--> statement-breakpoint
CREATE INDEX "delivery_areas_branch_id_idx" ON "delivery_areas" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_object_key_unique" ON "media_assets" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "media_assets_branch_kind_idx" ON "media_assets" USING btree ("owner_branch_id","kind");--> statement-breakpoint
CREATE INDEX "modifier_groups_branch_id_idx" ON "modifier_groups" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "modifier_options_group_id_idx" ON "modifier_options" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_entitlements_feature_unique" ON "plan_entitlements" USING btree ("plan_id","feature_code");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_code_unique" ON "plans" USING btree ("code");--> statement-breakpoint
CREATE INDEX "product_categories_branch_id_idx" ON "product_categories" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_media_asset_unique" ON "product_media" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "product_media_product_id_idx" ON "product_media" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_modifier_groups_pair_unique" ON "product_modifier_groups" USING btree ("product_id","group_id");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_branch_id_idx" ON "products" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "visual_menus_asset_unique" ON "visual_menus" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "visual_menus_branch_id_idx" ON "visual_menus" USING btree ("branch_id");
--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "location" geography(Point,4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography) STORED;
--> statement-breakpoint
ALTER TABLE "coverage_waitlist" ADD COLUMN "location" geography(Point,4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography) STORED;
--> statement-breakpoint
CREATE INDEX "branches_location_gix" ON "branches" USING gist ("location");
--> statement-breakpoint
CREATE INDEX "coverage_zones_geom_gix" ON "coverage_zones" USING gist ("geom");
--> statement-breakpoint
CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER plan_entitlements_set_updated_at BEFORE UPDATE ON plan_entitlements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER businesses_set_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER branches_set_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER branch_hours_set_updated_at BEFORE UPDATE ON branch_hours FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER coverage_zones_set_updated_at BEFORE UPDATE ON coverage_zones FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER delivery_settings_set_updated_at BEFORE UPDATE ON delivery_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER product_categories_set_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER product_variants_set_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER modifier_groups_set_updated_at BEFORE UPDATE ON modifier_groups FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER modifier_options_set_updated_at BEFORE UPDATE ON modifier_options FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER media_assets_set_updated_at BEFORE UPDATE ON media_assets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER visual_menus_set_updated_at BEFORE UPDATE ON visual_menus FOR EACH ROW EXECUTE FUNCTION set_updated_at();