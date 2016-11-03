#!/bin/bash

source ../common/3-machine-config.sh

 echo 'INFO Message: Starting PROXY....' ;  
{ cd ~/vc/apps/proxy ; authbind --deep pm2 start --name proxy app.js -- --host "$NODE" ;} && \
{ echo "INFO Message: PROXY on $NODE  Started....." ; } || \
 echo 'ERROR: Unable to start PROXY.Something bad happened' 

 echo 'INFO Message: Starting AGENT....' ; 
{ cd ~/vc/apps ; pm2 start --name agent app.js -- --agent ; } && \
{ echo "INFO Message: Started AGENT service  on $NODE " ; } || \
 echo 'ERROR: Unable to start AGENT.Something bad happened' ;  

