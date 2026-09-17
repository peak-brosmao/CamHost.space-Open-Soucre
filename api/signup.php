<?php
// =============================================
// CamHost.space — Email Signup Handler
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

/**
 * POST /api/signup
 * Body (JSON or form): { email }
 * Saves email to SQLite signups table.
 * Returns: { success: true, message: '...' }
 *
 * GET /api/signup  (admin only — list all signups)
 */
function handleSignup(string $method): void {
    if ($method === 'GET') {
        handleListSignups();
        return;
    }

    // Parse body (supports both JSON and form-encoded)
    $body  = json_decode(file_get_contents('php://input'), true);
    $email = trim($body['email'] ?? $_POST['email'] ?? '');

    if (!$email) {
        jsonError('Email address is required', 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('Invalid email address format', 422);
    }

    try {
        $stmt = db()->prepare('INSERT INTO signups (email) VALUES (?)');
        $stmt->execute([$email]);

        jsonSuccess(['message' => "You're on the list! We'll notify you at launch."]);

    } catch (PDOException $e) {
        // UNIQUE constraint — email already registered
        if (str_contains($e->getMessage(), 'UNIQUE')) {
            // Return success anyway (don't leak that email exists)
            jsonSuccess(['message' => "You're already on the list! We'll notify you at launch."]);
        }
        throw $e;
    }
}

/**
 * GET /api/signup — admin endpoint to view all signups (JWT required)
 */
function handleListSignups(): void {
    require_once __DIR__ . '/auth.php';
    requireAdmin();

    $stmt = db()->query('SELECT id, email, created_at FROM signups ORDER BY created_at DESC');
    $rows = $stmt->fetchAll();

    jsonSuccess([
        'signups' => $rows,
        'total'   => count($rows),
    ]);
}
