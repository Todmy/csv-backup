import * as csvWriter from 'csv-writer';
import path from 'path';
import fs from 'fs';
import csvParser from 'csv-parser';
import { ITableParseParams } from './db-scrapper';

const localTmpFolder = process.env.LOCAL_TMP_FOLDER || 'tmp';
const localUploadsFolder = process.env.LOCAL_UPLOADS_FOLDER || 'uploads';

const getChunkName = (chunkN: number) => `output_${chunkN}.csv`;

export async function cleanUpLocalFiles(folder: string) {
  if (fs.existsSync(folder)) {
    fs.rmSync(folder, { recursive: true });
  }
}

export async function writeChunkToCSV(columns: string[], data: any[], chunkN: number) {
  const fileName = getChunkName(chunkN);
  const dist = path.join(localTmpFolder, fileName);

  if (!fs.existsSync(localTmpFolder)) {
    fs.mkdirSync(localTmpFolder, { recursive: true });
  }

  const processedData = data.map(row =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === 'object' ? JSON.stringify(value) : value
      ])
    )
  );

  const writer = csvWriter.createObjectCsvWriter({
    path: dist,
    header: columns.map(column => ({ id: column, title: column })),
    append: false,
    alwaysQuote: true
  });

  await writer.writeRecords(processedData);
}

export async function mergeCSVFiles(
  outputFileName: string,
  totalChunks: number,
  table: ITableParseParams
): Promise<string> {
  const outputFilePath = path.join(localUploadsFolder, outputFileName);

  if (!fs.existsSync(localUploadsFolder)) {
    fs.mkdirSync(localUploadsFolder, { recursive: true });
  }

  let writer: any;
  let headers: string[] | null = null;

  for (let i = 0; i < totalChunks; i++) {
    console.log(`Merging chunk ${i} of ${totalChunks}`);
    const fileName = `output_${i}.csv`;
    const filePath = path.join(localTmpFolder, fileName);

    const readStream = fs.createReadStream(filePath);
    const parser = readStream.pipe(csvParser());
    readStream.on('end', () => readStream.close());

    const buffer = [];
    for await (const record of parser) {
      if (headers === null) {
        headers = Object.keys(record);
        writer = csvWriter.createObjectCsvWriter({
          path: outputFilePath,
          header: headers.map(key => ({ id: key, title: key })),
          append: false,
          alwaysQuote: true
        });
      }

      // forced to filter it here instead of query, because of DB overload
      if (table.skip && table.skip(record)) continue;

      buffer.push(record);
    }
    await writer.writeRecords(buffer);

    console.log(`Chunk ${i} of ${totalChunks} merged`);
    fs.unlinkSync(filePath);
  }

  return outputFilePath;
}
