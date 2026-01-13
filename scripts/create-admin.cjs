// scripts/create-admin.cjs
const { PrismaClient, UserRole } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "web@italgroup.ba";
  const password = "It@l2026++"; // promijeni poslije logina
  const name = "Mahir";

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      password: hashed,
      role: UserRole.ADMIN,
    },
  });

  console.log("Admin korisnik:", user.email, "lozinka:", password);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });