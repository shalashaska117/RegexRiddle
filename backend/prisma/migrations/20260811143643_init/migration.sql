-- CreateEnum
CREATE TYPE "StringKind" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" SERIAL NOT NULL,
    "authorId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "secretRegex" TEXT NOT NULL,
    "examplePositive" TEXT NOT NULL,
    "exampleNegative" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlString" (
    "id" SERIAL NOT NULL,
    "challengeId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "kind" "StringKind" NOT NULL,

    CONSTRAINT "ControlString_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" SERIAL NOT NULL,
    "challengeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "proposedRegex" TEXT NOT NULL,
    "positivesMatched" INTEGER NOT NULL,
    "negativesMatched" INTEGER NOT NULL,
    "solved" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "ControlString_challengeId_value_key" ON "ControlString"("challengeId", "value");

-- CreateIndex
CREATE INDEX "Attempt_challengeId_userId_idx" ON "Attempt"("challengeId", "userId");

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlString" ADD CONSTRAINT "ControlString_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
