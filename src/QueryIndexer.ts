import { add } from 'date-fns';
import { IQueryManager, ITableQueryDetails, IQueryMeta } from './QueryManager';

const daysInChunk = process.env.DAYS_IN_CHUNK || '30d';
const querySize = Number(process.env.QUERY_SIZE);

function parseInterval(interval: string): Duration {
  const amount = parseInt(interval.slice(0, -1));
  const unit = interval.slice(-1);

  switch (unit) {
    case 'd':
      return { days: amount };
    case 'M':
      return { months: amount };
    case 'y':
      return { years: amount };
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }
}

export default class QueryIndexer {
  items: IQueryMeta[] = [];
  protected _maxTotalItems: number;

  get maxTotalItems(): number {
    return this._maxTotalItems;
  }

  static async init(qm: IQueryManager, table: ITableQueryDetails): Promise<QueryIndexer> {
    const indexer = new QueryIndexer(qm, table);
    await indexer.splitChunks();
    return indexer;
  }

  protected constructor(private qm: IQueryManager, private table: ITableQueryDetails) {
    this._maxTotalItems = 0;
  }

  private async splitChunks() {
    const totalCount = await this.qm.getTotalCount(this.table);
    console.log(`Total rows: ${totalCount}`);
    const { max, min } = await this.qm.getMaxMinCreated(this.table);

    const normalizedMinDate = new Date(min * 1000);
    const normalizedMaxDate = new Date(max * 1000);

    const interval = parseInterval(daysInChunk);

    let startDate = normalizedMinDate;
    let endDate = add(startDate, interval);
    let chunkN = 0;

    while (startDate < normalizedMaxDate) {
      const meta: IQueryMeta = {
        startDate: startDate.getTime() / 1000,
        endDate: endDate.getTime() / 1000,
        chunkN
      };
      const chunkSize = await this.qm.getCountOfChunk(this.table, meta);

      if (chunkSize > querySize) {
        const subChunks: IQueryMeta[] = this.splitSubChunks(chunkSize, meta);
        this.items.push(...subChunks);
        chunkN += subChunks.length;
      } else {
        this.items.push({
          startDate: startDate.getTime() / 1000,
          endDate: endDate.getTime() / 1000,
          chunkN
        });
        chunkN++;
      }

      startDate = endDate;
      endDate = add(startDate, interval);
    }

    this._maxTotalItems = this.items.length;
    console.log(`Total chunks: ${this._maxTotalItems}`);
  }

  private splitSubChunks(totalCount: number, meta: IQueryMeta): IQueryMeta[] {
    const subChunks: IQueryMeta[] = [];

    const rounds = Math.ceil(totalCount / querySize);
    let chunkN = meta.chunkN;
    for (let i = 0; i < rounds; i++) {
      const offset = i * querySize;
      const limit = querySize;
      subChunks.push({
        ...meta,
        offset,
        limit,
        chunkN
      });
      chunkN++;
    }

    return subChunks;
  }

  public next(): IQueryMeta | undefined {
    return this.items.shift();
  }
}
