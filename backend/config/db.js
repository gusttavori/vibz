const mongoose = require('mongoose');
require('dotenv').config(); // Carrega as variáveis de ambiente

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // useNewUrlParser: true, // Deprecated in recent Mongoose versions
            // useUnifiedTopology: true, // Deprecated in recent Mongoose versions
            // useCreateIndex: true, // Deprecated in recent Mongoose versions
            // useFindAndModify: false // Deprecated in recent Mongoose versions
        });
        console.log(`MongoDB Conectado: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Erro na conexão com o MongoDB: ${error.message}`);
        process.exit(1); // Sai do processo com falha
    }
};

module.exports = connectDB;