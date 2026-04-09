const https = require('https');

const data = JSON.stringify({ isDeleted: null });

const req = https.request({
  hostname: 'depend-with-mehedi-default-rtdb.firebaseio.com',
  path: '/expenses/mxg99cv3l.json',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
