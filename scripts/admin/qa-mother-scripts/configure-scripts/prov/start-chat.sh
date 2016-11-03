#!/bin/bash

echo 'INFO Message: Starting CHAT....' ; 
{ cd ~/vc/services/lets-chat ; npm install ; npm run migrate ; pm2 start --name chat app.js ; } && \
{ echo "INFO Message: CHAT Started....." ; } || \
 echo 'ERROR: Unable to start CHAT.Something bad happened' 
