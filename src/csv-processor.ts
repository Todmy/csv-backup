import * as csvWriter from 'csv-writer';
import path from 'path';
import fs from 'fs';
import csvParser from 'csv-parser';

const localRootFolder = process.env.LOCAL_ROOT_FOLDER || 'dune';

const getChunkName = (chunkN: number) => `output_${chunkN}.csv`;

export async function cleanUpLocalFiles() {
  if (fs.existsSync(localRootFolder)) {
    fs.rmdirSync(localRootFolder, { recursive: true });
  }
}

export async function writeChunkToCSV(columns: string[], data: any[], chunkN: number) {
  const fileName = getChunkName(chunkN);
  const dist = path.join(localRootFolder, fileName);

  if (!fs.existsSync(localRootFolder)) {
    fs.mkdirSync(localRootFolder, { recursive: true });
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

export async function mergeCSVFiles(outputFileName: string, totalChunks: number): Promise<string> {
  const outputFilePath = path.join(localRootFolder, outputFileName);
  let headers: string[] | null = null;

  for (let i = 0; i < totalChunks; i++) {
    console.log(`Merging chunk ${i} of ${totalChunks}`);
    const fileName = `output_${i}.csv`;
    const filePath = path.join(localRootFolder, fileName);

    const readStream = fs.createReadStream(filePath);
    const parser = readStream.pipe(csvParser());

    for await (const record of parser) {
      if (headers === null) {
        headers = Object.keys(record);
        const writer = csvWriter.createObjectCsvWriter({
          path: outputFilePath,
          header: headers.map(key => ({ id: key, title: key })),
          append: false,
          alwaysQuote: true
        });

        await writer.writeRecords([record]);
      } else {
        const writer = csvWriter.createObjectCsvWriter({
          path: outputFilePath,
          header: headers.map(key => ({ id: key, title: key })),
          append: true,
          alwaysQuote: true
        });

        await writer.writeRecords([record]);
      }
    }
  }

  return outputFilePath;
}