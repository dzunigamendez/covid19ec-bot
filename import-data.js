const fs = require('fs');
const stream = require('stream');
const fastcsv = require('fast-csv');
const mysql = require('mysql2/promise');
const parse = require('date-fns/parse');
const config = require('config');

const database = config.get('database');
const columns = config.get('source.columns');
const delimiter = config.get('source.delimiter');
const transformer = config.get('source.transformer');

async function importData(filePath) {
  const pool = await mysql.createPool(database.connection);

  console.log(`-> deleting rows from ${database.table} table: `);
  const deleted = await pool.query(`DELETE FROM ${database.table}`);
  console.log(`-> deleted status: `, deleted);

  const fileReader = fs.createReadStream(filePath);
  const csvParser = fastcsv
    .parse({ delimiter, headers: true })
    .transform(dataTransform);
  const dbWritable = new DbWritable({ pool, columns });

  fileReader.pipe(csvParser).pipe(dbWritable);

  return new Promise((resolve, reject) => {
    dbWritable.on('finish', () => {
      console.log(`-> import completed`);
      pool.end();
      resolve();
    });
    dbWritable.on('error', (error) => {
      pool.end();
      reject(error);
    });
  });
}

function dataTransform(data) {
  const { singleQuote, questionMark, integer, date } = transformer;
  let values = { ...data };
  if (integer && integer.length) {
    integer.forEach((column) => (values[column] = parseInt(values[column])));
  }
  if (singleQuote && singleQuote.length) {
    singleQuote.forEach(
      (column) => (values[column] = values[column].replace("'", '')),
    );
  }
  if (questionMark && questionMark.length) {
    questionMark.forEach(
      (column) => (values[column] = values[column].replace('?', 'Ñ')),
    );
  }
  if (date && date.columns.length && date.format) {
    date.columns.forEach(
      (column) =>
        (values[column] = parse(values[column], date.format, new Date())),
    );
  }
  return values;
}

class DbWritable extends stream.Writable {
  constructor({ pool, columns, ...options }) {
    super({ ...options, objectMode: true });
    this.pool = pool;
    this.columns = columns;
  }

  async _write(data, _, callback) {
    try {
      const query = `INSERT INTO msp (${this.columns.join(',')}) VALUES (?)`;
      const values = this.columns.map((column) => data[column]);
      await this.pool.query(query, [values]);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

module.exports = importData;
