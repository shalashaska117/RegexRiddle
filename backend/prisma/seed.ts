import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash("demo-password");
  await prisma.user.upsert({
    where: { username: "demo" },
    update: {},
    create: { username: "demo", passwordHash },
  });
  console.log("seeded user demo (password: demo-password)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
