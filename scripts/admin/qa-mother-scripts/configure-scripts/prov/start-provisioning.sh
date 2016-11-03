#!/bin/bash

source ../common/3-machine-config.sh;

 echo 'INFO Message: Starting PROXY....' ;
{ cd ~/vc/apps/proxy ; authbind --deep pm2 start --name proxy app.js -- --host "$PROVISIONING" ;} && \
{ echo "INFO Message: PROXY on $PROVISIONING Started....." ; } || \
 echo 'ERROR: Unable to start PROXY.Something bad happened' 

 echo 'INFO Message: Starting PROVISIONING....' ; 
{  cd ~/vc/apps ; pm2 start --name provisioning app.js -- --prov ; } && \
{ echo "INFO Message: Started PROVISIONING service  on $PROVISIONING " ; } || \
 echo 'ERROR: Unable to start PROVISIONING.Something bad happened' ; 

