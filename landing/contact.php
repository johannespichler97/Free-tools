<?php
// Receives the demo-request form (JSON POST from index.html) and emails it.

const MAIL_TO   = 'info@market-analytics.io';
const MAIL_FROM = 'info@market-analytics.io';   // must be an address on this domain
const MAX_PER_HOUR = 5;                          // per IP address

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function reply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    reply(405, ['ok' => false, 'error' => 'Method not allowed']);
}

// Only accept submissions from this site's own pages.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== ($_SERVER['HTTP_HOST'] ?? '')) {
    reply(403, ['ok' => false, 'error' => 'Forbidden']);
}

$raw = file_get_contents('php://input', false, null, 0, 20000);
$in = json_decode($raw ?: '', true);
if (!is_array($in)) {
    reply(400, ['ok' => false, 'error' => 'Invalid request']);
}

// Honeypot filled in: pretend success, send nothing.
if (!empty($in['company_url'])) {
    reply(200, ['ok' => true]);
}

$field = function (string $key, int $max) use ($in): string {
    $v = is_string($in[$key] ?? null) ? $in[$key] : '';
    $v = trim(preg_replace('/[\x00-\x09\x0B-\x1F\x7F]/u', '', $v) ?? '');
    return mb_substr($v, 0, $max);
};
$oneLine = fn (string $v): string => trim(preg_replace('/[\r\n]+/', ' ', $v));

$name        = $oneLine($field('name', 120));
$company     = $oneLine($field('company', 160));
$email       = $oneLine($field('email', 160));
$phone       = $oneLine($field('phone', 60));
$companyType = $oneLine($field('companyType', 80));
$clientBase  = $oneLine($field('clientBase', 80));
$website     = $oneLine($field('website', 200));
$message     = $field('message', 5000);
$interests   = array_slice(array_filter(array_map(
    fn ($v) => is_string($v) ? $oneLine(mb_substr($v, 0, 60)) : '',
    is_array($in['interests'] ?? null) ? $in['interests'] : []
)), 0, 10);

if ($name === '' || $company === '' || $companyType === '' || empty($in['consent'])
    || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    reply(422, ['ok' => false, 'error' => 'Please fill in all required fields']);
}

// Simple per-IP rate limit.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlFile = sys_get_temp_dir() . '/ma_contact_' . hash('sha256', $ip) . '.json';
$now = time();
$hits = array_filter(
    json_decode(@file_get_contents($rlFile) ?: '[]', true) ?: [],
    fn ($t) => is_int($t) && $t > $now - 3600
);
if (count($hits) >= MAX_PER_HOUR) {
    reply(429, ['ok' => false, 'error' => 'Too many requests, please try again later']);
}
$hits[] = $now;
@file_put_contents($rlFile, json_encode(array_values($hits)), LOCK_EX);

$body = "New demo request from the Market Analytics website\n\n"
      . "Name:            $name\n"
      . "Company:         $company\n"
      . "Email:           $email\n"
      . "Phone:           " . ($phone !== '' ? $phone : '-') . "\n"
      . "Company type:    $companyType\n"
      . "Clients:         " . ($clientBase !== '' ? $clientBase : '-') . "\n"
      . "Website:         " . ($website !== '' ? $website : '-') . "\n"
      . "Interested in:   " . ($interests ? implode(', ', $interests) : '-') . "\n"
      . "Consent:         yes\n"
      . "Submitted:       " . gmdate('Y-m-d H:i') . " UTC\n\n"
      . "Message:\n" . ($message !== '' ? $message : '-') . "\n";

$subject = mb_encode_mimeheader("Demo request: $company ($name)", 'UTF-8', 'B', "\r\n");
$headers = implode("\r\n", [
    'From: Market Analytics Website <' . MAIL_FROM . '>',
    "Reply-To: <$email>",
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
]);

if (!mail(MAIL_TO, $subject, $body, $headers, '-f' . MAIL_FROM)) {
    error_log('contact.php: mail() failed');
    reply(500, ['ok' => false, 'error' => 'Could not send']);
}

reply(200, ['ok' => true]);
