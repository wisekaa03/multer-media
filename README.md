# Multer media
## Installation
```bash
$ yarn add multer-media
```

## Usage
```javascript
  const upload = multer({
      storage: multerMedia({
        algorithm: 'md5',
        
        destination: (
          req: ExpressRequest,
          file: Express.Multer.File,
          callback: (error: Error | null, path: string) => void,
        ) => {
          callback(null, '/tmp/my-uploads');
        },
        
        filename: (
          req: ExpressRequest,
          file: Express.Multer.File,
          callback: (error: Error | null, path: string) => void,
        ) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
          callback(null, file.fieldname + '-' + uniqueSuffix);
        },

        /**
         * A function that will be executed on start
         *
         * @param req The Express `Request` object.
         * @param file Object containing information about the processed file.
         * @param src Stream Readable
         */
        start?: (
          req: Request,
          file: Express.Multer.File,
          outStream?: stream.Writable,
          chunk?: any,
          encoding?: BufferEncoding,
        ) => {},

        /**
         * A function that will be executed on write events
         *
         * @param req The Express `Request` object.
         * @param file Object containing information about the processed file.
         * @param src Stream Readable
         */
        write?: (
          req: Request,
          file: Express.Multer.File,
          outStream?: stream.Writable,
          chunk?: any,
          encoding?: BufferEncoding,
        ) => {},

        /**
         * A function that will be executed on write events
         *
         * @param req The Express `Request` object.
         * @param file Object containing information about the processed file.
         * @param src Stream Readable
         */
        finish?: (
          req: Request,
          file: Express.Multer.File,
          outStream?: stream.Writable,
          chunk?: any,
          encoding?: BufferEncoding,
        ) => {},
      }),
  });
```

## API
### File information

Each file contains the following information:

Key | Type | Description
--- | --- | ---
`fieldname` | string | Field name specified in the form |
`originalname` | string | Name of the file on the user's computer |
`encoding` | string | Encoding type of the file |
`mimetype` | string | Mime type of the file |
`size` | number | Size of the file in bytes |
`destination` | string | The folder to which the file has been saved |
`filename` | string | The name of the file within the `destination`
`path` | string | The full path to the uploaded file
`hash` | string | Hash with algorithm the file
`media` | FfprobeData | Media probe of this file, using ffmpeg-static
