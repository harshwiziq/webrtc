#!/bin/bash

source ../common/3-machine-config.sh ;

echo 'INFO Message: setting configurations.......' ;

cd ~/vc/scripts/admin ;
echo 'INFO Message: pulling docker image' ; docker pull avinashwiziq/wiziq-session:2.2 ;
