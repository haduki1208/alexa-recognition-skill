const AWS = require('aws-sdk');
AWS.config.loadFromPath('rootkey.json');
const chokidar = require('chokidar');
const Jimp = require('jimp');

const AMAZON_DRIVE_PATH = './amazondrive';

chokidar
  .watch(AMAZON_DRIVE_PATH, {
    ignoreInitial: true
  })
  .on('add', (path, event) => {
    console.log(path);
    Jimp.read(path, dimThePicture);
  });

function dimThePicture(err, lenna) {
  if (err) {
    throw err;
  }
  lenna.brightness(-0.2).getBuffer(Jimp.MIME_JPEG, (err, bitmapdata) => {
    uploadS3Object(bitmapdata);
  });
}

function uploadS3Object(bitmapdata) {
  const s3 = new AWS.S3();
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: 'upload.jpg',
    Body: bitmapdata
  };
  s3.putObject(params, (err, data) => {
    if (err) {
      console.error(err, err.stack);
    } else {
      console.log('uploaded: ', data);
    }
  });
}
