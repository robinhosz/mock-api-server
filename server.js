const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json()); // Para lidar com JSON no corpo das requisições

// Função para transformar o nome do arquivo na rota da API
const getRouteFromFileName = (fileName) => {
  const parts = fileName.replace('.json', '').split('-');
  
  // Adiciona todos os elementos exceto o método na rota
  let route = `/${parts.slice(0, -1).join('/')}`;
  
  // Verifica se há parâmetros na forma (param) no nome do arquivo
  const paramRegex = /\(([^)]+)\)/g;
  let paramMatch;

  // Troca (param) por :param na rota
  while ((paramMatch = paramRegex.exec(fileName)) !== null) {
    const paramName = paramMatch[1];
    route = route.replace(`(${paramName})`, `:${paramName}`); // Substitui o parâmetro na rota
  }

  const method = parts.pop(); // O último elemento é o método

  return { route, method: method.toLowerCase() };
};

// Função para carregar os mocks
const loadMocks = () => {
  try {
    const mockFiles = fs.readdirSync(path.join(__dirname, 'mocks'));
    let mocks = [];
    mockFiles.forEach(file => {
      if (file.endsWith('.json')) {
        const mock = JSON.parse(fs.readFileSync(path.join(__dirname, 'mocks', file), 'utf-8'));
        const { route, method } = getRouteFromFileName(file);

        // Validar se o método é um dos válidos
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

// Função para configurar as rotas com base no arquivo de mock
const configureRoute = (route, method, mock) => {
  console.log(`Configuring route: ${route} with method: ${method}`);

  app[method](route, (req, res) => {
    console.log(`➡️ ${method.toUpperCase()} request received on route: ${route}`);
    console.log('Request Params:', req.params);
    console.log('Request Query:', req.query);
    console.log('Request Body:', req.body);
    console.log('Request Headers:', req.headers);

    // Configurar os headers da resposta
    res.set(mock.headers || { 'Content-Type': 'application/json' });

    // Validação dos headers
    if (mock.headers) {
      for (const key in mock.headers) {
        if (req.headers[key.toLowerCase()] != mock.headers[key]) {
          return res.status(400).json({ error: `Invalid header: ${key}, expected: ${mock.headers[key]}, got: ${req.headers[key.toLowerCase()]}` });
        }
      }
    }

    // Validação de params de rota
    if (mock.request && mock.request.params) {
      for (const key in mock.request.params) {
        if (req.params[key] !== mock.request.params[key]) {
          return res.status(400).json({ error: `Invalid param: ${key}, expected: ${mock.request.params[key]}, got: ${req.params[key]}` });
        }
      }
    }

    // Valida query params
    if (mock.query) {
      for (const key in mock.query) {
        if (req.query[key] != mock.query[key]) { // Usar != para comparar strings e números
          return res.status(400).json({ error: `Invalid query param: ${key}, expected: ${mock.query[key]}, got: ${req.query[key]}` });
        }
      }
    }

    // Valida o body da requisição
    if (mock.request && mock.request.body) {
      if (JSON.stringify(req.body) !== JSON.stringify(mock.request.body)) {
        return res.status(400).json({ error: 'Invalid request body' });
      }
    }

    // Responde com o body esperado
    res.status(mock.response.status || 200).json(mock.response.body || {});
  });
};

// Carregar mocks e criar rotas dinamicamente
const mocks = loadMocks();

if (mocks.length > 0) {
  mocks.forEach(({ route, method, mock }) => {
    configureRoute(route, method, mock);
  });
} else {
  console.log('⚠️ No routes loaded.');
}

// Manter o servidor rodando
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Mock server running on port ${PORT}`);
});
