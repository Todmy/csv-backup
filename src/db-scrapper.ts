import db from './mysql';

type TableDetails = {
  name: string;
  where?: string;
};
async function scrape(table: TableDetails): Promise<{ path: string }> {
  console.log(`Scraping table ${table.name}`);
  return { path: '' };
}

export { scrape };
