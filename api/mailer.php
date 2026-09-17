<?php
// ==========================================================
// CamHost.space — Hostinger SMTP Mailer Engine
// Sender: support@camhost.space · Host: smtp.hostinger.com
// Developer: PEAK BROSMAO · peakbrosmao.me
// ==========================================================

require_once __DIR__ . '/config.php';

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
            <td style="padding: 24px 40px; background-color: rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
              Sent by CamHost.space System (<a href="mailto:support@camhost.space" style="color: #94a3b8; text-decoration: none;">support@camhost.space</a>)<br>
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
          . "CamHost.space Support (support@camhost.space)";

    return sendSmtpEmail($recipientEmail, $subject, $html, $text);
}

/**
 * Pure PHP SMTP Client connecting to Hostinger SMTP.
 * Default Host: smtp.hostinger.com, Port: 465 (SSL)
 */
function sendSmtpEmail(string $to, string $subject, string $htmlBody, string $textBody = ''): array {
    $host   = SMTP_HOST;
    $port   = SMTP_PORT;
    $user   = SMTP_USER;
    $pass   = SMTP_PASS;
    $from   = SMTP_FROM;
    $fromName = SMTP_FROM_NAME;

    // If password is not yet entered in .env, log and return graceful fallback
    if (empty($pass)) {
        error_log('[CamHost Mailer Notice] SMTP_PASS is empty in api/.env. Please configure SMTP_PASS with the password for ' . $user);
        
        // Try system mail() as fallback
        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$fromName} <{$from}>\r\n";
        $headers .= "Reply-To: {$from}\r\n";
        $headers .= "X-Mailer: CamHost-System/1.0\r\n";
        
        $sent = @mail($to, $subject, $htmlBody, $headers);
        return [
            'sent'          => (bool)$sent,
            'smtp_active'   => false,
            'message'       => 'SMTP_PASS not configured in .env; fallback mail() called',
        ];
    }

    $socketPrefix = (SMTP_SECURE === 'ssl' || $port === 465) ? 'ssl://' : '';
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
        error_log("[CamHost SMTP Error] Connection failed: {$errstr} ({$errno})");
        return ['sent' => false, 'error' => "Cannot connect to SMTP server: {$errstr}"];
    }

    stream_set_timeout($socket, 10);

    // Read banner
    $res = readSmtp($socket);
    if (!str_starts_with($res, '220')) {
        fclose($socket);
        return ['sent' => false, 'error' => "Unexpected banner: {$res}"];
    }

    // EHLO
    sendCmd($socket, "EHLO camhost.space");
    $res = readSmtp($socket);

    // STARTTLS if TLS mode on port 587
    if ($port === 587 && SMTP_SECURE === 'tls') {
        sendCmd($socket, "STARTTLS");
        $res = readSmtp($socket);
        if (!str_starts_with($res, '220')) {
            fclose($socket);
            return ['sent' => false, 'error' => "STARTTLS rejected: {$res}"];
        }
        stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        sendCmd($socket, "EHLO camhost.space");
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
        return ['sent' => false, 'error' => "Username rejected: {$res}"];
    }

    // Send Password
    sendCmd($socket, base64_encode($pass));
    $res = readSmtp($socket);
    if (!str_starts_with($res, '235')) {
        fclose($socket);
        return ['sent' => false, 'error' => "SMTP Authentication failed: {$res}"];
    }

    // MAIL FROM
    sendCmd($socket, "MAIL FROM:<{$from}>");
    $res = readSmtp($socket);
    if (!str_starts_with($res, '250')) {
        fclose($socket);
        return ['sent' => false, 'error' => "MAIL FROM rejected: {$res}"];
    }

    // RCPT TO
    sendCmd($socket, "RCPT TO:<{$to}>");
    $res = readSmtp($socket);
    if (!str_starts_with($res, '250')) {
        fclose($socket);
        return ['sent' => false, 'error' => "RCPT TO rejected: {$res}"];
    }

    // DATA
    sendCmd($socket, "DATA");
    $res = readSmtp($socket);
    if (!str_starts_with($res, '354')) {
        fclose($socket);
        return ['sent' => false, 'error' => "DATA rejected: {$res}"];
    }

    // Build MIME message
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $messageId = '<' . time() . '.' . bin2hex(random_bytes(8)) . '@camhost.space>';
    $date = date('r');

    $headers  = "Date: {$date}\r\n";
    $headers .= "From: {$fromName} <{$from}>\r\n";
    $headers .= "To: <{$to}>\r\n";
    $headers .= "Subject: {$encodedSubject}\r\n";
    $headers .= "Message-ID: {$messageId}\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "Content-Transfer-Encoding: base64\r\n";
    $headers .= "X-Mailer: CamHost-System/1.0\r\n\r\n";

    $payload = $headers . chunk_split(base64_encode($htmlBody)) . "\r\n.\r\n";
    fwrite($socket, $payload);

    $res = readSmtp($socket);
    sendCmd($socket, "QUIT");
    fclose($socket);

    $success = str_starts_with($res, '250');
    return [
        'sent'    => $success,
        'message' => $success ? 'Verification email successfully sent via Hostinger SMTP.' : "Delivery notice: {$res}",
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
        // In SMTP, line 4th char is a space when it's the final line of multi-line response (e.g. "250 OK" vs "250-SIZE")
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    return trim($response);
}
