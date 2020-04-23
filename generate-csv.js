const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const fastcsv = require('fast-csv');
const format = require('date-fns/format');
const config = require('config');

const database = config.get('database');

async function generateCsv({ name, query }) {
  const date = format(new Date(), 'ddMMyyyy_HHmmss');
  const filePath = path.resolve(__dirname, 'target', `${name}_${date}.csv`);

  console.log(`-> generating ${filePath}`);

  const pool = await mysql.createPool(database.connection);
  const [rows, fields] = await pool.query(query);
  const headers = fields.map((field) => field.name);
  const csv = fastcsv.format({ delimiter: ',', headers });
  const writer = fs.createWriteStream(filePath, 'utf8');
  csv.pipe(writer);
  rows.forEach((row) => csv.write(row));
  csv.end();

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.log(`-> import completed`);
      pool.end();
      resolve();
    });
    writer.on('error', (error) => {
      pool.end();
      reject(error);
    });
  });
}

module.exports = generateCsv;
