// scripts/create-users.cjs
const { PrismaClient, UserRole } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      email: "ridvan@italgroup.ba",
      name: "Ridvan",
      password: "Comm123!",
      role: UserRole.COMMERCIAL,
    },
    {
      email: "Lamija@italgroup.ba",
      name: "Lamija",
      password: "Comm123!",
      role: UserRole.COMMERCIAL,
    },
  ];

  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        password: hashed,
        role: u.role,
      },
    });
    console.log(
      `Korisnik: ${user.email}  |  uloga: ${user.role}  |  lozinka: ${u.password}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });