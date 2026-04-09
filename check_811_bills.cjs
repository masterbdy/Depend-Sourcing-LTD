const https = require('https');

https.get('https://depend-with-mehedi-default-rtdb.firebaseio.com/expenses.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const expenses = JSON.parse(data);
    for (const key in expenses) {
      const e = expenses[key];
      if (e && e.staffId === '811rbd5vm') {
        console.log(e);
      }
    }
  });
});
