#!/bin/bash

source ../common/3-machine-config.sh ;

 echo 'INFO Message: Starting PROXY....' ; 
{ cd ~/vc/apps/proxy ; authbind --deep pm2 start --name proxy app.js -- --host "$BACKEND"; } && \
{ echo "INFO Message: PROXY on $1 Started....." ; } || \
{ echo 'ERROR: Unable to start PROXY.Something bad happened' ; }

 echo 'INFO Message: Starting AUTHENTICATION-LANDING-BACKEND....' ; 
{ cd ~/vc/apps ; pm2 start --name apps-alb app.js -- --backend --auth --landing ; } && \
{ echo "INFO Message:  AUTHENTICATION-LANDING-BACKEND started on $BACKEND " ; } || \
{ echo 'ERROR: Unable to start AUTHENTICATION-LANDING-BACKEND.Something bad happened' ; }



