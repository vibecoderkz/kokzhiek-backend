import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../models/schema';

const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL!);
export const db = drizzle(sql as any, { schema });