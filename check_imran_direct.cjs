const https = require('https');

https.get('https://depend-with-mehedi-default-rtdb.firebaseio.com/staffList/ipcy35rom.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data);
  });
});
