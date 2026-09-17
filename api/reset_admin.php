<?php
// ========================================================
// CamHost.space — Admin Password Reset Utility
// Developer: PEAK BROSMAO · peakbrosmao.me
//
// 1. CLI Usage:
//    php api/reset_admin.php [new_password] [admin_email]
//
// 2. Browser Usage (Protected by JWT_SECRET in .env):
//    https://api.camhost.space/reset_admin.php?key=YOUR_JWT_SECRET&password=NEW_PASSWORD
// ========================================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$isCli = (php_sapi_name() === 'cli');

// Determine parameters
if ($isCli) {
    $newPassword = $argv[1] ?? ADMIN_PASSWORD;
    $adminEmail  = $argv[2] ?? ADMIN_EMAIL;
} else {
    header('Content-Type: text/html; charset=UTF-8');
    $providedKey = trim($_GET['key'] ?? '');
    $newPassword = trim($_GET['password'] ?? $_GET['pass'] ?? ADMIN_PASSWORD);
    $adminEmail  = trim($_GET['email'] ?? ADMIN_EMAIL);

    // Security check: Must supply JWT_SECRET from .env to prevent unauthorized browser access
    if (empty($providedKey) || $providedKey !== JWT_SECRET) {
        http_response_code(403);
        echo "<h2>403 Forbidden</h2><p>Invalid or missing security key. You must provide <code>?key=YOUR_JWT_SECRET</code> from your .env file to reset the password.</p>";
        exit;
    }
}

if (strlen($newPassword) < 8) {
    if ($isCli) {
        echo "Error: Password must be at least 8 characters.\n";
    } else {
        echo "<h3 style='color:red;'>Error: Password must be at least 8 characters.</h3>";
    }
    exit(1);
}

try {
    $pdo = db();
    $hash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);

    // Find admin user
    $stmt = $pdo->prepare('SELECT id, email FROM users WHERE email = ? OR role = "admin" ORDER BY CASE WHEN email = ? THEN 1 ELSE 2 END LIMIT 1');
    $stmt->execute([$adminEmail, $adminEmail]);
    $user = $stmt->fetch();

    if ($user) {
        $update = $pdo->prepare('
            UPDATE users 
            SET password = ?, email = ?, role = "admin", is_verified = 1, is_banned = 0, verification_token = NULL 
            WHERE id = ?
        ');
        $update->execute([$hash, $adminEmail, $user['id']]);
        $targetEmail = $adminEmail;
    } else {
        $insert = $pdo->prepare('INSERT INTO users (email, password, role, is_verified, is_banned) VALUES (?, ?, "admin", 1, 0)');
        $insert->execute([$adminEmail, $hash]);
        $targetEmail = $adminEmail;
    }

    if ($isCli) {
        echo "====================================================\n";
        echo "SUCCESS: Admin password has been updated!\n";
        echo "Email:    {$targetEmail}\n";
        echo "Password: {$newPassword}\n";
        echo "Role:     admin\n";
        echo "Status:   Verified & Active\n";
        echo "====================================================\n";
    } else {
        echo "<div style='font-family: system-ui, sans-serif; max-width: 500px; margin: 40px auto; padding: 24px; border: 1px solid #10b981; border-radius: 12px; background: #f0fdf4;'>";
        echo "<h2 style='color: #059669; margin-top: 0;'>Admin Password Reset Successfully!</h2>";
        echo "<p>Your administrator credentials have been updated in the database:</p>";
        echo "<ul>";
        echo "<li><strong>Email:</strong> " . htmlspecialchars($targetEmail) . "</li>";
        echo "<li><strong>Password:</strong> " . htmlspecialchars($newPassword) . "</li>";
        echo "<li><strong>Status:</strong> Verified & Active (Admin)</li>";
        echo "</ul>";
        echo "<p><a href='https://camhost.space/login' style='display: inline-block; background: #059669; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;'>Go to Sign In</a></p>";
        echo "<p style='font-size: 12px; color: #6b7280;'>For security, remember to remove or protect this file after resetting your password.</p>";
        echo "</div>";
    }
} catch (Exception $e) {
    if ($isCli) {
        echo "Database Error: " . $e->getMessage() . "\n";
    } else {
        echo "<h3 style='color:red;'>Database Error: " . htmlspecialchars($e->getMessage()) . "</h3>";
    }
    exit(1);
}
