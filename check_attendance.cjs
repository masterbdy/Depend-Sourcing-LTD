const https = require('https');

https.get('https://depend-with-mehedi-default-rtdb.firebaseio.com/attendanceList.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const list = JSON.parse(data);
    let found = [];
    if (Array.isArray(list)) {
      found = list.filter(e => e && e.staffId === 'ipcy35rom');
    } else {
      for (const key in list) {
        const e = list[key];
        if (e && e.staffId === 'ipcy35rom') {
          found.push(e);
        }
      }
    }
    console.log('Found attendance:', found.length > 0 ? found[0] : 'None');
  });
});
