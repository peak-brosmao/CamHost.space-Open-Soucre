<?php
// =============================================
// CamHost.space — JWT Authentication Helper
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================
// Lightweight HS256 JWT without external libraries.

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

// ── JWT Utilities ──────────────────────────────────────────────

/**
 * Create a JWT token for a user (expires in 7 days).
 */
function jwt_create(array $payload): string {
    $header  = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = time();
    $payload['exp'] = time() + 60 * 60 * 24 * 7; // 7 days
    $body    = base64url_encode(json_encode($payload));
    $sig     = base64url_encode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    return "$header.$body.$sig";
}

/**
 * Verify and decode a JWT token. Returns payload array or null on failure.
 */
function jwt_verify(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $body, $sig] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));

    // Constant-time comparison to prevent timing attacks
    if (!hash_equals($expected, $sig)) return null;

    $payload = json_decode(base64url_decode($body), true);
    if (!$payload || $payload['exp'] < time()) return null;

    return $payload;
}

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}

// ── Auth Middleware ──────────────────────────────────────────────

/**
 * Require a valid JWT from Authorization header.
 * Returns the user row from DB, or sends 401 and exits.
 */
function requireAuth(): array {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$auth) {
        // Also check query param for download links
        $auth = 'Bearer ' . ($_GET['token'] ?? '');
    }

    if (!preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
        jsonError('Unauthorized — no token provided', 401);
    }

    $payload = jwt_verify($m[1]);
    if (!$payload) {
        jsonError('Unauthorized — invalid or expired token', 401);
    }

    $user = db()->prepare('SELECT * FROM users WHERE id = ?');
    $user->execute([$payload['sub']]);
    $user = $user->fetch();

    if (!$user) {
        jsonError('Unauthorized — user not found', 401);
    }

    return $user;
}

// ── Route Handlers ──────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, user }
 */
function handleLogin(): void {
    $body = json_decode(file_get_contents('php://input'), true);
    $email    = trim($body['email']    ?? '');
    $password = trim($body['password'] ?? '');

    if (!$email || !$password) {
        jsonError('Email and password are required', 400);
    }

    $stmt = db()->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        jsonError('Invalid email or password', 401);
    }

    $token = jwt_create(['sub' => $user['id'], 'email' => $user['email'], 'role' => $user['role']]);

    jsonSuccess([
        'token' => $token,
        'user'  => [
            'id'    => $user['id'],
            'email' => $user['email'],
            'role'  => $user['role'],
        ],
    ]);
}

/**
 * Require admin role.
 */
function requireAdmin(): array {
    $user = requireAuth();
    if (($user['role'] ?? '') !== 'admin') {
        jsonError('Forbidden: Administrator access required', 403);
    }
    return $user;
}

/**
 * GET /api/auth/me — verify token and return user info
 */
function handleMe(): void {
    $user = requireAuth();
    jsonSuccess([
        'id'           => $user['id'],
        'email'        => $user['email'],
        'display_name' => $user['display_name'] ?? '',
        'role'         => $user['role'],
        'created_at'   => $user['created_at'],
    ]);
}

/**
 * PUT /api/auth/profile — update display name / profile info
 */
function handleUpdateProfile(): void {
    $user = requireAuth();
    $body = json_decode(file_get_contents('php://input'), true);
    $displayName = trim($body['display_name'] ?? '');
    $email       = trim($body['email'] ?? '');

    if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('Invalid email address', 422);
    }

    try {
        $stmt = db()->prepare('UPDATE users SET display_name = ?, email = COALESCE(NULLIF(?, ""), email) WHERE id = ?');
        $stmt->execute([$displayName, $email, $user['id']]);

        $updated = db()->prepare('SELECT id, email, display_name, role, created_at FROM users WHERE id = ?');
        $updated->execute([$user['id']]);
        $userRow = $updated->fetch();

        jsonSuccess([
            'user'    => $userRow,
            'message' => 'Profile updated successfully',
        ]);
    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'UNIQUE')) {
            jsonError('This email is already in use by another account', 409);
        }
        throw $e;
    }
}

/**
 * POST /api/auth/change-password
 * Body: { current_password, new_password }
 */
function handleChangePassword(): void {
    $user = requireAuth();
    $body = json_decode(file_get_contents('php://input'), true);
    $current = $body['current_password'] ?? '';
    $new     = $body['new_password']     ?? '';

    if (!$current || !$new) {
        jsonError('current_password and new_password are required', 400);
    }
    if (strlen($new) < 8) {
        jsonError('New password must be at least 8 characters', 400);
    }
    if (!password_verify($current, $user['password'])) {
        jsonError('Current password is incorrect', 401);
    }

    $hash = password_hash($new, PASSWORD_BCRYPT);
    $stmt = db()->prepare('UPDATE users SET password = ? WHERE id = ?');
    $stmt->execute([$hash, $user['id']]);

    jsonSuccess(['message' => 'Password updated successfully']);
}

/**
 * POST /auth/register
 * Body: { email, password, confirm_password }
 * Creates a new user account (role = 'user').
 */
function handleRegister(): void {
    $body     = json_decode(file_get_contents('php://input'), true);
    $email    = trim($body['email']            ?? '');
    $password = trim($body['password']         ?? '');
    $confirm  = trim($body['confirm_password'] ?? '');

    if (!$email || !$password) jsonError('Email and password are required', 400);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError('Invalid email address', 422);
    if (strlen($password) < 8) jsonError('Password must be at least 8 characters', 400);
    if ($password !== $confirm) jsonError('Passwords do not match', 400);

    try {
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = db()->prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
        $stmt->execute([$email, $hash, 'user']);
        $newId = (int)db()->lastInsertId();

        $token = jwt_create(['sub' => $newId, 'email' => $email, 'role' => 'user']);

        jsonSuccess([
            'token' => $token,
            'user'  => ['id' => $newId, 'email' => $email, 'role' => 'user'],
            'message' => 'Account created successfully',
        ], 201);
    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'UNIQUE')) {
            jsonError('An account with this email already exists', 409);
        }
        throw $e;
    }
}
