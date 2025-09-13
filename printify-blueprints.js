import https from 'node:https';

const API_TOKEN = process.env.VITE_PRINTIFY_API_TOKEN || '';
const SEARCH_PATTERN = /unisex.*heavy.*cotton/i; // <-- RegExp: case-insensitive, matches anything with 'unisex' followed by 'heavy' then 'cotton' then 'tee'

const options = {
  hostname: 'api.printify.com',
  path: '/v1/catalog/blueprints.json',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const blueprints = Array.isArray(json) ? json : json.blueprints || [];

      // Filter using regular expression (wildcard support)
      const filtered = blueprints.filter(bp =>
        bp.title && SEARCH_PATTERN.test(bp.title)
      );

      console.log(`Blueprints matching pattern ${SEARCH_PATTERN}:`);
      console.log(JSON.stringify(filtered, null, 2));
    } catch (error) {
      console.error('Could not parse response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();