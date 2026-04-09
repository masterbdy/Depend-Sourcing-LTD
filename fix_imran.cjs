const https = require('https');

const data = JSON.stringify({
  id: "811rbd5vm",
  name: "MD Imran",
  staffId: "ST-IMRAN-2",
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
  path: '/staffList/811rbd5vm.json',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Restore 811rbd5vm statusCode: ${res.statusCode}`);
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();

// Delete ipcy35rom
const req2 = https.request({
  hostname: 'depend-with-mehedi-default-rtdb.firebaseio.com',
  port: 443,
  path: '/staffList/ipcy35rom.json',
  method: 'DELETE'
}, (res) => {
  console.log(`Delete ipcy35rom statusCode: ${res.statusCode}`);
});
req2.end();
