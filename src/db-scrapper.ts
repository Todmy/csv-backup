import db, { RowDataPacket, FieldPacket } from './mysql';
import QueryIndexer, { QueryMeta } from './QueryIndexer';
import { writeChunkToCSV, cleanUpLocalFiles, mergeCSVFiles } from './csv-processor';

const threads = Number(process.env.N_THREADS);
const querySize = Number(process.env.QUERY_SIZE);

type TableDetails = {
  name: string;
  where?: string;
};

async function fetchChunk(
  table: TableDetails,
  { offset, limit }: QueryMeta
): Promise<[string[], any[]]> {
  console.log(`Fetching ${limit} entries from ${table.name} starting from ${offset}`);
  const [rowData, fields]: [RowDataPacket[], FieldPacket[]] = await db.query(
    `SELECT * FROM ${table.name} ${table.where || ''} 
      ORDER BY created ASC LIMIT ? OFFSET ?;`,
    [limit, offset]
  );
  console.log(`Fetched ${rowData.length} entries from ${table.name} starting from ${offset}`);
  return [fields.map(field => field.name), rowData];
}

async function getEntryCount(table: TableDetails): Promise<number> {
  const selector = `COUNT(*)`;
  let query = `SELECT ${selector} FROM ${table.name}`;

  if (table.where) {
    query += ` ${table.where}`;
  }

  const [rowData]: [RowDataPacket[], FieldPacket[]] = await db.query(query, [
    selector,
    table.name,
    table.where || ''
  ]);

  return rowData[0][selector];
}

async function workerThread(table: TableDetails, indexer: QueryIndexer) {
  let meta: QueryMeta | undefined;
  while ((meta = indexer.next())) {
    const [fields, data] = await fetchChunk(table, meta);
    if (data.length === 0) break;
    await writeChunkToCSV(fields, data, meta.chunkN);
  }
}

async function scrape(table: TableDetails): Promise<{ path: string }> {
  await cleanUpLocalFiles();
  const totalRecords = await getEntryCount(table);

  console.log(`Found ${totalRecords} entries in table ${table.name}`);

  const promises = [];
  const indexer = new QueryIndexer(totalRecords, querySize);

  for (let i = 0; i < threads; i++) {
    const promise = workerThread(table, indexer);
    promises.push(promise);
  }

  await Promise.all(promises);
  console.log('All threads finished. Merging files...');
  const today = new Date().toISOString().split('T')[0];
  const outputFileName = `snapshot-hub-mainnet-${today}-${table.name}.csv`;
  const pathToFile = await mergeCSVFiles(outputFileName, indexer.maxTotalItems);

  return { path: pathToFile };
}

export { scrape };
