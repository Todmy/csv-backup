import dotenv from 'dotenv';
dotenv.config();

import { scrape, RowDataPacket } from './db-scrapper';
import { cleanUpUploads } from './csv-processor';
import { uploadToDropbox, removeOtherFolders } from './dropbox';

const shouldRemoveOldUploads = process.env.REMOVE_OLD_UPLOADS === 'true';

type UploadedFileDetails = {
  name: string;
  url: string;
};

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

async function uploadFiles(
  tableName: string,
  folder: string,
  paths: string[]
): Promise<UploadedFileDetails[]> {
  const uploadedTables = [];

  for (const index in paths) {
    const path = paths[index];
    const result = await uploadToDropbox({ localPath: path, folder: folder });
    const name = paths.length === 1 ? tableName : `${tableName} (part ${index})`;
    uploadedTables.push({ name, url: result.url });
  }

  return uploadedTables;
}

async function main() {
  const uploadedTables: UploadedFileDetails[] = [];
  const thisDate = new Date().toISOString().split('T')[0];
  const newUploadFolderName = `upload-${thisDate}`;

  await cleanUpUploads();

  try {
    for (const table of tables) {
      const paths = await scrape(table);

      const results = await uploadFiles(table.name, newUploadFolderName, paths);
      uploadedTables.push(...results);
    }
  } catch (error) {
    console.error(error);
  } finally {
    console.log('Uploaded tables:', uploadedTables);
    if (shouldRemoveOldUploads) {
      await removeOtherFolders({ exceptFolder: newUploadFolderName });
    }
  }
}

main();
