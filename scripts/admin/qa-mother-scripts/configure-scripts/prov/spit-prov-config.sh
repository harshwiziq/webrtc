#!/bin/bash -x

source ../common/3-machine-config.sh ;

cd ~/vc/scripts/admin ;
./prov-get-config-av-tokbox-v2 -h "$PROVISIONING";
./prov-get-config-backend ;
./prov-get-config-chat ;
./prov-get-config-content -h "$PROVISIONING";
./prov-get-config-nodes ;
./prov-get-config-provisioning ;
./prov-get-status-nodes ;
