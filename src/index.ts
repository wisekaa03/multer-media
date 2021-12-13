import { createWriteStream, unlink } from 'fs';
import { createHash, randomBytes } from 'node:crypto';
import os from 'os';
import { join } from 'path';
import stream from 'stream';
import type { StorageEngine } from 'multer';
import type { Request } from 'express';
import { ffprobe, type FfprobeData } from 'media-probe';

declare global {
  namespace Express {
    namespace Multer {
      /** Object containing file metadata and access information. */
      interface File {
        hash?: string;
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
   * Algorithm
   */
  algorithm?: string;

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
   * @param destination Destination path
   * @param filename File name
   */
  start?: MediaStorageDataCallback;

  /**
   * A function that will be executed on write events
   *
   * @param req The Express `Request` object.
   * @param file Object containing information about the processed file.
   * @param src Stream Readable
   */
  write?: MediaStorageDataCallback;

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

  constructor(readonly options: MediaStorageOptions) {
    this.getDestination = options.destination || this.getDefaultDestination;
    this.getFilename = options.filename || this.getDefaultFilename;
    this.algorithm = options.algorithm || 'sha256';
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

        const finalPath = join(destination, filename);
        const outStream = createWriteStream(finalPath);
        const md5sum = createHash(this.algorithm);

        file.stream.pipe(outStream);
        if (this.options.start) {
          outStream.on('open', () => {
            this.options.start(req, file, outStream);
          });
        }
        outStream.on('error', callback);
        outStream.on('data', (chunk, encoding, next) => {
          md5sum.update(chunk, encoding);
          if (this.options.write) {
            this.options.write(req, file, outStream, chunk, encoding);
          }
          next();
        });
        outStream.on('finish', () => {
          // eslint-disable-next-line no-param-reassign
          file.hash = md5sum.digest('base64');
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
            .then((media) => {
              // eslint-disable-next-line no-param-reassign
              file.media = media;
            })
            .catch(() => {})
            .finally(() => {
              callback(null, {
                destination,
                filename,
                path: finalPath,
                size: outStream.bytesWritten,
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
