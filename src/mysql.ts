import mysql, { Pool } from 'mysql2';
import bluebird from 'bluebird';

bluebird.promisifyAll(mysql);

const connection: Pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 20,
  maxIdle: 20,
  idleTimeout: 60000,
  enableKeepAlive: true
});

export default connection;
