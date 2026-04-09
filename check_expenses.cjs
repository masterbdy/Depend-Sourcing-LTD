const https = require('https');

https.get('https://depend-with-mehedi-default-rtdb.firebaseio.com/expenses.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const expenses = JSON.parse(data);
    let found = [];
    if (Array.isArray(expenses)) {
      found = expenses.filter(e => e && e.staffId === 'ipcy35rom');
    } else {
      for (const key in expenses) {
        const e = expenses[key];
        if (e && e.staffId === 'ipcy35rom') {
          found.push(e);
        }
      }
    }
    console.log('Found expenses:', found);
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
