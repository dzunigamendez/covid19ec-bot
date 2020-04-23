const fs = require('fs');
const iconv = require('iconv-lite');
const axios = require('axios');
const config = require('config');

const fsp = fs.promises;
const file = config.get('source.file');

async function download(url, filePath) {
  if (fs.existsSync(filePath)) {
    await fsp.unlink(filePath);
  }

  const writer = fs.createWriteStream(filePath, 'utf8');
  const encoding = iconv.decodeStream(file.encoding);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  response.data.pipe(encoding).pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

module.exports = download;
