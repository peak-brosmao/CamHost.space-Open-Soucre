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

        CREATE TABLE IF NOT EXISTS rate_limits (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address   TEXT    NOT NULL,
            action       TEXT    NOT NULL,
            hits         INTEGER NOT NULL DEFAULT 1,
            window_start INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_rate_limits ON rate_limits(ip_address, action);

        CREATE TABLE IF NOT EXISTS system_settings (
            key        TEXT PRIMARY KEY,
            value      TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id    INTEGER,
            action      TEXT NOT NULL,
            target_type TEXT,
            target_id   TEXT,
            details     TEXT,
            ip_address  TEXT,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs ON audit_logs(created_at DESC);
    ");

    // Add columns to existing deployments (no-op if columns already exist)
    try { $pdo->exec('ALTER TABLE files ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL'); } catch (Exception $e) {}
    try { $pdo->exec('ALTER TABLE files ADD COLUMN share_token TEXT'); } catch (Exception $e) {}
    try { $pdo->exec('ALTER TABLE files ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0'); } catch (Exception $e) {}
    try { $pdo->exec('ALTER TABLE files ADD COLUMN downloads INTEGER NOT NULL DEFAULT 0'); } catch (Exception $e) {}
    try { $pdo->exec('ALTER TABLE files ADD COLUMN is_blocked INTEGER NOT NULL DEFAULT 0'); } catch (Exception $e) {}

    try { $pdo->exec('ALTER TABLE users ADD COLUMN display_name TEXT'); } catch (Exception $e) {}
    try { $pdo->exec('ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0'); } catch (Exception $e) {}
    try { $pdo->exec('ALTER TABLE users ADD COLUMN verification_token TEXT'); } catch (Exception $e) {}
    try { $pdo->exec('ALTER TABLE users ADD COLUMN verification_expires INTEGER'); } catch (Exception $e) {}
    try { $pdo->exec('ALTER TABLE users ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0'); } catch (Exception $e) {}
    try { $pdo->exec('ALTER TABLE users ADD COLUMN storage_quota INTEGER NOT NULL DEFAULT 10737418240'); } catch (Exception $e) {}
    try { $pdo->exec("UPDATE users SET is_verified = 1 WHERE role = 'admin'"); } catch (Exception $e) {}

    // Seed default admin and system settings
    seedAdmin($pdo);
    seedSettings($pdo);
}

/**
 * Create the default admin user on first boot.
 */
function seedAdmin(PDO $pdo): void {
    $count = $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ((int)$count > 0) return;

    $hash = password_hash(ADMIN_PASSWORD, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare('INSERT INTO users (email, password, role, is_verified) VALUES (?, ?, ?, 1)');
    $stmt->execute([ADMIN_EMAIL, $hash, 'admin']);
}

/**
 * Seed initial system configuration keys.
 */
function seedSettings(PDO $pdo): void {
    $defaults = [
        'site_name'                => 'CamHost.space',
        'site_description'         => 'High-speed cloud file storage & sharing platform powered by Telegram infrastructure.',
        'maintenance_mode'         => '0',
        'maintenance_message'      => 'CamHost.space is currently undergoing scheduled maintenance. We will be back online shortly.',
        'max_upload_size_mb'       => '2000',
        'allowed_extensions'       => 'zip,rar,tar,gz,7z,pdf,doc,docx,xls,xlsx,ppt,pptx,png,jpg,jpeg,gif,webp,mp4,mkv,mp3,wav,txt,json,csv,exe,msi,apk,dmg,iso',
        'default_storage_quota_mb' => '10240',
        'allow_guest_download'     => '1',
        'announcement_banner'      => '',
        'telegram_storage_enabled' => '1',
        'smtp_host'                => '',
        'smtp_port'                => '587',
        'smtp_user'                => '',
        'smtp_from'                => 'noreply@camhost.space',
    ];

    $check = $pdo->prepare('SELECT COUNT(*) FROM system_settings WHERE key = ?');
    $insert = $pdo->prepare('INSERT INTO system_settings (key, value) VALUES (?, ?)');

    foreach ($defaults as $k => $v) {
        $check->execute([$k]);
        if ((int)$check->fetchColumn() === 0) {
            $insert->execute([$k, $v]);
        }
    }
}
