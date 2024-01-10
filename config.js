const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');

const app = express();

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

app.use(session({ secret: 'seuSegredoAqui', resave: true, saveUninitialized: true }));
app.use(express.json());

connection.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conectado ao banco de dados');
});

app.use('/telas', express.static(path.join(__dirname, 'telas')));

app.get('/', (req, res) => {
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

        const jogos = results.map(jogo => ({
            nome: jogo.nomeprod,
            imagem: jogo.img,
            preco: jogo.preco,
            categoria_id: jogo.categoria_id
        }));

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
            }
        });

        console.log('Categorias organizadas:', categorias);

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

app.post('/login', (req, res) => {
    const { email, senha } = req.body;

    const query = `
        SELECT *
        FROM users
        WHERE email = ? AND senha = ?
    `;

    connection.query(query, [email, senha], (error, results) => {
        if (error) {
            console.error('Erro ao verificar credenciais:', error);
            res.status(500).send('Erro interno do servidor');
            return;
        }

        if (results.length > 0) {
            const usuario = results[0];
            req.session.userId = usuario.idusers;
        
            res.status(200).json({
                mensagem: 'Login bem-sucedido!',
                nome: usuario.nomeuser,
                userId: usuario.idusers, // Inclua o ID do usuário na resposta
            });
        } else {
            res.status(401).send('Credenciais incorretas. Tente novamente.');
        }
    });
});

app.get('/obter-informacoes-usuario', (req, res) => {
    const userId = req.session.userId;

    if (userId) {
        const query = `
            SELECT nomeuser, email, senha
            FROM users
            WHERE idusers = ?;
        `;

        connection.query(query, [userId], (error, results) => {
            if (error) {
                console.error('Erro ao obter informações do usuário:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
                return;
            }

            if (results.length > 0) {
                const usuario = results[0];
                res.json({
                    nome: usuario.nomeuser,
                    email: usuario.email,
                    senha: usuario.senha,
                });
            } else {
                res.status(404).send('Usuário não encontrado');
            }
        });
    } else {
        res.status(401).send('Usuário não autenticado');
    }
});

app.post('/editar-informacoes-usuario', (req, res) => {
    const { nome, email, senha } = req.body;
    const userId = req.session.userId;

    const query = `
        UPDATE users
        SET nomeuser = ?, email = ?, senha = ?
        WHERE idusers = ?;
    `;

    connection.query(query, [nome, email, senha, userId], (error, results) => {
        if (error) {
            console.error('Erro ao editar informações do usuário:', error);
            res.status(500).send('Erro interno do servidor');
            return;
        }

        res.status(200).send('Informações do usuário atualizadas com sucesso!');
    });
});


app.post('/adicionar-ao-carrinho', (req, res) => {
    const userId = req.session.userId; // Obtenha o ID do usuário diretamente da sessão
    const { productId } = req.body;

    const query = `
        INSERT INTO carrinho (idusers, idproduto)
        VALUES (?, ?);
    `;

    connection.query(query, [userId, productId], (error, results) => {
        if (error) {
            console.error('Erro ao adicionar ao carrinho:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
            return;
        }

        res.status(200).json({ mensagem: 'Produto adicionado ao carrinho com sucesso!' });
    });
});

app.get('/obter-carrinho', (req, res) => {
    const userId = req.query.id;

    if (!userId) {
        res.status(401).send('Usuário não autenticado');
        return;
    }

    const query = `
        SELECT p.nomeprod, p.preco, c.quantidade
        FROM carrinho c
        JOIN produtos p ON c.idproduto = p.idproduto
        WHERE c.idusers = ?;
    `;

    connection.query(query, [userId], (error, results) => {
        if (error) {
            console.error('Erro ao obter itens do carrinho:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
            return;
        }

        const itensCarrinho = results.map(item => ({
            nomeprod: item.nomeprod,
            preco: item.preco,
            quantidade: item.quantidade,
        }));

        res.json(itensCarrinho);
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
