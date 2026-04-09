const https = require('https');

https.get('https://depend-with-mehedi-default-rtdb.firebaseio.com/movements.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const movements = JSON.parse(data);
    let found = null;
    for (const key in movements) {
      const m = movements[key];
      if (m && m.staffId === 'ipcy35rom') {
        found = m;
        break;
      }
    }
    console.log('Movement:', found);
  });
});
