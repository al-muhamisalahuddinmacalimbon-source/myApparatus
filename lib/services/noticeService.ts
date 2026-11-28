import pool from "@/lib/db";

export async function getNoticesForDetail(): Promise<unknown[]> {
  const result = await pool.query<Record<string, unknown>>(
    `SELECT id, title, category, body, pinned, created_at::text AS created_at,
            updated_at::text AS updated_at
     FROM lab_notices
     ORDER BY pinned DESC, created_at DESC`,
  );
  return result.rows;
}
