const https = require('https');

https.get('https://depend-with-mehedi-default-rtdb.firebaseio.com/attendanceList.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const attendance = JSON.parse(data);
    let found = null;
    for (const key in attendance) {
      const a = attendance[key];
      if (a && a.staffId === 'ipcy35rom') {
        found = a;
        break;
      }
    }
    console.log('Attendance:', found);
  });
});
