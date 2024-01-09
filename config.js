const express = require('express');
const mysql = require('mysql2');
const path = require('path');
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
const publicDirectoryPath = path.join(__dirname, 'game_store');
const connection = mysql.createConnection(config.database);

app.use(express.json()); // Adicione isso para facilitar o uso de JSON no corpo da requisição

connection.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conectado ao banco de dados');
});

app.use(express.static(publicDirectoryPath));

app.get('/', (req, res) => {
    // Consulta para obter os dados dos jogos
    const query = `
        SELECT nomeprod, img, preco, categoria_id
        FROM produtos
    `;

    connection.query(query, (error, results) => {
        if (error) {
            console.error('Erro ao obter dados do banco de dados:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
            return;
        }

        // Mapear os resultados da consulta para um formato desejado
        const jogos = results.map(jogo => ({
            nome: jogo.nomeprod,  // Corrigindo a propriedade 'nomeprod'
            imagem: jogo.img,
            preco: jogo.preco,
            categoria_id: jogo.categoria_id
        }));

        // Organizar os jogos por categoria
        const categorias = {
            Nintendo: [],
            Xbox: [],
            Playstation: []
        };

        jogos.forEach(jogo => {
            switch (jogo.categoria_id) {
                case 1:
                    categorias.Nintendo.push(jogo);
                    break;
                case 2:
                    categorias.Xbox.push(jogo);
                    break;
                case 3:
                    categorias.Playstation.push(jogo);
                    break;
                // Adicione mais casos conforme necessário
            }
        });

        console.log('Categorias organizadas:', categorias);

        // Renderizar a página HTML e enviar os dados para o cliente
        res.sendFile(path.join(__dirname, 'telas', 'index.html'), { categorias });


    });
});



app.post('/cadastrar-usuario', (req, res) => {
    const { nome, email, senha } = req.body;

    const query = `
        INSERT INTO users (nomeuser, email, senha)
        VALUES (?, ?, ?)
    `;

    connection.query(query, [nome, email, senha], (error, results) => {
        if (error) {
            console.error('Erro ao cadastrar usuário:', error);
            res.status(500).send('Erro interno do servidor');
            return;
        }

        res.status(200).send('Usuário cadastrado com sucesso!');
    });
});


app.get('/user', (req, res) => {
    // Certifique-se de implementar a autenticação antes de prosseguir
    // Você pode verificar se o usuário está autenticado antes de renderizar a página do usuário
    // Exemplo:
    if (!req.isAuthenticated()) {
        // Redirecionar para a página de login se o usuário não estiver autenticado
        res.redirect('/login');
        return;
    }

    // Renderizar a página do usuário (user.html) e passar as informações do usuário para a página
    res.sendFile(path.join(__dirname, 'telas', 'user.html'), { user: req.user });
});

app.get('/login', (req, res) => {
    // Você pode adicionar lógica adicional aqui, se necessário
    res.sendFile(path.join(__dirname, 'telas', 'index.html?showLogin=true'), { categorias });
});

// Adicione a rota para o processo de login
app.post('/login', (req, res) => {
    const { email, senha } = req.body;

    // Verificar as credenciais do usuário no banco de dados
    const query = `
        SELECT *
        FROM users
        WHERE email = ? AND senha = ?
    `;

    connection.query(query, [email, senha], (error, results) => {
        if (error) {
            console.error('Erro ao verificar as credenciais do usuário:', error);
            return res.status(500).send('Erro interno do servidor');
        }

        console.log('Results:', results);

        if (results.length > 0) {
            // Credenciais corretas, o usuário está autenticado
            console.log('Credenciais corretas. Usuário autenticado:', results[0]);

            // Armazenar informações do usuário na sessão (usando passport, se estiver usando)
            req.login(results[0], (err) => {
                if (err) {
                    console.error('Erro ao realizar login:', err);
                    return res.status(500).send('Erro interno do servidor');
                }

                console.log('Login bem-sucedido. Redirecionando para /user');
                return res.redirect('/user'); // Redirecionar para a página do usuário após o login bem-sucedido
            });
        } else {
            // Credenciais incorretas, redirecionar para a página de login
            console.log('Credenciais incorretas. Redirecionando para /login');
            return res.sendFile(path.join(__dirname, 'telas', 'index.html?showLogin=true'), { categorias });
        }
    });
});
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});