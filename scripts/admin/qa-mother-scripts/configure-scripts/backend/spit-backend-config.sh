#!/bin/bash -x

cd ~/vc/scripts/admin ;
echo "Here are the Configrations set by script.......................! "
./auth-get-ssos ;
./backend-get-config-landing ;
./backend-get-config-perms ;
./backend-get-config-prov ;
./backend-get-config-wiziq-end-pts ;
