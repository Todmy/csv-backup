type UploadDetails = {
  localPath: string;
  folder: string;
};
type UploadedFileDetails = {
  url: string;
};
async function uploadToDropbox(params: UploadDetails): Promise<UploadedFileDetails> {
  console.log(`Uploading ${params.localPath} to ${params.folder}`);
  return { url: '' };
}

type RemoveOtherFoldersParams = {
  except: string;
};
async function removeOtherFolders(params: RemoveOtherFoldersParams): Promise<void> {
  console.log(`Removing other folders`, params);
}

export { uploadToDropbox, removeOtherFolders };
