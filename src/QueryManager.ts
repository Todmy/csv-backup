import db, { RowDataPacket, FieldPacket } from './mysql';
export { RowDataPacket } from './mysql';

const querySize = Number(process.env.QUERY_SIZE);

export interface ITableQueryDetails {
  name: string;
  createdField: string;
}

export interface IQueryMeta {
  startDate: number;
  endDate: number;
  chunkN: number;
  offset?: number;
  limit?: number;
}

export interface IQueryManager {
  getCountOfChunk(table: ITableQueryDetails, meta: IQueryMeta): Promise<number>;
  getTotalCount(table: ITableQueryDetails): Promise<number>;
  fetchChunk(table: ITableQueryDetails, meta: IQueryMeta): Promise<[string[], any[]]>;
  getMaxMinCreated(table: ITableQueryDetails): Promise<{ max: number; min: number }>;
}

class QueryManager implements IQueryManager {
  async getCountOfChunk(table: ITableQueryDetails, meta: IQueryMeta): Promise<number> {
    const { startDate, endDate } = meta;
    const selector = `COUNT(*)`;
    const [[countData]]: [RowDataPacket[], FieldPacket[]] = await db.query(
      `SELECT COUNT(*) FROM ${table.name} WHERE ${table.createdField} >= ? AND ${table.createdField} < ?`,
      [startDate, endDate]
    );
    return countData[selector];
  }

  async getTotalCount(table: ITableQueryDetails): Promise<number> {
    const selector = `COUNT(*)`;
    const [[countData]]: [RowDataPacket[], FieldPacket[]] = await db.query(
      `SELECT COUNT(*) FROM ${table.name}`
    );
    return countData[selector];
  }

  async fetchChunk(table: ITableQueryDetails, meta: IQueryMeta): Promise<[string[], any[]]> {
    const { startDate, endDate, offset = 0, limit = querySize } = meta;

    const [rowData, fields]: [RowDataPacket[], FieldPacket[]] = await db.query(
      `SELECT * FROM ${table.name} 
      WHERE ${table.createdField} >= ? AND ${table.createdField} < ?
      ORDER BY ${table.createdField} ASC
      LIMIT ? OFFSET ?;`,
      [startDate, endDate, limit, offset]
    );
    return [fields.map(field => field.name), rowData];
  }

  async getMaxMinCreated(table: ITableQueryDetails): Promise<{ max: number; min: number }> {
    const selector = `MAX(${table.createdField}) as max, MIN(${table.createdField}) as min`;
    const query = `SELECT ${selector} FROM ${table.name}`;

    const [rowData]: [RowDataPacket[], FieldPacket[]] = await db.query(query, [
      selector,
      table.name
    ]);

    return {
      max: Number(rowData[0]['max']),
      min: Number(rowData[0]['min'])
    };
  }
}

export default new QueryManager();
