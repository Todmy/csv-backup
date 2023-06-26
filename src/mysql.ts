import mysql, { Pool } from 'mysql2';
export { RowDataPacket, FieldPacket } from 'mysql2';

const connectionConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: Number(process.env.N_THREADS),
  maxIdle: Number(process.env.N_THREADS),
  idleTimeout: 60000,
  enableKeepAlive: true
};

const connection: Pool = mysql.createPool(connectionConfig);

export default connection.promise();
