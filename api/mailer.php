<?php
// =========================================================================
// CamHost.space — Enterprise SMTP Mailer Engine
// Sender: noreply@camhost.space · Reply-To: support@camhost.space
// Host: smtp.hostinger.com · Developer: PEAK BROSMAO · peakbrosmao.me
// =========================================================================

require_once __DIR__ . '/config.php';

/**
 * Fetch current effective SMTP configuration.
 * Precedence: Database system_settings (Admin Panel) > .env / constants > defaults.
 */
function getSmtpConfig(): array {
    $dbSettings = [];
    try {
        if (function_exists('db')) {
            $stmt = db()->query("SELECT key, value FROM system_settings WHERE key LIKE 'smtp_%'");
            if ($stmt) {
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $dbSettings[$row['key']] = $row['value'];
                }
            }
        }
    } catch (Throwable $e) {}

    $host     = !empty($dbSettings['smtp_host']) ? trim($dbSettings['smtp_host']) : (defined('SMTP_HOST') && SMTP_HOST ? SMTP_HOST : env('SMTP_HOST', 'smtp.hostinger.com'));
    $port     = !empty($dbSettings['smtp_port']) ? (int)$dbSettings['smtp_port'] : (defined('SMTP_PORT') && SMTP_PORT ? (int)SMTP_PORT : (int)env('SMTP_PORT', 465));
    $secure   = !empty($dbSettings['smtp_encryption']) ? trim($dbSettings['smtp_encryption']) : (defined('SMTP_SECURE') && SMTP_SECURE ? SMTP_SECURE : env('SMTP_SECURE', 'ssl'));
    $user     = !empty($dbSettings['smtp_user']) ? trim($dbSettings['smtp_user']) : (defined('SMTP_USER') && SMTP_USER ? SMTP_USER : env('SMTP_USER', 'noreply@camhost.space'));
    $pass     = !empty($dbSettings['smtp_pass']) ? trim($dbSettings['smtp_pass']) : (defined('SMTP_PASS') && SMTP_PASS ? SMTP_PASS : env('SMTP_PASS', ''));
    $from     = !empty($dbSettings['smtp_from']) ? trim($dbSettings['smtp_from']) : (defined('SMTP_FROM') && SMTP_FROM ? SMTP_FROM : env('SMTP_FROM', 'noreply@camhost.space'));
    $fromName = !empty($dbSettings['smtp_from_name']) ? trim($dbSettings['smtp_from_name']) : (defined('SMTP_FROM_NAME') && SMTP_FROM_NAME ? SMTP_FROM_NAME : env('SMTP_FROM_NAME', 'CamHost.space'));
    $replyTo  = !empty($dbSettings['smtp_reply_to']) ? trim($dbSettings['smtp_reply_to']) : (defined('SMTP_REPLY_TO') && SMTP_REPLY_TO ? SMTP_REPLY_TO : env('SMTP_REPLY_TO', 'support@camhost.space'));

    return [
        'host'      => $host,
        'port'      => $port,
        'secure'    => strtolower($secure),
        'user'      => $user,
        'pass'      => $pass,
        'from'      => $from,
        'from_name' => $fromName,
        'reply_to'  => $replyTo,
    ];
}

/**
 * Dispatch an account verification / activation email.
 */
