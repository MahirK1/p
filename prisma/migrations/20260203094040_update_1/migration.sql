-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DIRECTOR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canAccessDoctorVisits" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "doctor_visits" (
    "id" TEXT NOT NULL,
    "commercialId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "contactNumber" TEXT,
    "email" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_visits_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "doctor_visits" ADD CONSTRAINT "doctor_visits_commercialId_fkey" FOREIGN KEY ("commercialId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
