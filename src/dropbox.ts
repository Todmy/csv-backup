import { Dropbox } from 'dropbox';
import { files } from 'dropbox/types/dropbox_types';
import fs from 'fs';
import path from 'path';

type CommitInfo = files.CommitInfo;

const accessToken = process.env.DROPBOX_ACCESS_TOKEN;
const rootFolder = process.env.DROPBOX_ROOT_FOLDER || 'dune';

const dbx = new Dropbox({ accessToken });

type UploadDetails = {
  localPath: string;
  folder: string;
};
type UploadedFileDetails = {
  url: string;
};

async function uploadToDropbox(params: UploadDetails): Promise<UploadedFileDetails> {
  const rootAppFolder = rootFolder.startsWith('/') ? rootFolder : `/${rootFolder}`;
  const distFolder = params.folder.startsWith('/') ? params.folder : `/${params.folder}`;
  const fileName = path.basename(params.localPath);

  const dropboxPath = `${rootAppFolder}${distFolder}/${fileName}`;
  const chunkSize = 4 * 1024 * 1024;
  const fileStream = fs.createReadStream(params.localPath);

  const start = await dbx.filesUploadSessionStart({ close: false, contents: '' });
  const cursor = {
    session_id: start.result.session_id,
    offset: 0
  };

  let buffer = Buffer.alloc(0);

  for await (const chunk of fileStream) {
    buffer = Buffer.concat([buffer, chunk]);

    if (buffer.length >= chunkSize) {
      await dbx.filesUploadSessionAppendV2({ cursor, close: false, contents: buffer });
      cursor.offset += buffer.length;
      buffer = Buffer.alloc(0); // Reset buffer
    }
  }

  if (buffer.length > 0) {
    await dbx.filesUploadSessionAppendV2({ cursor, close: true, contents: buffer });
    cursor.offset += buffer.length;
  }

  const commit: CommitInfo = {
    path: dropboxPath,
    mode: { '.tag': 'add' },
    autorename: true,
    mute: false
  };

  const finish = await dbx.filesUploadSessionFinish({ cursor, commit });

  if (finish.result.name && finish.result.path_lower) {
    const sharedLink = await dbx.sharingCreateSharedLinkWithSettings({
      path: finish.result.path_lower
    });

    return { url: sharedLink.result.url };
  }

  return { url: '' };
}

type RemoveOtherFoldersParams = {
  exceptFolder: string;
};
async function removeOtherFolders(params: RemoveOtherFoldersParams): Promise<void> {
  const rootAppFolder = rootFolder.startsWith('/') ? rootFolder : `/${rootFolder}`;
  const exceptFolder = !params.exceptFolder.startsWith('/')
    ? params.exceptFolder
    : params.exceptFolder.slice(1);

  try {
    const response = await dbx.filesListFolder({ path: rootAppFolder });

    const { entries } = response.result;

    const deletePromises = entries
      .filter(entry => entry.name !== exceptFolder && entry['.tag'] === 'folder')
      .map(entry => {
        if (typeof entry.path_display === 'undefined') return;
        return dbx
          .filesDeleteV2({ path: entry.path_display })
          .catch(err => console.error(`Failed to delete folder ${entry.name}:`, err));
      });

    await Promise.all(deletePromises);
  } catch (err) {
    console.error('Failed to remove folders:', err);
  }
}

export { uploadToDropbox, removeOtherFolders };