function sendActivationEmail(string $recipientEmail, string $activationUrl): array {
    $subject = 'Activate Your CamHost.space Account';

    $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activate Your Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background: #131b2e; border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Header Branding -->
          <tr>
            <td style="padding: 36px 40px 20px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <div style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                CamHost<span style="color: #00d4ff;">.space</span>
              </div>
              <div style="font-size: 13px; color: #94a3b8; margin-top: 4px; letter-spacing: 0.05em; text-transform: uppercase;">
                Private Cloud Storage
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 40px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 16px;">
                Verify Your Account
              </h1>
              <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin: 0 0 24px;">
                Welcome to CamHost.space! To activate your account and start uploading files directly to your private cloud, please verify your email address by clicking the button below:
              </p>

              <!-- Action Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="{$activationUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #00d4ff 0%, #0077ff 100%); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 34px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0, 119, 255, 0.35);">
                      Activate My Account
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; line-height: 1.5; color: #94a3b8; margin: 24px 0 0;">
                This link will securely expire in <strong>24 hours</strong>.<br>
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <p style="font-size: 12px; color: #00d4ff; word-break: break-all; margin: 8px 0 0; font-family: monospace;">
                <a href="{$activationUrl}" target="_blank" style="color: #00d4ff; text-decoration: underline;">{$activationUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
              Sent by CamHost.space System Alert (<span style="color: #94a3b8;">noreply@camhost.space</span>)<br>
              Replies to this email are directed to <a href="mailto:support@camhost.space" style="color: #00d4ff; text-decoration: none;">support@camhost.space</a>.<br>
              If you did not register for an account on CamHost.space, you can safely ignore this email.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;

    $text = "Welcome to CamHost.space!\n\n"
          . "Please verify your email address by opening the following link in your browser:\n"
          . "{$activationUrl}\n\n"
          . "This link will expire in 24 hours.\n\n"
          . "CamHost.space System Alert (noreply@camhost.space)\n"
          . "For assistance, reply or contact support@camhost.space";

    return sendSmtpEmail($recipientEmail, $subject, $html, $text);
}

/**
 * Pure PHP SMTP Client connecting to Hostinger or custom SMTP.
 * Default Host: smtp.hostinger.com, Port: 465 (SSL)
 */
function sendSmtpEmail(string $to, string $subject, string $htmlBody, string $textBody = '', ?array $overrideConfig = null): array {
    $cfg = array_merge(getSmtpConfig(), $overrideConfig ?: []);

    $host     = $cfg['host'];
    $port     = (int)$cfg['port'];
    $secure   = strtolower($cfg['secure']);
    $user     = $cfg['user'];
    $pass     = $cfg['pass'];
    $from     = $cfg['from'];
    $fromName = $cfg['from_name'];
    $replyTo  = $cfg['reply_to'] ?: 'support@camhost.space';

    // If password is not configured in .env or database
    if (empty($pass)) {
        $msg = "SMTP password is not configured. Please enter your SMTP password for '{$user}' in api/.env or in Admin Panel > Settings > SMTP.";
        error_log("[CamHost Mailer Notice] " . $msg);

        // Try PHP mail() fallback
        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$fromName} <{$from}>\r\n";
        $headers .= "Reply-To: CamHost Support <{$replyTo}>\r\n";
        $headers .= "X-Mailer: CamHost-System/1.0\r\n";

        $sent = @mail($to, $subject, $htmlBody, $headers);
        return [
            'sent'          => (bool)$sent,
            'smtp_active'   => false,
            'error'         => $msg,
            'message'       => (bool)$sent ? 'Sent via server mail() fallback' : $msg,
        ];
    }

    $isSsl = ($secure === 'ssl' || $port === 465);
    $socketPrefix = $isSsl ? 'ssl://' : 'tcp://';
    $remoteAddress = $socketPrefix . $host . ':' . $port;

    $ctx = stream_context_create([
        'ssl' => [
            'verify_peer'       => false,
            'verify_peer_name'  => false,
            'allow_self_signed' => true,
        ]
    ]);

    $socket = @stream_socket_client($remoteAddress, $errno, $errstr, 12, STREAM_CLIENT_CONNECT, $ctx);
    if (!$socket) {
        $errorMsg = "Cannot connect to SMTP server ({$remoteAddress}): {$errstr} ({$errno})";
        error_log("[CamHost SMTP Error] " . $errorMsg);
        return ['sent' => false, 'error' => $errorMsg];
    }

    stream_set_timeout($socket, 15);

    // Read initial 220 banner
    $res = readSmtp($socket);
    if (!str_starts_with($res, '220')) {
        fclose($socket);
        return ['sent' => false, 'error' => "Unexpected banner from SMTP server: {$res}"];
    }

    $heloDomain = parse_url(FRONTEND_URL, PHP_URL_HOST) ?: 'camhost.space';

    // EHLO
    sendCmd($socket, "EHLO " . $heloDomain);
    $res = readSmtp($socket);

    // STARTTLS if TLS mode on port 587 or encryption requested
    if (!$isSsl && ($port === 587 || $secure === 'tls')) {
        sendCmd($socket, "STARTTLS");
        $res = readSmtp($socket);
        if (!str_starts_with($res, '220')) {
            fclose($socket);
            return ['sent' => false, 'error' => "STARTTLS rejected: {$res}"];
        }

        $cryptoMethod = STREAM_CRYPTO_METHOD_TLS_CLIENT;
        if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
        if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;

        $cryptoOk = stream_socket_enable_crypto($socket, true, $cryptoMethod);
        if (!$cryptoOk) {
            fclose($socket);
            return ['sent' => false, 'error' => 'TLS encryption handshake failed'];
        }

        sendCmd($socket, "EHLO " . $heloDomain);
        readSmtp($socket);
    }

    // AUTH LOGIN
    sendCmd($socket, "AUTH LOGIN");
    $res = readSmtp($socket);
    if (!str_starts_with($res, '334')) {
        fclose($socket);
        return ['sent' => false, 'error' => "AUTH LOGIN rejected: {$res}"];
    }

    // Send Username
    sendCmd($socket, base64_encode($user));
    $res = readSmtp($socket);
    if (!str_starts_with($res, '334')) {
        fclose($socket);
        return ['sent' => false, 'error' => "SMTP username rejected: {$res}"];
    }

    // Send Password
    sendCmd($socket, base64_encode($pass));
    $res = readSmtp($socket);
    if (!str_starts_with($res, '235')) {
        fclose($socket);
        return ['sent' => false, 'error' => "SMTP Authentication failed for '{$user}': {$res}"];
    }

    // MAIL FROM
    sendCmd($socket, "MAIL FROM:<{$from}>");
    $res = readSmtp($socket);
    if (!str_starts_with($res, '250')) {
        fclose($socket);
        return ['sent' => false, 'error' => "MAIL FROM rejected for <{$from}>: {$res}"];
    }

    // RCPT TO
    sendCmd($socket, "RCPT TO:<{$to}>");
    $res = readSmtp($socket);
    if (!str_starts_with($res, '250')) {
        fclose($socket);
        return ['sent' => false, 'error' => "RCPT TO rejected for <{$to}>: {$res}"];
    }

    // DATA
    sendCmd($socket, "DATA");
    $res = readSmtp($socket);
    if (!str_starts_with($res, '354')) {
        fclose($socket);
        return ['sent' => false, 'error' => "DATA rejected: {$res}"];
    }

    // Build MIME message with From: noreply and Reply-To: support
    $boundary = "----=_Part_" . bin2hex(random_bytes(16));
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $messageId = '<' . time() . '.' . bin2hex(random_bytes(8)) . '@camhost.space>';
    $date = date('r');

    $headers  = "Date: {$date}\r\n";
    $headers .= "From: {$fromName} <{$from}>\r\n";
    $headers .= "Reply-To: CamHost Support <{$replyTo}>\r\n";
    $headers .= "To: <{$to}>\r\n";
    $headers .= "Subject: {$encodedSubject}\r\n";
    $headers .= "Message-ID: {$messageId}\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Auto-Submitted: auto-generated\r\n";
    $headers .= "X-Mailer: CamHost-System/1.0\r\n";
    $headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n\r\n";

    $body  = "--{$boundary}\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $plainText = !empty($textBody) ? $textBody : strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>'], "\n", $htmlBody));
    $body .= chunk_split(base64_encode($plainText)) . "\r\n";

    $body .= "--{$boundary}\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($htmlBody)) . "\r\n";
    $body .= "--{$boundary}--\r\n";

    $payload = $headers . $body . ".\r\n";
    fwrite($socket, $payload);

    $res = readSmtp($socket);
    sendCmd($socket, "QUIT");
    fclose($socket);

    $success = str_starts_with($res, '250');
    return [
        'sent'        => $success,
        'smtp_active' => true,
        'message'     => $success ? "Email successfully delivered via SMTP ({$from} -> {$to})." : "Delivery notice: {$res}",
        'error'       => $success ? null : "Server did not accept message: {$res}",
    ];
}

/**
 * Send raw command to SMTP socket.
 */
function sendCmd($socket, string $cmd): void {
    fwrite($socket, $cmd . "\r\n");
}

/**
 * Read multi-line response from SMTP server.
 */
function readSmtp($socket): string {
    $response = '';
    while (!feof($socket)) {
        $line = fgets($socket, 1024);
        if ($line === false) break;
        $response .= $line;
        // In SMTP, 4th char is a space on the final line of multi-line response (e.g. "250 OK" vs "250-SIZE")
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    return trim($response);
}
