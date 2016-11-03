#!/bin/bash

set -x

GROUP=`id -Gn`
apt-get install -y authbind

touch /etc/authbind/byport/80
chown $USER:$GROUP /etc/authbind/byport/80
chmod 775  /etc/authbind/byport/80

touch /etc/authbind/byport/443
chown $USER:$GROUP /etc/authbind/byport/443
chmod 775  /etc/authbind/byport/443
