#!/bin/bash

set -x
apt-get install -y libcap2-bin
setcap cap_ipc_owner,cap_setgid,cap_net_bind_service=+ep `which node`
