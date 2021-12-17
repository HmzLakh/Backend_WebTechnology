import * as mysql from 'mysql';
import * as dotenv from "dotenv";
dotenv.config();

const db = mysql.createConnection({
  multipleStatements: true,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: process.env.DB_NAME
});

export {db}

