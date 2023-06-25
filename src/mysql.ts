import mysql, { Pool } from 'mysql2';
export { RowDataPacket, FieldPacket } from 'mysql2';

const connection: Pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 2 * Number(process.env.N_THREADS),
  maxIdle: 2 * Number(process.env.N_THREADS),
  idleTimeout: 60000,
  enableKeepAlive: true
});

export default connection.promise();
