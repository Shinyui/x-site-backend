// src/config/database.js
const config = require('./env');
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: config.database.url,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
});

async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

async function disconnectDatabase() {
  await prisma.$disconnect();
  console.log("Database disconnected");
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
};
