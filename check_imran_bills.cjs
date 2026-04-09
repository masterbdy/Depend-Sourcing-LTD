const https = require('https');

https.get('https://depend-with-mehedi-default-rtdb.firebaseio.com/expenses.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const expenses = JSON.parse(data);
    let found1 = [];
    let found2 = [];
    for (const key in expenses) {
      const e = expenses[key];
      if (e && e.staffId === 'ipcy35rom') found1.push(e);
      if (e && e.staffId === '811rbd5vm') found2.push(e);
    }
    console.log('ipcy35rom bills:', found1.length);
    console.log('811rbd5vm bills:', found2.length);
  });
});
