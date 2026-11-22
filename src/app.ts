import express from "express";
import cors from "cors";
import { env } from "./config/env";
import booksRouter from "./routes/books";
import borrowsRouter from "./routes/borrows";
import { errorHandler, AppError } from "./middleware/errorHandler";

export function buildApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/books", booksRouter);
  app.use("/borrows", borrowsRouter);

  app.use((_req, _res, next) => {
    next(new AppError("Route not found", 404));
  });

  app.use(errorHandler);

  return app;
}
