const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

const initializeTables = async () => {
    const createStudentMetadataTable = `
        CREATE TABLE IF NOT EXISTS student_metadata (
            npm VARCHAR(10) PRIMARY KEY,
            name TEXT NOT NULL
        );
    `;

    const createRegisteredStudentTable = `
        CREATE TABLE IF NOT EXISTS registered_student (
            npm VARCHAR(10) PRIMARY KEY,
            name TEXT NOT NULL,
            password TEXT NOT NULL,
            public_key TEXT NOT NULL,
            voting_status BOOLEAN DEFAULT FALSE,
            is_verified BOOLEAN DEFAULT FALSE,
            photo_ktm TEXT
        );
    `;

    const insertDummyDataQuery = `
        INSERT INTO student_metadata (npm, name)
        VALUES 
            ('2106707870', 'Lauren Christy Tanudjaja'),
            ('2106704894', 'Juan Jonathan'),
            ('2106708463', 'Bernanda Nautval Rai'),
            ('2106638406', 'Eriqo Arief Wicaksono')
        ON CONFLICT (npm) DO NOTHING;
    `;

    try {
        // Create tables if they don't exist
        await pool.query(createStudentMetadataTable);
        await pool.query(createRegisteredStudentTable);
        console.log("Tables created successfully or already exist.");

        // Insert dummy data if student_metadata table is empty
        await pool.query(insertDummyDataQuery);
        console.log("Dummy data inserted into student_metadata table if not already present.");
    } catch (error) {
        console.error("Error initializing database tables:", error);
    }
};

// Initialize tables and insert dummy data on startup
initializeTables();

module.exports = pool;
