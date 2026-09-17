<?php
// =============================================
// CamHost.space — SQLite Database Helper
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================

require_once __DIR__ . '/config.php';

/**
 * Returns a singleton PDO SQLite connection.
 * Tables are auto-created on first run.
 */
function db(): PDO {
    static $pdo = null;

    if ($pdo !== null) return $pdo;

    $dbDir = dirname(DB_PATH);
    if (!is_dir($dbDir)) {
        mkdir($dbDir, 0755, true);
    }

    $pdo = new PDO('sqlite:' . DB_PATH);
    $pdo->setAttribute(PDO::ATTR_ERRMODE,            PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Enable WAL mode for better concurrency
    $pdo->exec('PRAGMA journal_mode=WAL');
    $pdo->exec('PRAGMA foreign_keys=ON');

    migrate($pdo);

    return $pdo;
}

/**
 * Run database migrations / create tables if they don't exist.
 */
function migrate(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            email        TEXT    NOT NULL UNIQUE,
            password     TEXT    NOT NULL,
            role         TEXT    NOT NULL DEFAULT 'user',
            created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS folders (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name       TEXT    NOT NULL,
            created_at TEXT    NOT NULL DEFAULT (datetime('now')),
            UNIQUE(user_id, name)
        );

        CREATE TABLE IF NOT EXISTS files (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            folder_id        INTEGER REFERENCES folders(id) ON DELETE SET NULL,
            original_name    TEXT    NOT NULL,
            mime_type        TEXT    NOT NULL DEFAULT 'application/octet-stream',
            size_bytes       INTEGER NOT NULL DEFAULT 0,
            telegram_file_id TEXT    NOT NULL,
            message_id       INTEGER,
            description      TEXT,
            created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS signups (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            email      TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    ");

    // Add columns to existing deployments (no-op if columns already exist)
    try { $pdo->exec('ALTER TABLE files ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL'); } catch (Exception $e) {}
    try { $pdo->exec('ALTER TABLE files ADD COLUMN share_token TEXT'); } catch (Exception $e) {}
    try { $pdo->exec('ALTER TABLE files ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0'); } catch (Exception $e) {}
    try { $pdo->exec('ALTER TABLE users ADD COLUMN display_name TEXT'); } catch (Exception $e) {}

    // Seed default admin if no users exist yet
    seedAdmin($pdo);
}

/**
 * Create the default admin user on first boot.
 */
function seedAdmin(PDO $pdo): void {
    $count = $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ((int)$count > 0) return;

    $hash = password_hash(ADMIN_PASSWORD, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
    $stmt->execute([ADMIN_EMAIL, $hash, 'admin']);
}
