-- CreateTable
CREATE TABLE "LogoutEvent" (
    "id" TEXT NOT NULL,
    "wayoUserId" TEXT NOT NULL,
    "authServerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogoutEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogoutEvent_wayoUserId_idx" ON "LogoutEvent"("wayoUserId");

-- CreateIndex
CREATE INDEX "LogoutEvent_createdAt_idx" ON "LogoutEvent"("createdAt");
