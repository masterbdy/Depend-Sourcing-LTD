const https = require('https');

const get = (path) => new Promise((resolve) => {
  https.get(`https://depend-with-mehedi-default-rtdb.firebaseio.com/${path}.json`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(JSON.parse(data)));
  });
});

const checkComplaints = async () => {
  const complaints = await get('complaints');
  for (const key in complaints) {
    if (complaints[key] && (complaints[key].submittedById === '811rbd5vm' || complaints[key].againstStaffId === '811rbd5vm')) {
      console.log('Found complaint:', key);
    }
  }
  console.log('Done checking complaints');
};

checkComplaints();
