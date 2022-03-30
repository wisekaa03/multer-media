import { createWriteStream, unlink } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import os from 'node:os';
import { resolve as pathResolve } from 'node:path';
import stream from 'node:stream';
import type { StorageEngine } from 'multer';
import type { Request } from 'express';
import { ffprobe, type FfprobeData } from 'media-probe';
import { BinaryToTextEncoding } from 'crypto';

declare global {
  namespace Express {
    namespace Multer {
      /** Object containing file metadata and access information. */
      interface File {
        hash: string;
        media?: FfprobeData;
      }
    }
  }
}

export type Callback = (error: Error | null, path: string) => void;

export type MediaStorageCallback = (
  req: Request,
  file: Express.Multer.File,
  callback: Callback,
) => void;

export type MediaStorageDataCallback = (
  req: Request,
  file: Express.Multer.File,
  outStream?: stream.Writable,
  chunk?: any,
  encoding?: BufferEncoding,
) => void;

export interface MediaStorageOptions {
  /**
   * A string or function that determines the destination path for uploaded
   * files. If a string is passed and the directory does not exist, Multer
   * attempts to create it recursively. If neither a string or a function
   * is passed, the destination defaults to `os.tmpdir()`.
   *
   * @param req The Express `Request` object.
   * @param file Object containing information about the processed file.
   * @param callback Callback to determine the destination path.
   */
  destination?: MediaStorageCallback;

  /**
   * Hash algorithm
   */
  algorithm?: string;
  /**
   * Encoding algorithm
   */
  algorithmEncoding?: BinaryToTextEncoding;

  /**
   * A function that determines the name of the uploaded file. If nothing
   * is passed, Multer will generate a 32 character pseudorandom hex string
   * with no extension.
   *
   * @param req The Express `Request` object.
   * @param file Object containing information about the processed file.
   * @param callback Callback to determine the name of the uploaded file.
   */
  filename?: MediaStorageCallback;

  /**
   * A function that will be executed on start
   *
   * @param req The Express `Request` object.
   * @param file Object containing information about the processed file.
   * @param src Stream Readable
   */
  open?: MediaStorageDataCallback;

  /**
   * A function that will be executed on write events
   *
   * @param req The Express `Request` object.
   * @param file Object containing information about the processed file.
   * @param src Stream Readable
   */
  data?: MediaStorageDataCallback;

  /**
   * A function that will be executed on write events
   *
   * @param req The Express `Request` object.
   * @param file Object containing information about the processed file.
   * @param src Stream Readable
   */
  finish?: MediaStorageDataCallback;
}

export class MediaStorage implements StorageEngine {
  readonly getDestination: MediaStorageCallback;

  readonly getFilename: MediaStorageCallback;

  readonly algorithm: string;

  readonly algorithmEncoding: BinaryToTextEncoding;

  constructor(readonly options: MediaStorageOptions) {
    this.getDestination = options.destination || this.getDefaultDestination;
    this.getFilename = options.filename || this.getDefaultFilename;
    this.algorithm = options.algorithm || 'sha256';
    this.algorithmEncoding = options.algorithmEncoding || 'base64url';
  }

  getDefaultDestination(
    req: Request,
    file: Express.Multer.File,
    callback: Callback,
  ) {
    callback(null, os.tmpdir());
  }

  getDefaultFilename(
    req: Request,
    file: Express.Multer.File,
    callback: Callback,
  ) {
    callback(null, randomBytes(16).toString('hex'));
  }

  /**
   * Store the file described by `file`, then invoke the callback with
   * information about the stored file.
   *
   * File contents are available as a stream via `file.stream`. Information
   * passed to the callback will be merged with `file` for subsequent
   * middleware.
   *
   * @param req The Express `Request` object.
   * @param file Object with `stream`, `fieldname`, `originalname`, `encoding`, and `mimetype` defined.
   * @param callback Callback to specify file information.
   */
  _handleFile(
    req: Request,
    file: Express.Multer.File,
    callback: (error?: any, info?: Partial<Express.Multer.File>) => void,
  ): void {
    this.getDestination(req, file, (errDestination, destination) => {
      if (errDestination) {
        return callback(errDestination, file);
      }

      this.getFilename(req, file, (errFilename, filename) => {
        if (errFilename) {
          return callback(errFilename, file);
        }

        const destinationPath = pathResolve(destination);
        const finalPath = pathResolve(destinationPath, filename);
        const outStream = createWriteStream(finalPath);
        const md5sum = createHash(this.algorithm);

        if (this.options.open) {
          file.stream.on('open', () => {
            this.options.open(req, file, outStream);
          });
        }
        file.stream.on('error', callback);
        file.stream.on('data', (chunk: any) => {
          md5sum.update(chunk);
          if (this.options.data) {
            this.options.data(req, file, outStream, chunk);
          }
        });
        file.stream.pipe(outStream);

        outStream.on('finish', () => {
          let media: FfprobeData;
          const hash = md5sum.end().digest(this.algorithmEncoding);
          // eslint-disable-next-line no-param-reassign
          file.hash = hash;
          if (this.options.finish) {
            this.options.finish(req, file, outStream);
          }
          ffprobe(finalPath, {
            showFormat: true,
            showStreams: true,
            showFrames: false,
            showPackets: false,
            showPrograms: false,
            countFrames: false,
            countPackets: false,
          })
            .then((probe) => {
              media = probe;
            })
            .catch(() => {})
            .finally(() => {
              callback(null, {
                destination: destinationPath,
                filename,
                path: finalPath,
                size: outStream.bytesWritten,
                hash,
                media,
              });
            });
        });
      });
    });
  }

  /**
   * Remove the file described by `file`, then invoke the callback with.
   *
   * `file` contains all the properties available to `_handleFile`, as
   * well as those returned by `_handleFile`.
   *
   * @param req The Express `Request` object.
   * @param file Object containing information about the processed file.
   * @param callback Callback to indicate completion.
   */
  _removeFile(
    req: Request,
    file: Express.Multer.File,
    callback: (err: NodeJS.ErrnoException | null) => void,
  ): void {
    const { path } = file;

    // eslint-disable-next-line
    delete file.destination;
    // eslint-disable-next-line
    delete file.filename;
    // eslint-disable-next-line
    delete file.path;

    unlink(path, callback);
    unlink(file.path, callback);
  }
}

export default (options: MediaStorageOptions) => new MediaStorage(options);
