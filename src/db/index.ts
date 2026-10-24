import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

// Null until DATABASE_URL is set. The repository in src/lib/students.ts
// falls back to in-memory mock data while this is null.
export const db = url ? drizzle({ client: neon(url), schema }) : null;

export type Db = NonNullable<typeof db>;
