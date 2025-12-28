-- CreateTable
CREATE TABLE "MercadoLibreAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MercadoLibreAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MercadoLibreAccount_userId_mlUserId_key" ON "MercadoLibreAccount"("userId", "mlUserId");

-- AddForeignKey
ALTER TABLE "MercadoLibreAccount" ADD CONSTRAINT "MercadoLibreAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
