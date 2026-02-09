const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    const authHeader = req.header('Authorization');
    let token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.split(' ')[1] 
        : req.header('x-auth-token');

    if (token) {
        token = token.replace(/"/g, '');
    }

    if (!token) {
        return res.status(401).json({ msg: 'Nenhum token, autorização negada.' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.id) {
            req.user = { id: decoded.id };
        } else if (decoded.user && decoded.user.id) {
            req.user = { id: decoded.user.id };
        } else {
            return res.status(401).json({ msg: 'Token inválido.' });
        }
        
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token não é válido.' });
    }
};

module.exports = protect;