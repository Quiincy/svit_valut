<?php
// Simple proxy to forward requests to the local Python API at port 8000

// Target base URL
$backend_url = 'http://127.0.0.1:8000';

// Get the requested path and query string
$request_uri = $_SERVER['REQUEST_URI'];
$target_url = $backend_url . $request_uri;

$method = $_SERVER['REQUEST_METHOD'];

$headers = [];
foreach (getallheaders() as $name => $value) {
    if (strtolower($name) !== 'host' && strtolower($name) !== 'connection' && strtolower($name) !== 'content-length') {
        $headers[] = "$name: $value";
    }
}

$ch = curl_init($target_url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);

if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
    $input = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
}

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(502);
    echo "Bad Gateway: " . curl_error($ch);
    exit;
}

$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$response_headers = substr($response, 0, $header_size);
$response_body = substr($response, $header_size);

// Forward headers
$headers_arr = explode("\r\n", $response_headers);
foreach ($headers_arr as $header) {
    if (!empty($header) && stripos($header, 'Transfer-Encoding:') === false && stripos($header, 'Connection:') === false && stripos($header, 'Content-Encoding:') === false) {
        header($header);
    }
}

http_response_code($http_code);
echo $response_body;
?>
