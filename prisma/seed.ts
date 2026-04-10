import "dotenv/config";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs"; // npm install bcryptjs && npm install -D @types/bcryptjs
import { faker } from "@faker-js/faker"; // npm install -D @faker-js/faker

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const customerPassword = await bcrypt.hash("customer123", 10);

  // 1. Create/Update Admin User
  console.log("Seeding Admin...");
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Super Admin",
      password: adminPassword,
      role: "ADMIN",
      isActive: true,
      storeName: "MTS Global Store",
      isVerified: true,
      phone: faker.phone.number(),
      city: "Sydney",
      country: "Australia",
    },
  });

  // 2. Create Multiple Mock Customers
  console.log("Seeding Customers...");
  const customerCount = 5;
  for (let i = 0; i < customerCount; i++) {
    const email = faker.internet.email().toLowerCase();
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: faker.person.fullName(),
        password: customerPassword,
        role: "CUSTOMER",
        avatar: faker.image.avatar(),
        phone: faker.phone.number(),
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postalCode: faker.location.zipCode(),
        country: faker.location.country(),
      },
    });
  }

  console.log("Seeding Pickup Point...");
  await prisma.pickupPoint.upsert({
    where: { code: "MTS_MAIN_PICKUP" },
    update: {
      businessName: "MTS Services.inc",
      addressLine1: "Plot no-2 G/F Gali no-7 Block-A Shiv Vihar Vikas Nagar Uttam Nagar New Delhi-110059",
      addressLine2: null,
      city: "New Delhi",
      state: "Delhi",
      pincode: "110059",
      country: "India",
      phone: null,
      email: null,
      isActive: true,
    },
    create: {
      code: "MTS_MAIN_PICKUP",
      businessName: "MTS Services.inc",
      addressLine1: "Plot no-2 G/F Gali no-7 Block-A Shiv Vihar Vikas Nagar Uttam Nagar New Delhi-110059",
      addressLine2: null,
      city: "New Delhi",
      state: "Delhi",
      pincode: "110059",
      country: "India",
      phone: null,
      email: null,
      isActive: true,
    },
  });

  console.log("Seed finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });