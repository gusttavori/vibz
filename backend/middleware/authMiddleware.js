const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    const authHeader = req.header('Authorization');

    let token =
        req.cookies?.vibz_token ||
        (
            authHeader?.startsWith('Bearer ')
                ? authHeader.split(' ')[1]
                : req.header('x-auth-token')
        );

    if (token) {
        token = token.replace(/"/g, '');
    }

    // Caso a rota seja /auth/me, a ausência de autenticação
    // significa simplesmente que o usuário não está logado.
    if (!token) {
        if (req.path === '/me' || req.originalUrl.includes('/auth/me')) {
            return res.status(200).json({
                logado: false,
                user: null
            });
        }

        return res.status(401).json({
            msg: 'Nenhum token, autorização negada.'
        });
    }

    try {
        const secret = process.env.JWT_SECRET;
        
        // Proteção CRÍTICA: Se estiver em produção e não houver secret, derruba a requisição para evitar forja de tokens.
        if (!secret && process.env.NODE_ENV === 'production') {
            console.error("FATAL ERROR: JWT_SECRET não definido em produção.");
            return res.status(500).json({ msg: 'Erro interno de configuração do servidor.' });
        }

        const decoded = jwt.verify(token, secret || 'secret_temporario_vibz');
        
        if (decoded.id) {
            req.user = { id: decoded.id };
        } else if (decoded.user && decoded.user.id) {
            req.user = { id: decoded.user.id };
        } else {
            if (req.originalUrl && req.originalUrl.includes('/auth/me')) {
                return res.status(200).json({ logado: false, user: null });
            }
            return res.status(401).json({ msg: 'Token inválido.' });
        }
        
        next();

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            if (req.path === '/me' || req.originalUrl.includes('/auth/me')) {
                return res.status(200).json({
                    logado: false,
                    user: null
                });
            }

            return res.status(401).json({
                msg: 'Sessão expirada.'
            });
        }

        if (req.path === '/me' || req.originalUrl.includes('/auth/me')) {
            return res.status(200).json({
                logado: false,
                user: null
            });
        }

        return res.status(401).json({
            msg: 'Token não é válido.'
        });
    }
};

module.exports = protect;