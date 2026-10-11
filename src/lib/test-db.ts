import "dotenv/config";
import prisma from "./prisma";

async function main() {
  await prisma.$connect();
  console.log("PostgreSQL database connected successfully!");

  const resources = await prisma.resource.findMany();
  console.log("Resources:", resources);
}

main()
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });