<?php
include 'components/connect.php';
session_start();

if (empty($_SESSION['pending_2fa_user'])) {
    header('Location: login.php');
    exit;
}

$user_id = $_SESSION['pending_2fa_user'];
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['code'])) {
    $code = $_POST['code'];
    $stmt = $conn->prepare("SELECT code, expires_at, used FROM user_2fa WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row && !$row['used'] && strtotime($row['expires_at']) > time()) {
        if (password_verify($code, $row['code'])) {
            // Mark code as used
            $conn->prepare("UPDATE user_2fa SET used = 1 WHERE user_id = ?")->execute([$user_id]);
            // Fully authenticate user
            $_SESSION['user_id'] = $user_id;
            setcookie('user_id', $user_id, time() + 60*60*24*30, '/');
            unset($_SESSION['pending_2fa_user']);
            header('Location: home.php');
            exit;
        } else {
            $error = 'Incorrect or expired verification code.';
        }
    } else {
        $error = 'Incorrect or expired verification code.';
    }
}
?>

<form method="post">
    <h3>Enter Verification Code</h3>
    <?php if ($error) echo '<div class="message">'.$error.'</div>'; ?>
    <input type="text" name="code" required placeholder="Enter code from email">
    <button type="submit">Verify Code</button>
</form>
<form method="post" action="2fa.php">
    <button type="submit" name="resend">Resend Code</button>
</form>
