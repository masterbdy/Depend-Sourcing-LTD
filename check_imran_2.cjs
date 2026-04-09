const https = require('https');

https.get('https://depend-with-mehedi-default-rtdb.firebaseio.com/staffList/811rbd5vm.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Staff 811rbd5vm:', data);
  });
});
