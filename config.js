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
const ipAddress = '172.16.31.38'; //Endereço IP da máquina

 


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
        SELECT idproduto, nomeprod, img, preco, categoria_id
        FROM produtos
    `;

    connection.query(query, (error, results) => {
        if (error) {
            console.error('Erro ao obter dados do banco de dados:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
            return;
        }

        const jogos = results.map(jogo => ({
            id: jogo.produto_id,
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
    const userId = req.session.userId;
    const { productId, quantidade } = req.body;

    console.log('Rota /adicionar-ao-carrinho chamada');
    console.log('Usuário ID:', userId, 'Produto ID recebido:', productId, 'Quantidade:', quantidade);

    const query = `
        INSERT INTO carrinho (idusers, idproduto, quantidade)
        VALUES (?, ?, ?);
    `;

    connection.query(query, [userId, productId, quantidade], (error, results) => {
        if (error) {
            console.error('Erro ao adicionar ao carrinho:', error);
            res.status(500).json({ error: 'Erro interno do servidor', mensagem: error.message });
            return;
        }

        console.log('Produto adicionado ao carrinho com sucesso!');
        res.status(200).json({ mensagem: 'Produto adicionado ao carrinho com sucesso!' });
    });
});


app.get('/obter-itens-carrinho', (req, res) => {
    const userId = req.session.userId;

    if (userId) {
        const query = `
            SELECT p.idproduto, p.nomeprod, p.preco, c.quantidade
            FROM carrinho c
            INNER JOIN produtos p ON c.idproduto = p.idproduto
            WHERE c.idusers = ?;
        `;

        connection.query(query, [userId], (error, results) => {
            if (error) {
                console.error('Erro ao obter itens do carrinho:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
                return;
            }

            const itensCarrinho = results.map(item => ({
                idProduto: item.idproduto,
                nomeProduto: item.nomeprod,
                preco: item.preco,
                quantidade: item.quantidade
            }));

            res.json(itensCarrinho);
        });
    } else {
        res.status(401).send('Usuário não autenticado');
    }
});


app.delete('/excluir-item-carrinho/:idProduto', (req, res) => {
    const userId = req.session.userId;
    const idProduto = req.params.idProduto;

    const query = `
        DELETE FROM carrinho
        WHERE idusers = ? AND idproduto = ?;
    `;

    connection.query(query, [userId, idProduto], (error, results) => {
        if (error) {
            console.error('Erro ao excluir item do carrinho:', error);
            res.status(500).json({ error: 'Erro interno do servidor', mensagem: error.message });
            return;
        }

        console.log('Item do carrinho excluído com sucesso!');
        res.status(200).json({ mensagem: 'Item do carrinho excluído com sucesso!' });
    });
});


app.put('/editar-item-carrinho/:idProduto', (req, res) => {
    const userId = req.session.userId;
    const idProduto = req.params.idProduto;
    const { novaQuantidade } = req.body;

    const query = `
        UPDATE carrinho
        SET quantidade = ?
        WHERE idusers = ? AND idproduto = ?;
    `;

    connection.query(query, [novaQuantidade, userId, idProduto], (error, results) => {
        if (error) {
            console.error('Erro ao editar quantidade do item do carrinho:', error);
            res.status(500).json({ error: 'Erro interno do servidor', mensagem: error.message });
            return;
        }

        console.log('Quantidade do item do carrinho editada com sucesso!');
        res.status(200).json({ mensagem: 'Quantidade do item do carrinho editada com sucesso!' });
    });
});

app.post('/confirmar-compra', (req, res) => {
    const userId = req.session.userId;

    if (userId) {
        // Obtenha o valor total da compra
        const queryObterValorTotal = `
            SELECT SUM(p.preco * c.quantidade) AS valorTotal
            FROM carrinho c
            INNER JOIN produtos p ON c.idproduto = p.idproduto
            WHERE c.idusers = ?;
        `;

        connection.query(queryObterValorTotal, [userId], (error, results) => {
            if (error) {
                console.error('Erro ao obter valor total da compra:', error);
                res.status(500).json({ error: 'Erro interno do servidor', mensagem: error.message });
                return;
            }

            const valorTotal = results[0].valorTotal;

            // Insira os detalhes da compra na tabela 'compras'
            const queryInserirCompra = `
                INSERT INTO compras (idusers, valorTotal)
                VALUES (?, ?);
            `;

            connection.query(queryInserirCompra, [userId, valorTotal], (error, results) => {
                if (error) {
                    console.error('Erro ao confirmar compra e inserir na tabela de compras:', error);
                    res.status(500).json({ error: 'Erro interno do servidor', mensagem: error.message });
                    return;
                }

                // Exclua os itens do carrinho após a confirmação da compra
                const queryExcluirCarrinho = `
                    DELETE FROM carrinho
                    WHERE idusers = ?;
                `;

                connection.query(queryExcluirCarrinho, [userId], (error, results) => {
                    if (error) {
                        console.error('Erro ao excluir itens do carrinho após a compra:', error);
                        res.status(500).json({ error: 'Erro interno do servidor', mensagem: error.message });
                        return;
                    }

                    console.log('Compra confirmada e itens do carrinho excluídos com sucesso!');
                    res.status(200).json({ mensagem: 'Compra confirmada e itens do carrinho excluídos com sucesso!' });
                });
            });
        });
    } else {
        res.status(401).send('Usuário não autenticado');
    }
});

app.get('/obter-historico-compras', (req, res) => {
    const userId = req.session.userId;

    if (userId) {
        const query = `
            SELECT dataCompra, valorTotal
            FROM compras
            WHERE idusers = ?;
        `;

        connection.query(query, [userId], (error, results) => {
            if (error) {
                console.error('Erro ao obter histórico de compras do banco de dados:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
                return;
            }

            const historicoCompras = results.map(compra => ({
                dataCompra: compra.dataCompra,
                valorTotal: compra.valorTotal,
            }));

            res.json(historicoCompras);
        });
    } else {
        res.status(401).send('Usuário não autenticado');
    }
});

// Adicione esta rota para obter os comentários
app.get('/obter-comentarios', (req, res) => {
    const query = `
        SELECT usuario, texto
        FROM comentarios;
    `;

    connection.query(query, (error, results) => {
        if (error) {
            console.error('Erro ao obter comentários do banco de dados:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
            return;
        }

        const comentarios = results.map(comentario => ({
            usuario: comentario.usuario,
            texto: comentario.texto,
        }));

        res.json(comentarios);
    });
});

// Adicione esta rota para adicionar um novo comentário
app.post('/adicionar-comentario', (req, res) => {
    const { texto } = req.body;
    const userId = req.session.userId;

    if (userId) {
        const query = `
            INSERT INTO comentarios (idusers, comentario)
            VALUES (?, ?);
        `;

        connection.query(query, [userId, texto], (error, results) => {
            if (error) {
                console.error('Erro ao adicionar comentário no banco de dados:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
                return;
            }

            res.status(200).json({ mensagem: 'Comentário adicionado com sucesso!' });
        });
    } else {
        res.status(401).json({ error: 'Usuário não autenticado' });
    }
});

// Adicione esta rota para obter todos os comentários
app.get('/obter-todos-comentarios', (req, res) => {
    const query = `
        SELECT u.nomeuser AS usuario, c.comentario, c.data_publicacao
        FROM comentarios c
        LEFT JOIN users u ON c.idusers = u.idusers
        ORDER BY c.data_publicacao DESC;
    `;

    connection.query(query, (error, results) => {
        if (error) {
            console.error('Erro ao obter todos os comentários do banco de dados:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
            return;
        }

        const comentarios = results.map(comentario => ({
            usuario: comentario.usuario,
            texto: comentario.comentario,
            dataPublicacao: comentario.data_publicacao,
        }));

        res.json(comentarios);
    });
});



app.listen(port, ipAddress, () => {
    console.log(`Servidor rodando em http://${ipAddress}:${port}`);
});