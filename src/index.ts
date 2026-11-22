import { env } from "./config/env";
import { connectDb } from "./db/connect";
import { buildApp } from "./app";

async function main() {
  await connectDb();
  const app = buildApp();

  app.listen(env.port, () => {
    console.log(`BookNook API listening on port ${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
