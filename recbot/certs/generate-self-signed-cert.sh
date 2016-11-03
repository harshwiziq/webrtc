#!/bin/bash

echo '#'
echo '# --> Generating a private key'
echo '#'
openssl genrsa -des3 -out server.key 1024

echo '#'
echo '# --> Generating a CSR (Certificate Signing Request) '
echo '#'
openssl req -new -key server.key -out server.csr

echo '#'
echo '# --> Remove Passphrase from Key'
echo '#'
cp server.key server.key.org
openssl rsa -in server.key.org -out server.key

echo '#'
echo '# --> Generating a Self-Signed Certificate '
echo '#'
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt

ls -ltr
