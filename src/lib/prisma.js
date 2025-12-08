import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

const prismaClientSingleton = () => {
  // 1. Create a standard Postgres connection pool
  const pool = new Pool({ connectionString });
  
  // 2. Create the adapter
  const adapter = new PrismaPg(pool);
  
  // 3. Pass the adapter to the Client
  return new PrismaClient({ adapter });
};

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
