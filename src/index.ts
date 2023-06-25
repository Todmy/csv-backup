import dotenv from 'dotenv';
dotenv.config();

import { RowDataPacket } from './mysql';
import { scrape } from './db-scrapper';
import { uploadToDropbox, removeOtherFolders } from './dropbox';

const tables = [
  // { name: 'users' }
  // { name: 'follows' },
  // { name: 'spaces' },
  // { name: 'proposals' },
  {
    name: 'votes',
    skip: (row: RowDataPacket) => row.space === 'linea-build.eth'
    // where: "WHERE TRIM(space) <> 'linea-build.eth'"
  }
];

const rootFolder = process.env.DROPBOX_ROOT_FOLDER || 'dune';

async function main() {
  const uploadedTables = [];
  // date in format YYYY-MM-DD
  const thisDate = new Date().toISOString().split('T')[0];
  const dropboxFolderName = `${rootFolder}/upload-${thisDate}`;
  try {
    for (const table of tables) {
      const { path } = await scrape(table);
      const { url } = await uploadToDropbox({ localPath: path, folder: dropboxFolderName });
      uploadedTables.push({ name: table.name, url });
    }
  } catch (error) {
    console.error(error);
  } finally {
    await removeOtherFolders({ except: dropboxFolderName });
  }
}

main();
