#!/bin/bash -x

#configuration file from which all variables are referenced.
source ../configure-scripts/common/3-machine-config.sh

#code to build and configure BACKEND. need PEM_SECRET to be set in advance in 3-machine-config.sh
bash -x build-machine.sh -a build -p "$BACK_VAG"
#scp -i "$PEM_SECRET" -r ../configure-scripts ubuntu@"$BACKEND":~/vc/scripts/admin/qa-mother-scripts
scp -o StrictHostKeyChecking=no -i "$PEM_SECRET" -r ~/wiziq-certs ubuntu@"$AWS_ELASTIC_IP_BACKEND_QA":~/vc/apps/proxy/certificates/
ssh -i "$PEM_SECRET" ubuntu@"$AWS_ELASTIC_IP_BACKEND_QA" << HHH
cd  ~/vc/scripts/admin/qa-mother-scripts/configure-scripts/backend/
ls -al
./start-auth-land-back.sh
./configure-backend.sh
./spit-backend-config.sh
HHH
 
