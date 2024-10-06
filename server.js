const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json());

// Obtém o nome da branch a partir da variável de ambiente
const branchName = process.env.BRANCH_NAME ? process.env.BRANCH_NAME.split('/').pop() : 'master';
console.log(`Branch name being used: ${branchName}`);

const getRouteFromFileName = (fileName) => {
  const parts = fileName.replace('.json', '').split('-');
  
  let route = `/${branchName}/${parts.slice(0, -1).join('/')}`;
  
  const paramRegex = /\(([^)]+)\)/g;
  let paramMatch;

  while ((paramMatch = paramRegex.exec(fileName)) !== null) {
    const paramName = paramMatch[1];
    route = route.replace(`(${paramName})`, `:${paramName}`);
  }

  const method = parts.pop();

  return { route, method: method.toLowerCase() };
};

const loadMocks = () => {
  try {
    const branchPath = path.join(__dirname, 'mocks', branchName); // Caminho da branch atual

    // Verifica se a pasta da branch existe
    if (!fs.existsSync(branchPath)) {
      console.error(`❌ Branch folder does not exist: ${branchPath}`);
      return [];
    }

    const mockFiles = fs.readdirSync(branchPath); // Listar arquivos na pasta da branch atual
    console.log(`Files in branch path: ${mockFiles}`); // Listar arquivos encontrados
    let mocks = [];

    mockFiles.forEach(file => {
      if (file.endsWith('.json')) {
        const mock = JSON.parse(fs.readFileSync(path.join(branchPath, file), 'utf-8'));
        const { route, method } = getRouteFromFileName(file);

        const validMethods = ['get', 'post', 'put', 'delete'];
        if (validMethods.includes(method)) {
          console.log(`✔️ Route loaded: ${method.toUpperCase()} ${route}`);
          mocks.push({ route, method, mock });
        } else {
          console.error(`❌ Invalid method in file name: ${file}`);
        }
      } else {
        console.log(`⚠️ Skipped non-JSON file: ${file}`);
      }
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
