import { createApp } from "./app.js";
import { createDb } from "./db.js";

const dbPath = process.env.NOTES_DB_PATH ?? "./seed-app.sqlite";
const port = Number(process.env.PORT ?? 3000);

const db = createDb(dbPath);
const app = createApp(db);

app.listen(port, () => {
  console.log(`seed-app listening on http://localhost:${port} (db: ${dbPath})`);
});
