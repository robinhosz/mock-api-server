# Virtualização de APIs com Node.js

Este projeto é um servidor de mock (simulação) de APIs desenvolvido em Node.js. Ele permite criar APIs virtuais a partir de arquivos JSON ou YAML, simulando requisições e respostas HTTP sem a necessidade de um backend real. É ideal para testes de integração, desenvolvimento frontend e cenários onde você precisa simular comportamentos de APIs.

## Funcionalidades

- **Criação de APIs Virtuais:** Defina rotas, métodos HTTP, headers, query parameters, body e respostas diretamente em arquivos JSON ou YAML.
- **Suporte a Métodos HTTP:** GET, POST, PUT, DELETE.
- **Validação de Requisições:** Valida headers, query parameters, body e parâmetros de rota com base no mock definido.
- **Suporte a Parâmetros Dinâmicos:** Use parâmetros dinâmicos nas rotas (ex: `/users/:id`).
- **Suporte a Query Parameters:** Defina e valide query parameters nas requisições.
- **Validação de Schema:** Valida o corpo da requisição usando JSON Schema.
- **Rate Limiting:** Limita o número de requisições por IP para evitar abuso.
- **CORS:** Habilita CORS (Cross-Origin Resource Sharing) para permitir requisições de diferentes origens.
- **Logs Detalhados:** Exibe logs detalhados das requisições recebidas e respostas enviadas.

## Como Funciona

O servidor lê arquivos JSON ou YAML de uma pasta chamada `mocks`. Cada arquivo define uma rota, um método HTTP e a resposta esperada. O nome do arquivo segue o padrão:
**(nome-da-rota)-(metodo-http).json**
Exemplo:

**get-users-(id)-get.json:** Define uma rota GET para /users/:id.

**post-users-post.json:** Define uma rota POST para /users.

O servidor carrega automaticamente todos os arquivos da pasta mocks e configura as rotas correspondentes.

## Instalação

1. Clone o repositório:

    ```bash
    git clone https://github.com/robinhosz/mock-api-server.git
    cd mock-api-server
    ```

2. Instale as dependências:

    ```bash
    npm install
    ```

3. Crie a pasta `mocks`:
   
   Dentro do projeto, crie uma pasta chamada `mocks` e adicione subpastas para cada branch/ambiente (ex: `main`, `develop`).

4. Adicione arquivos de mock:
   
   Crie arquivos JSON ou YAML dentro das pastas de branch para definir as rotas e respostas.

5. Inicie o servidor:

    ```bash
    node server.js
    ```

O servidor estará disponível em `http://localhost:3000`.

## Exemplos de Arquivos de Mock

### 1. GET com Parâmetros de Rota

Arquivo: `get-users-(id)-get.json`

```json
{
  "request": {
    "params": {
      "id": "123"
    }
  },
  "response": {
    "status": 200,
    "body": {
      "id": "123",
      "name": "John Doe",
      "email": "john.doe@example.com"
    }
  }
}
```

## Como Contribuir

Contribuições são bem-vindas! Por favor, leia as diretrizes detalhadas no arquivo [CONTRIBUTING.md](https://github.com/robinhosz/mock-api-server/blob/master/CONTRIBUTING.md).

## Licença

Este projeto está licenciado sob a [GNU General Public License v3.0](https://github.com/robinhosz/mock-api-server/blob/master/LICENSE).