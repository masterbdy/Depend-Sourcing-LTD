const https = require('https');

https.get('https://depend-with-mehedi-default-rtdb.firebaseio.com/staffList.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const staffList = JSON.parse(data);
    if (Array.isArray(staffList)) {
      console.log('Array length:', staffList.length);
      staffList.forEach((s, i) => {
        if (s) console.log(i, s.name, s.isHardDeleted, s.deletedAt);
        else console.log(i, 'null');
      });
    } else {
      console.log('Object keys:', Object.keys(staffList).length);
      for (const key in staffList) {
        const s = staffList[key];
        if (s) console.log(key, s.name, s.isHardDeleted, s.deletedAt);
      }
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
