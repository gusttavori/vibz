const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    // Busca o token primeiro no Cookie Seguro (Web). Se não achar, busca no Header (Mobile/Postman)
    const authHeader = req.header('Authorization');
    
    let token = req.cookies?.vibz_token || (authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.split(' ')[1] 
        : req.header('x-auth-token'));

    if (token) {
        token = token.replace(/"/g, '');
    }

    if (!token) {
        // SILENCIOSO: Se a rota for checagem de perfil, devolve 200 ao invés de 401
        if (req.originalUrl && req.originalUrl.includes('/auth/me')) {
            return res.status(200).json({ logado: false, user: null });
        }
        return res.status(401).json({ msg: 'Nenhum token, autorização negada.' });
    }
    
    try {
        const secret = process.env.JWT_SECRET || 'secret_temporario_vibz';
        const decoded = jwt.verify(token, secret);
        
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
        if (req.originalUrl && req.originalUrl.includes('/auth/me')) {
            return res.status(200).json({ logado: false, user: null });
        }
        res.status(401).json({ msg: 'Token não é válido ou expirou.' });
    }
};

module.exports = protect;