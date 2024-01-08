// server.js
const express = require('express');
const mysql = require('mysql2');

const app = express();

// Configurações do servidor e banco de dados
const config = {
    server: {
        port: 3000
    },
    database: {
        host: 'localhost',
        user: 'root',
        password: 'acesso123',
        database: 'game_store'
    }
};

const port = config.server.port;

const connection = mysql.createConnection(config.database);

connection.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conectado ao banco de dados');
});

app.get('/', (req, res) => {
    // Consulta para obter os dados dos jogos
    connection.query('SELECT * FROM produtos', (error, results) => {
        if (error) {
            console.error('Erro ao obter dados do banco de dados:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
            return;
        }

        // Organiza os jogos por categoria
        const xboxGames = results.filter(game => game.categoria === 'Xbox');
        const playstationGames = results.filter(game => game.categoria === 'Playstation');
        const nintendoGames = results.filter(game => game.categoria === 'Nintendo');

        // Envia a resposta como JSON
        res.json({
            xboxGames: xboxGames,
            playstationGames: playstationGames,
            nintendoGames: nintendoGames
        });
    });
});

// Função para gerar a lista de jogos
function generateGameList(games) {
    return games.map(game => `
        <li>
            <a href="#">${game.nome}</a>
            <p>${game.descricao}</p>
            <p>Preço: $${game.preco.toFixed(2)}</p>
        </li>
    `).join('');
}

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});