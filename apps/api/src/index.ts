import "dotenv/config";
import express from "express";
import cors from "cors";
import next from "next";
import path from "path";
import { env } from "./env";
import { authRouter } from "./routes/auth";
import { assetsRouter } from "./routes/assets";
import { portfoliosRouter } from "./routes/portfolios";

const dev = env.NODE_ENV !== "production";
const nextApp = next({ dev, dir: path.join(__dirname, "../../web") });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  // API routes
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/assets", assetsRouter);
  app.use("/api/portfolios", portfoliosRouter);

  // Next.js handles all other routes
  app.all("*", (req, res) => {
    return handle(req, res);
  });

  app.use((err: any, _req: any, res: any, _next: any) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on :${env.PORT}`);
  });
});
