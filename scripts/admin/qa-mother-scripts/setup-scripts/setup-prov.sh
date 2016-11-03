#!/bin/bash -x

#configuration file from which all variables are referenced.
source ../configure-scripts/common/3-machine-config.sh

#code to build and configure PROV. need PEM_SECRET to be set in advance in 3-machine-config.sh
bash -x build-machine.sh -a build -p "$PROV_VAG"
#scp -i "$PEM_SECRET" -r ../configure-scripts ubuntu@"$PROVISIONING":~/vc/scripts/admin/qa-mother-scripts
scp -o StrictHostKeyChecking=no -i "$PEM_SECRET" -r ~/wiziq-certs ubuntu@"$AWS_ELASTIC_IP_PROV_QA":~/vc/apps/proxy/certificates/
ssh -i "$PEM_SECRET" ubuntu@"$AWS_ELASTIC_IP_PROV_QA" << HHH
cd  ~/vc/scripts/admin/qa-mother-scripts/configure-scripts/prov/
ls -al
./start-provisioning.sh
./start-chat.sh
./start-cms.sh
./configure-prov.sh
./spit-prov-config.sh
HHH
 
