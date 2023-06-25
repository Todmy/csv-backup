export default class QueryIndexer {
  items: QueryMeta[] = [];
  constructor(private totalCount: number, private chunkSize: number) {
    this.items = [];
    const rounds = Math.ceil(totalCount / chunkSize);
    for (let i = 0; i < rounds; i++) {
      this.items.push({ offset: i * chunkSize, limit: chunkSize, chunkN: i });
    }
  }

  next(): QueryMeta | undefined {
    return this.items.pop();
  }
}

export type QueryMeta = {
  offset: number;
  limit: number;
  chunkN: number;
};
