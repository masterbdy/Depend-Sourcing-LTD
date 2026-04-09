const https = require('https');

const updateAll = async () => {
  const get = (path) => new Promise((resolve) => {
    https.get(`https://depend-with-mehedi-default-rtdb.firebaseio.com/${path}.json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
  });

  const patch = (path, data) => new Promise((resolve) => {
    const req = https.request({
      hostname: 'depend-with-mehedi-default-rtdb.firebaseio.com',
      path: `${path}.json`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.write(JSON.stringify(data));
    req.end();
  });

  const put = (path, data) => new Promise((resolve) => {
    const req = https.request({
      hostname: 'depend-with-mehedi-default-rtdb.firebaseio.com',
      path: `${path}.json`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.write(JSON.stringify(data));
    req.end();
  });

  const del = (path) => new Promise((resolve) => {
    const req = https.request({
      hostname: 'depend-with-mehedi-default-rtdb.firebaseio.com',
      path: `${path}.json`,
      method: 'DELETE'
    }, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.end();
  });

  const newId = 'imran_secure_id';
  const oldId = '811rbd5vm';

  // 1. Copy staff profile
  const staff = await get(`staffList/${oldId}`);
  if (staff) {
    staff.id = newId;
    await put(`staffList/${newId}`, staff);
    await del(`staffList/${oldId}`);
    console.log('Staff profile moved to', newId);
  }

  // 2. Update expenses
  const expenses = await get('expenses');
  for (const key in expenses) {
    if (expenses[key] && expenses[key].staffId === oldId) {
      await patch(`expenses/${key}`, { staffId: newId });
      console.log('Updated expense', key);
    }
  }

  // 3. Update advances
  const advances = await get('advances');
  for (const key in advances) {
    if (advances[key] && advances[key].staffId === oldId) {
      await patch(`advances/${key}`, { staffId: newId });
      console.log('Updated advance', key);
    }
  }

  // 4. Update movements
  const movements = await get('movements');
  for (const key in movements) {
    if (movements[key] && movements[key].staffId === oldId) {
      await patch(`movements/${key}`, { staffId: newId });
      console.log('Updated movement', key);
    }
  }

  // 5. Update attendance
  const attendance = await get('attendanceList');
  for (const key in attendance) {
    if (attendance[key] && attendance[key].staffId === oldId) {
      await patch(`attendanceList/${key}`, { staffId: newId });
      console.log('Updated attendance', key);
    }
  }

  console.log('Done!');
};

updateAll();
