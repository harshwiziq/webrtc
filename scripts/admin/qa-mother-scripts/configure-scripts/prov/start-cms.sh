#!/bin/bash

source ../common/3-machine-config.sh ;

 echo 'INFO Message: Starting CMS Service...' ;
{ cd ~/vc/services/cms ; pm2 start --name cms app.js ;} && \
{ echo "INFO Message: CMS Started....." ; } || \
 echo 'ERROR: Unable to start CMS.Something bad happened' ; 
