import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "../lib/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET /api/profiles — return all profiles ordered by most recently updated
router.get("/profiles", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT data FROM profiles ORDER BY updated_at DESC"
    );
    res.json(rows.map((r) => r.data));
  } catch (err) {
    logger.error({ err }, "GET /profiles failed");
    res.status(500).json({ error: "Failed to load profiles" });
  }
});

// POST /api/profiles — upsert a profile (insert or update by id)
router.post("/profiles", async (req: Request, res: Response) => {
  const profile = req.body;
  if (!profile || typeof profile.id !== "string") {
    res.status(400).json({ error: "Invalid profile payload" });
    return;
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO profiles (id, data, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE
         SET data = EXCLUDED.data,
             updated_at = NOW()
       RETURNING data`,
      [profile.id, JSON.stringify(profile)]
    );
    res.json(rows[0].data);
  } catch (err) {
    logger.error({ err }, "POST /profiles failed");
    res.status(500).json({ error: "Failed to save profile" });
  }
});

// DELETE /api/profiles/:id — delete a profile
router.delete("/profiles/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM profiles WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "DELETE /profiles failed");
    res.status(500).json({ error: "Failed to delete profile" });
  }
});

export default router;
