#!/bin/bash -x

#configurtion file from which all variables are referenced.
source ../configure-scripts/common/3-machine-config.sh

#code to build and configure NODE. need PEM_SECRET to be set in advance in 3-machine-config.sh
bash -x build-machine.sh -a build -p "$NODE_VAG"
#scp -i  "$PEM_SECRET" -r ../configure-scripts ubuntu@"$NODE":~/vc/scripts/admin/qa-mother-scripts
scp -o StrictHostKeyChecking=no -i "$PEM_SECRET" -r ~/wiziq-certs ubuntu@"$AWS_ELASTIC_IP_NODE_QA":~/vc/apps/proxy/certificates/
ssh -i "$PEM_SECRET" ubuntu@"$AWS_ELASTIC_IP_NODE_QA" << HHH
cd  ~/vc/scripts/admin/qa-mother-scripts/configure-scripts/node/
ls -al
./start-agent.sh
./configure-agent.sh
HHH
 
