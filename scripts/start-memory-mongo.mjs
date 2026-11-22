import { MongoMemoryServer } from "mongodb-memory-server";
import fs from "fs";

const mongod = await MongoMemoryServer.create();
const uri = mongod.getUri("booknook");
fs.writeFileSync(".mongo-memory-uri", uri);
console.log(uri);
setInterval(() => {}, 1 << 30);
