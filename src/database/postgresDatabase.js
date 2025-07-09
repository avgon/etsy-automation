const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

class PostgresDatabase {
    constructor() {
        this.pool = null;
        this.init();
    }

    init() {
        // Railway PostgreSQL connection
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        this.createTables();
    }

    async createTables() {
        const userTable = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const tokensTable = `
            CREATE TABLE IF NOT EXISTS user_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                google_client_id TEXT,
                google_client_secret TEXT,
                google_refresh_token TEXT,
                google_drive_folder_id TEXT,
                openai_api_key TEXT,
                custom_gpt_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;

        try {
            await this.pool.query(userTable);
            await this.pool.query(tokensTable);
            console.log('✅ PostgreSQL tables created successfully');
        } catch (error) {
            console.error('❌ Error creating PostgreSQL tables:', error);
            throw error;
        }
    }

    async createUser(email, password, name) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        const query = 'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id';
        const values = [email, hashedPassword, name];
        
        try {
            const result = await this.pool.query(query, values);
            return result.rows[0].id;
        } catch (error) {
            throw error;
        }
    }

    async getUserByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const values = [email];
        
        try {
            const result = await this.pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    async getUserById(id) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const values = [id];
        
        try {
            const result = await this.pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    async verifyPassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }

    async saveUserTokens(userId, tokens) {
        const {
            google_client_id,
            google_client_secret,
            google_refresh_token,
            google_drive_folder_id,
            openai_api_key,
            custom_gpt_id
        } = tokens;

        const query = `
            INSERT INTO user_tokens 
            (user_id, google_client_id, google_client_secret, google_refresh_token, 
             google_drive_folder_id, openai_api_key, custom_gpt_id, updated_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE SET
                google_client_id = EXCLUDED.google_client_id,
                google_client_secret = EXCLUDED.google_client_secret,
                google_refresh_token = EXCLUDED.google_refresh_token,
                google_drive_folder_id = EXCLUDED.google_drive_folder_id,
                openai_api_key = EXCLUDED.openai_api_key,
                custom_gpt_id = EXCLUDED.custom_gpt_id,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
        `;

        const values = [userId, google_client_id, google_client_secret, google_refresh_token, 
                       google_drive_folder_id, openai_api_key, custom_gpt_id];
        
        try {
            // First, add unique constraint on user_id if it doesn't exist
            await this.pool.query(`
                ALTER TABLE user_tokens 
                ADD CONSTRAINT user_tokens_user_id_unique 
                UNIQUE (user_id)
            `).catch(() => {}); // Ignore error if constraint already exists
            
            const result = await this.pool.query(query, values);
            return result.rows[0].id;
        } catch (error) {
            throw error;
        }
    }

    async getUserTokens(userId) {
        const query = 'SELECT * FROM user_tokens WHERE user_id = $1';
        const values = [userId];
        
        try {
            const result = await this.pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
        }
    }
}

module.exports = PostgresDatabase;