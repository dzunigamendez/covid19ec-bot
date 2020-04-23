const path = require('path');
const format = require('date-fns/format');
const es = require('date-fns/locale/es');
const stream = require('stream');
const config = require('config');
const downloadFile = require('./download-file');
const importData = require('./import-data');
const generateCsv = require('./generate-csv');

const baseUrl = config.get('source.baseUrl');
const file = config.get('source.file');
const target = config.get('target');

async function run() {
  try {
    const currentFile = getCurrentFileName();
    const url = `${baseUrl}=${currentFile}`;
    const file = path.resolve(__dirname, 'source', `${currentFile}`);
    console.log('----------------------');
    console.log('url: ', url);
    console.log('file: ', file);
    console.log('----------------------');
    console.log('downloading file...');
    await downloadFile(url, file);
    console.log('----------------------');
    console.log('importing data...');
    await importData(file);
    console.log('----------------------');
    console.log('generating csv files...');
    await generateCsvFiles();
  } catch (error) {
    console.error(error);
  }
}

function getCurrentFileName() {
  const now = new Date();
  const name = format(now, file.dateFormat, { locale: es });
  return `${file.name}_${name}.${file.ext}`;
}

async function generateCsvFiles() {
  if (target && target.length) {
    return Promise.all(target.map((t) => generateCsv(t)));
  }
}

run();
