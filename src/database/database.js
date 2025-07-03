const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        const dbPath = path.join(__dirname, '../../data/users.db');
        
        // Create data directory if it doesn't exist
        const fs = require('fs');
        const dataDir = path.dirname(dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.db = new sqlite3.Database(dbPath);
        this.createTables();
    }

    createTables() {
        const userTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const tokensTable = `
            CREATE TABLE IF NOT EXISTS user_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                google_client_id TEXT,
                google_client_secret TEXT,
                google_refresh_token TEXT,
                google_drive_folder_id TEXT,
                openai_api_key TEXT,
                custom_gpt_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;

        this.db.run(userTable);
        this.db.run(tokensTable);
    }

    async createUser(email, password, name) {
        return new Promise((resolve, reject) => {
            const hashedPassword = bcrypt.hashSync(password, 10);
            
            this.db.run(
                'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
                [email, hashedPassword, name],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    async getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE email = ?',
                [email],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    async getUserById(id) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE id = ?',
                [id],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    async verifyPassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }

    async saveUserTokens(userId, tokens) {
        return new Promise((resolve, reject) => {
            const {
                google_client_id,
                google_client_secret,
                google_refresh_token,
                google_drive_folder_id,
                openai_api_key,
                custom_gpt_id
            } = tokens;

            this.db.run(
                `INSERT OR REPLACE INTO user_tokens 
                (user_id, google_client_id, google_client_secret, google_refresh_token, 
                 google_drive_folder_id, openai_api_key, custom_gpt_id, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [userId, google_client_id, google_client_secret, google_refresh_token, 
                 google_drive_folder_id, openai_api_key, custom_gpt_id],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    async getUserTokens(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM user_tokens WHERE user_id = ?',
                [userId],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = Database;