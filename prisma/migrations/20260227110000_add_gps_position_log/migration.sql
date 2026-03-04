-- CreateTable
CREATE TABLE "gps_position_logs" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "commercialId" TEXT,
    "date" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "ignitionState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_position_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gps_position_logs_deviceId_date_idx" ON "gps_position_logs"("deviceId", "date");

-- CreateIndex
CREATE INDEX "gps_position_logs_commercialId_date_idx" ON "gps_position_logs"("commercialId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "gps_position_logs_deviceId_capturedAt_key" ON "gps_position_logs"("deviceId", "capturedAt");
