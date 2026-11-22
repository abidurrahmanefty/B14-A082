/**
 * BookNook API integration tests (in-memory MongoDB).
 * Run: npx tsx scripts/integration.test.ts
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import request from "supertest";

const JWT_SECRET = "test-jwt-secret-minimum-32-characters-long";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function token(user: { userId: string; email: string; name: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });
}

async function main() {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.CLIENT_ORIGIN = "http://localhost:3000";
  process.env.PORT = "5999";

  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  const { connectDb } = await import("../src/db/connect");
  const { buildApp } = await import("../src/app");

  await connectDb();
  const app = buildApp();

  const owner = { userId: "u1", email: "owner@test.com", name: "Owner" };
  const other = { userId: "u2", email: "other@test.com", name: "Other" };

  console.log("\n--- Public routes ---");

  let res = await request(app).get("/health");
  assert(res.status === 200 && res.body.status === "ok", "GET /health");

  res = await request(app).get("/books");
  assert(res.status === 200 && Array.isArray(res.body), "GET /books empty array");

  res = await request(app)
    .post("/books")
    .send({ title: "T", author: "A", category: "Fiction", imageUrl: "x", description: "d" });
  assert(res.status === 401, "POST /books requires JWT");

  console.log("\n--- Book CRUD ---");

  res = await request(app)
    .post("/books")
    .set("Authorization", `Bearer ${token(owner)}`)
    .send({
      title: "Test Book",
      author: "Author",
      category: "Fiction",
      imageUrl: "https://i.ibb.co/test.jpg",
      description: "A test book",
      totalCopies: 2,
    });
  assert(res.status === 201 && res.body.availableCopies === 2, "POST /books creates with copies");
  const bookId = res.body._id as string;

  res = await request(app).get(`/books/${bookId}`);
  assert(res.status === 200 && res.body.title === "Test Book", "GET /books/:id");

  res = await request(app).get("/books?latest=6");
  assert(res.status === 200 && res.body.length === 1, "GET /books?latest=6");

  res = await request(app)
    .patch(`/books/${bookId}`)
    .set("Authorization", `Bearer ${token(other)}`)
    .send({ title: "Hacked" });
  assert(res.status === 403, "PATCH /books/:id forbidden for non-owner");

  res = await request(app)
    .patch(`/books/${bookId}`)
    .set("Authorization", `Bearer ${token(owner)}`)
    .send({ title: "Updated Title" });
  assert(res.status === 200 && res.body.title === "Updated Title", "PATCH /books/:id owner OK");

  console.log("\n--- Borrow challenge ---");

  res = await request(app)
    .post("/borrows")
    .set("Authorization", `Bearer ${token(other)}`)
    .send({ bookId });
  assert(res.status === 201, "POST /borrows success");

  const borrowId = res.body._id as string;

  res = await request(app).get("/borrows");
  assert(res.status === 401, "GET /borrows requires auth");

  res = await request(app)
    .get("/borrows")
    .set("Authorization", `Bearer ${token(other)}`);
  assert(res.status === 200 && res.body.length === 1, "GET /borrows lists user borrows");

  res = await request(app).get(`/books/${bookId}`);
  assert(res.body.availableCopies === 1, "availableCopies decremented ($inc)");

  res = await request(app)
    .post("/borrows")
    .set("Authorization", `Bearer ${token(other)}`)
    .send({ bookId });
  assert(res.status === 409, "duplicate active borrow returns 409");

  res = await request(app)
    .post("/borrows")
    .set("Authorization", `Bearer ${token(owner)}`)
    .send({ bookId });
  assert(res.status === 201, "second user can borrow same book");

  res = await request(app)
    .post("/borrows")
    .set("Authorization", `Bearer ${token(owner)}`)
    .send({ bookId });
  assert(res.status === 400 || res.status === 409, "no copies left blocks borrow");

  res = await request(app).get(`/books/${bookId}`);
  assert(res.body.availableCopies === 0, "availableCopies is 0");

  res = await request(app)
    .delete(`/borrows/${borrowId}`)
    .set("Authorization", `Bearer ${token(other)}`);
  assert(res.status === 200, "DELETE /borrows/:id return book");

  res = await request(app).get(`/books/${bookId}`);
  assert(res.body.availableCopies === 1, "availableCopies restored on return");

  console.log("\n--- Delete book ---");

  res = await request(app)
    .delete(`/books/${bookId}`)
    .set("Authorization", `Bearer ${token(other)}`);
  assert(res.status === 403, "DELETE /books/:id forbidden for non-owner");

  res = await request(app)
    .delete(`/books/${bookId}`)
    .set("Authorization", `Bearer ${token(owner)}`);
  assert(res.status === 200, "DELETE /books/:id owner OK");

  await mongoose.disconnect();
  await mongod.stop();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
