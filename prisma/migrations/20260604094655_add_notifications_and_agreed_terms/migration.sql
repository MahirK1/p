-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "agreedTerms" TEXT,
ADD COLUMN     "agreedTermsUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "agreedTermsUpdatedById" TEXT;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_agreedTermsUpdatedById_fkey" FOREIGN KEY ("agreedTermsUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
