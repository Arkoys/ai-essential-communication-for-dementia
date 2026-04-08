import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: path.join(process.cwd(), 'database.sqlite'),
    driver: sqlite3.Database
  });

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      userId TEXT,
      title TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversationId TEXT,
      role TEXT,
      content TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id TEXT PRIMARY KEY,
      source TEXT,
      content TEXT,
      embedding TEXT
    );

    CREATE TABLE IF NOT EXISTS rag_config (
      id TEXT PRIMARY KEY,
      topK INTEGER,
      similarityThreshold REAL
    );
  `);

  // Initialize default RAG config if not exists
  const config = await dbInstance.get('SELECT * FROM rag_config WHERE id = ?', ['default']);
  if (!config) {
    await dbInstance.run(
      'INSERT INTO rag_config (id, topK, similarityThreshold) VALUES (?, ?, ?)',
      ['default', 3, 0.7]
    );
  }

  return dbInstance;
}
