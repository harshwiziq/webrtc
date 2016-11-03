#!/bin/bash

source ../common/3-machine-config.sh;

echo 'INFO Message: setting configurations.......' ;

cd ~/vc/scripts/admin ;
 ./prov-set-config-backend --host "$BACKEND" --proto https --port 443 ;
 ./prov-set-config-provisioning --host "$PROVISIONING" --proto https --port 443 ;
 ./prov-set-config-chat --server "$CHAT" –timeout 10000 ;
 ./prov-set-config-content --server "$CONTENT" ;
 ./prov-set-config-av-tokbox-v2 --apikey "$AV_TOX_API_KEY" --apisecret "$AV_TOX_SECRET" ;
 ./prov-acquire-node --id node01 --host "$NODE" --proto https --port 443 -h "$PROVISIONING" ; 
