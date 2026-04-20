-- CreateTable
CREATE TABLE "custom_fields" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "field_type" TEXT NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_fields_workspace_id_entity_type_key_key" ON "custom_fields"("workspace_id", "entity_type", "key");

-- CreateIndex
CREATE INDEX "custom_fields_workspace_id_entity_type_idx" ON "custom_fields"("workspace_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_field_id_entity_id_key" ON "custom_field_values"("field_id", "entity_id");

-- CreateIndex
CREATE INDEX "custom_field_values_workspace_id_entity_id_idx" ON "custom_field_values"("workspace_id", "entity_id");

-- AddForeignKey
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
