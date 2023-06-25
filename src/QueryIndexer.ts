export type QueryMeta = {
  offset: number;
  limit: number;
  chunkN: number;
};

export default class QueryIndexer {
  items: QueryMeta[] = [];
  maxTotalItems: number;
  constructor(private totalCount: number, private chunkSize: number) {
    this.items = [];
    const rounds = Math.ceil(totalCount / chunkSize);
    for (let i = 0; i < rounds; i++) {
      this.items.push({ offset: i * chunkSize, limit: chunkSize, chunkN: i });
    }

    this.maxTotalItems = this.items.length;
  }

  next(): QueryMeta | undefined {
    return this.items.shift();
  }
}
