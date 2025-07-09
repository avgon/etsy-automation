// Database factory - automatically chooses between SQLite and PostgreSQL
const Database = require('./database');
const PostgresDatabase = require('./postgresDatabase');

function createDatabase() {
    // Use PostgreSQL in production (Railway) or if DATABASE_URL is set
    if (process.env.DATABASE_URL || process.env.NODE_ENV === 'production') {
        console.log('🐘 Using PostgreSQL database');
        return new PostgresDatabase();
    } else {
        console.log('🗄️ Using SQLite database');
        return new Database();
    }
}

module.exports = createDatabase;