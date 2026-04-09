const https = require('https');

const data = JSON.stringify({
  id: "ipcy35rom",
  name: "MD Imran",
  staffId: "ST-IMRAN",
  designation: "Staff",
  mobile: "01000000000",
  basicSalary: 0,
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
  workLocation: "HEAD_OFFICE",
  requiresCheckOutLocation: false,
  role: "STAFF",
  password: "123"
});

const options = {
  hostname: 'depend-with-mehedi-default-rtdb.firebaseio.com',
  port: 443,
  path: '/staffList/ipcy35rom.json',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
