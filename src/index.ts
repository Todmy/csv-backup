import dotenv from 'dotenv';
dotenv.config();

import { scrape } from './db-scrapper';
import { cleanUpUploads } from './csv-processor';
import { uploadToDropbox, removeOtherFolders } from './do-spaces';
import tables from './tables';

const shouldRemoveOldUploads = process.env.REMOVE_OLD_UPLOADS === 'true';

type UploadedFileDetails = {
  name: string;
  url: string;
};

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

export default async function main() {
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

if (require.main === module) {
  main();
}
