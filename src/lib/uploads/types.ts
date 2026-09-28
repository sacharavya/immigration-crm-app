/** A file the browser has already placed in the staging bucket. */
export type StagedUpload = {
  /** Object path in the `uploads` bucket: `<tenant id>/<random uuid>`. */
  path: string;
  name: string;
  type: string;
  size: number;
};

export type UploadTarget = { path: string; token: string } | { error: string };
