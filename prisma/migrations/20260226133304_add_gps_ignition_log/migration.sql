-- CreateTable
CREATE TABLE "gps_ignition_logs" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "firstIgnitionAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_ignition_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gps_ignition_logs_deviceId_date_idx" ON "gps_ignition_logs"("deviceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "gps_ignition_logs_deviceId_date_key" ON "gps_ignition_logs"("deviceId", "date");
