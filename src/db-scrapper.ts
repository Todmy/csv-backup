import qm, { ITableQueryDetails, IQueryMeta, RowDataPacket } from './QueryManager';
import QueryIndexer from './QueryIndexer';
import { writeChunkToCSV, cleanUpTmp, mergeCSVFiles } from './csv-processor';
export { RowDataPacket } from './QueryManager';

const threads = Number(process.env.N_THREADS);

export interface ITableParseParams extends ITableQueryDetails {
  skip?: (row: RowDataPacket) => boolean;
}

async function workerThread(table: ITableQueryDetails, indexer: QueryIndexer) {
  let meta: IQueryMeta | undefined;
  while ((meta = indexer.next())) {
    const [fields, data] = await qm.fetchChunk(table, meta);
    await writeChunkToCSV(fields, data, meta.chunkN);
  }
}

async function scrape(table: ITableQueryDetails): Promise<string[]> {
  await cleanUpTmp();

  const promises = [];
  const indexer = await QueryIndexer.init(qm, table);

  for (let i = 0; i < threads; i++) {
    const promise = workerThread(table, indexer);
    promises.push(promise);
  }

  await Promise.all(promises);
  console.log('All threads finished. Merging files...');
  const today = new Date().toISOString().split('T')[0];
  const outputFileName = `snapshot-hub-mainnet-${today}-${table.name}.csv`;
  return mergeCSVFiles(outputFileName, indexer.maxTotalItems, table);
}

export { scrape };
