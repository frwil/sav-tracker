<?php
// generate_jwt.php

// --- CONFIGURATION WINDOWS ---
// Essayons de deviner le chemin, sinon modifiez la ligne $configPath manuellement
$configPath = NULL;

// Chemins courants sur Windows (Ajustez selon votre installation !)
$commonPaths = [
    'E:\usbwebserver_v8.6.5\usbwebserver\apache2\conf/openssl.cnf',
    'C:/xampp/apache/conf/openssl.cnf',
    'C:/wamp64/bin/php/php8.1.10/extras/ssl/openssl.cnf', // Exemple Wamp
    'C:/laragon/bin/php/php-8.1.10-Win32-vs16-x64/extras/ssl/openssl.cnf', // Exemple Laragon
    'C:/php/extras/ssl/openssl.cnf',
];

foreach ($commonPaths as $path) {
    if (file_exists($path)) {
        $configPath = $path;
        break;
    }
}

// SI LE SCRIPT ECHOUE ENCORE, REMPLACEZ NULL PAR LE CHEMIN REEL DE VOTRE FICHIER ENTRE GUILLEMETS
// Exemple : $configPath = 'C:/xampp/php/extras/ssl/openssl.cnf';
if ($configPath === NULL) {
    // Tentative de détection via la variable d'environnement système
    $envPath = getenv('OPENSSL_CONF');
    if ($envPath) {
        $configPath = $envPath;
    }
}

echo "Configuration OpenSSL utilisée : " . ($configPath ?: "Par défaut système (risque d'échec sur Windows)") . "\n";
// -----------------------------

// Création du dossier s'il n'existe pas
if (!is_dir('config/jwt')) {
    mkdir('config/jwt', 0777, true);
}

// Configuration pour la génération
$options = [
    'digest_alg' => 'sha256',
    'private_key_bits' => 4096,
    'private_key_type' => OPENSSL_KEYTYPE_RSA,
];

// Sur Windows, il faut souvent forcer le chemin de config
if ($configPath) {
    $options['config'] = $configPath;
}

// 1. Génération de la clé privée
$privateKey = openssl_pkey_new($options);

if ($privateKey === false) {
    die("❌ ERREUR CRITIQUE : Impossible de générer la clé privée.\n" .
        "OpenSSL Error: " . openssl_error_string() . "\n" .
        "👉 Sur Windows, vérifiez que le fichier openssl.cnf est bien accessible.\n" .
        "👉 Modifiez la variable \$configPath au début de ce script avec le bon chemin.\n");
}

// Export de la clé privée dans une variable
openssl_pkey_export($privateKey, $privateKeyPem, null, $options);

// Sauvegarde dans le fichier (pour le local)
file_put_contents('config/jwt/private.pem', $privateKeyPem);

// 2. Extraction de la clé publique
$publicKey = openssl_pkey_get_details($privateKey);
$publicKeyPem = $publicKey['key'];

// Sauvegarde dans le fichier (pour le local)
file_put_contents('config/jwt/public.pem', $publicKeyPem);

echo "✅ Succès ! Clés générées dans config/jwt/ !\n\n";

echo "=== A COPIER DANS RAILWAY (VARIABLES) ===\n\n";

echo "JWT_SECRET_KEY:\n";
// On encode en base64 sur une seule ligne pour Railway
echo base64_encode($privateKeyPem) . "\n\n";

echo "JWT_PUBLIC_KEY:\n";
echo base64_encode($publicKeyPem) . "\n\n";

echo "JWT_PASSPHRASE:\n";
echo "(Laissez vide)\n";