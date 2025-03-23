const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { validate } = require('jsonschema');

const app = express();

app.use(express.json());
app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

const getRouteFromFileName = (fileName, branchName) => {
  const parts = fileName.replace('.json', '').replace('.yaml', '').split('-');

  let method = parts[0].toLowerCase();
  const validMethods = ['get', 'post', 'put', 'delete'];

  if (!validMethods.includes(method)) {
    method = parts.pop().toLowerCase();
  }

  if (!validMethods.includes(method)) {
    console.error(`❌ Invalid method in file name: ${fileName}`);
    return null;
  }

  let route = `/${branchName}/${parts.slice(1).join('/')}`;

  const paramRegex = /\(([^)]+)\)/g;
  let paramMatch;

  while ((paramMatch = paramRegex.exec(fileName)) !== null) {
    const paramName = paramMatch[1];
    route = route.replace(`(${paramName})`, `:${paramName}`);
  }

  return { route, method };
};

const loadMocks = () => {
  try {
    const mocksPath = path.join(__dirname, 'mocks');

    if (!fs.existsSync(mocksPath)) {
      console.error(`❌ Mocks folder does not exist: ${mocksPath}`);
      return [];
    }

    const branches = fs.readdirSync(mocksPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`Branches found: ${branches.join(', ')}`);

    let mocks = [];

    branches.forEach(branch => {
      const branchPath = path.join(mocksPath, branch);
      const mockFiles = fs.readdirSync(branchPath);

      console.log(`Files in branch "${branch}": ${mockFiles.join(', ')}`);

      mockFiles.forEach(file => {
        if (file.endsWith('.json') || file.endsWith('.yaml')) {
          const filePath = path.join(branchPath, file);

          try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const mock = file.endsWith('.json') ? JSON.parse(fileContent) : yaml.load(fileContent);

            const routeInfo = getRouteFromFileName(file, branch);

            if (routeInfo) {
              const { route, method } = routeInfo;
              console.log(`✔️ Route loaded: ${method.toUpperCase()} ${route}`);
              mocks.push({ route, method, mock });
            }
          } catch (error) {
            console.error(`❌ Error parsing file ${file}:`, error.message);
          }
        } else {
          console.log(`⚠️ Skipped non-JSON/YAML file: ${file}`);
        }
      });
    });

    return mocks;
  } catch (error) {
    console.error('❌ Error loading mocks:', error);
    return [];
  }
};

const configureRoute = (route, method, mock) => {
  console.log(`Configuring route: ${route} with method: ${method}`);

  app[method](route, (req, res) => {
    console.log(`➡️ ${method.toUpperCase()} request received on route: ${route}`);
    console.log('Request Params:', req.params);
    console.log('Request Query:', req.query);
    console.log('Request Body:', req.body);
    console.log('Request Headers:', req.headers);

    if (mock.request && mock.request.schema) {
      const validationResult = validate(req.body, mock.request.schema);
      if (!validationResult.valid) {
        return res.status(400).json({ error: 'Invalid request body', details: validationResult.errors });
      }
    }

    res.set(mock.headers || { 'Content-Type': 'application/json' });

    if (mock.headers) {
      for (const key in mock.headers) {
        if (req.headers[key.toLowerCase()] != mock.headers[key]) {
          return res.status(400).json({ error: `Invalid header: ${key}, expected: ${mock.headers[key]}, got: ${req.headers[key.toLowerCase()]}` });
        }
      }
    }

    if (mock.request && mock.request.params) {
      for (const key in mock.request.params) {
        if (req.params[key] !== mock.request.params[key]) {
          return res.status(400).json({ error: `Invalid param: ${key}, expected: ${mock.request.params[key]}, got: ${req.params[key]}` });
        }
      }
    }

    if (mock.query) {
      for (const key in mock.query) {
        if (req.query[key] != mock.query[key]) {
          return res.status(400).json({ error: `Invalid query param: ${key}, expected: ${mock.query[key]}, got: ${req.query[key]}` });
        }
      }
    }

    if (mock.request && mock.request.body) {
      if (JSON.stringify(req.body) !== JSON.stringify(mock.request.body)) {
        return res.status(400).json({ error: 'Invalid request body' });
      }
    }

    res.status(mock.response.status || 200).json(mock.response.body || {});
  });
};

const mocks = loadMocks();

if (mocks.length > 0) {
  mocks.forEach(({ route, method, mock }) => {
    configureRoute(route, method, mock);
  });
} else {
  console.log('⚠️ No routes loaded.');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Mock server running on port ${PORT}`);
});