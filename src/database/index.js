// Database factory - automatically chooses between SQLite and PostgreSQL
const Database = require('./database');
const PostgresDatabase = require('./postgresDatabase');

function createDatabase() {
    // Use PostgreSQL only if DATABASE_URL is explicitly set
    if (process.env.DATABASE_URL) {
        console.log('🐘 Using PostgreSQL database');
        return new PostgresDatabase();
    } else {
        console.log('🗄️ Using SQLite database (fallback)');
        return new Database();
    }
}

module.exports = createDatabase;