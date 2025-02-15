//Example assuming the original code contained files named  'db.js' and a file that imported it like 'main.js'

//db.js (inside a Database folder)
const db = { /* ... database connection details */ };
const pool = { /* ... database pool details */ };

export { db, pool };


//main.js
import { db, pool } from "./Database/db";

//Rest of main.js file...