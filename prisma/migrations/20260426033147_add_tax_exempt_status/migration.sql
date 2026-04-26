-- CreateTable
CREATE TABLE "tax_exempt_statuses" (
    "id" SERIAL NOT NULL,
    "tax_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "exempt" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_exempt_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_exempt_statuses_tax_id_key" ON "tax_exempt_statuses"("tax_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_exempt_statuses_user_id_year_key" ON "tax_exempt_statuses"("user_id", "year");

-- AddForeignKey
ALTER TABLE "tax_exempt_statuses" ADD CONSTRAINT "tax_exempt_statuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
