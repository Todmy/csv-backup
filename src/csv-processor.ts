import * as csvWriter from 'csv-writer';
import path from 'path';
import fs from 'fs';
import csvParser from 'csv-parser';
import { ITableParseParams } from './db-scrapper';

const localTmpFolder = process.env.LOCAL_TMP_FOLDER || 'tmp';
const localUploadsFolder = process.env.LOCAL_UPLOADS_FOLDER || 'uploads';
const maxFileSize = Number(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024;

const getChunkName = (chunkN: number) => `output_${chunkN}.csv`;

export async function cleanUpTmp() {
  if (fs.existsSync(localTmpFolder)) {
    fs.rmSync(localTmpFolder, { recursive: true });
  }
}

export async function cleanUpUploads() {
  if (fs.existsSync(localUploadsFolder)) {
    fs.rmSync(localUploadsFolder, { recursive: true });
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

// TODO: refactor this function (too complex)
export async function mergeCSVFiles(
  outputFileName: string,
  totalChunks: number,
  table: ITableParseParams
): Promise<string[]> {
  const outputFilePaths = [];
  let currentOutputFileIndex = 0;
  let currentOutputFileSize = 0;

  if (!fs.existsSync(localUploadsFolder)) {
    fs.mkdirSync(localUploadsFolder, { recursive: true });
  }

  let writer: any;
  let headers: string[] | null = null;

  for (let i = 0; i < totalChunks; i++) {
    console.log(`Merging chunk ${i + 1} of ${totalChunks}`);
    const fileName = `output_${i}.csv`;
    const filePath = path.join(localTmpFolder, fileName);

    const chunkFileSize = fs.statSync(filePath).size;

    if (currentOutputFileSize + chunkFileSize > maxFileSize) {
      currentOutputFileIndex += 1;
      currentOutputFileSize = 0;
      writer = null;
      headers = null;
    }

    const readStream = fs.createReadStream(filePath);
    const parser = readStream.pipe(csvParser());
    readStream.on('end', () => readStream.close());

    const buffer = [];
    for await (const record of parser) {
      if (headers === null) {
        headers = Object.keys(record);

        const fileName = path.basename(outputFileName, '.csv');

        const outputFilePath = path.join(
          localUploadsFolder,
          `${fileName}_${currentOutputFileIndex}.csv`
        );

        outputFilePaths.push(outputFilePath);

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
    currentOutputFileSize += chunkFileSize;

    console.log(`Chunk ${i + 1} of ${totalChunks} merged`);
    fs.unlinkSync(filePath);
  }

  return outputFilePaths;
}
