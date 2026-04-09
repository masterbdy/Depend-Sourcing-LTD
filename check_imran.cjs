const https = require('https');

https.get('https://depend-with-mehedi-default-rtdb.firebaseio.com/staffList.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const list = JSON.parse(data);
    for (const key in list) {
      if (list[key] && list[key].name && list[key].name.toLowerCase().includes('imran')) {
        console.log('Found in staffList:', list[key]);
      }
    }
  });
});
