-- Rename table OffkaiSeries to Series
ALTER TABLE "OffkaiSeries" RENAME TO "Series";

-- Keep Prisma's default primary key constraint naming convention
ALTER TABLE "Series" RENAME CONSTRAINT "OffkaiSeries_pkey" TO "Series_pkey";
