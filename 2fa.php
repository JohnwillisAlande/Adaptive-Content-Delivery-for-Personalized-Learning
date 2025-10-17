<?php
include 'components/connect.php';
require 'vendor/autoload.php'; // PHPMailer
require 'send_mail.php';
session_start();

if (empty($_SESSION['pending_2fa_user'])) {
    header('Location: login.php');
    exit;
}

$user_id = $_SESSION['pending_2fa_user'];

// Generate code and store
$code = bin2hex(random_bytes(3)); // 6-char hex code
$expires = date('Y-m-d H:i:s', strtotime('+10 minutes'));
$hashed_code = password_hash($code, PASSWORD_DEFAULT);

// Upsert code
$stmt = $conn->prepare("REPLACE INTO user_2fa (user_id, code, expires_at, used) VALUES (?, ?, ?, 0)");
$stmt->execute([$user_id, $hashed_code, $expires]);

// Get user email
$stmt2 = $conn->prepare("SELECT email FROM users WHERE id = ?");
$stmt2->execute([$user_id]);
$user = $stmt2->fetch(PDO::FETCH_ASSOC);

// Send code via email
$mail = new PHPMailer\PHPMailer\PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = $_ENV['SMTP_USER'];
    $mail->Password = $_ENV['SMTP_PASS'];
    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;
    $mail->setFrom($_ENV['SMTP_USER'], 'ApexLearn');
    $mail->addAddress($user['email']);
    $mail->Subject = 'Your 2FA Verification Code';
    $mail->Body = "Your verification code is: $code\nThis code expires in 10 minutes.";
    $mail->send();
} catch (Exception $e) {
    error_log('2FA mail failed: ' . $mail->ErrorInfo);
}

$message = "We've sent a verification code to your email. Please enter it below.";
?>

<form method="post" action="2fa_verify.php">
    <h3>Two-Factor Authentication</h3>
    <p><?php echo $message; ?></p>
    <input type="text" name="code" required placeholder="Enter code from email">
    <button type="submit">Verify Code</button>
</form>
<form method="post" action="2fa.php">
    <button type="submit" name="resend">Resend Code</button>
</form>
