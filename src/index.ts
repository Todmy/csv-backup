import dotenv from 'dotenv';
dotenv.config();

import { scrape, RowDataPacket } from './db-scrapper';
import { cleanUpUploads } from './csv-processor';
import { uploadToDropbox, removeOtherFolders } from './dropbox';

const tables = [
  { name: 'users', createdField: 'created' },
  { name: 'follows', createdField: 'created' },
  { name: 'spaces', createdField: 'created_at' },
  { name: 'proposals', createdField: 'created' },
  {
    name: 'votes',
    createdField: 'created',
    skip: (row: RowDataPacket) => row.space === 'linea-build.eth'
  }
];

async function main() {
  const uploadedTables = [];

  await cleanUpUploads();

  const thisDate = new Date().toISOString().split('T')[0];
  const newUploadFolderName = `upload-${thisDate}`;

  try {
    for (const table of tables) {
      const { path } = await scrape(table);
      const { url } = await uploadToDropbox({ localPath: path, folder: newUploadFolderName });
      uploadedTables.push({ name: table.name, url });
    }
  } catch (error) {
    console.error(error);
  } finally {
    console.log('Uploaded tables:', uploadedTables);
    await removeOtherFolders({ exceptFolder: newUploadFolderName });
  }
}

main();
