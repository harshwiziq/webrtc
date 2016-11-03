#
# Print all commands
#
set -x

#
# Fix Locale
#
echo 'LC_ALL=en_US.UTF-8' >> /etc/environment
echo 'LANG=en_US.UTF-8' >> /etc/environment

#
# Supress error messages from dpkg-reconfigure
#
export DEBIAN_FRONTEND=noninteractive

#
# Initial Preparation
#
apt-get update
apt-get install build-essential g++-4.7 -y
apt-get install git -y

#
# Install nodejs
#
bash -x install-nodejs.sh

#
# Install mongo
#
bash -x install-mongo.sh

#
# Install docker
#
bash -x install-docker.sh

#
# Install redis
#
bash -x install-redis.sh

#
# Install NTP
#
bash -x install-ntp.sh

#
# Manage Permissions
#
bash -x install-authbind.sh
bash -x grant-perms.sh
bash -x grant-sudo.sh

#
# Install Avahi for ZeroConf
#
apt-get install -y avahi-daemon

#
# Check out the code (as the WIZIQ_USER)
#
git clone https://wizdeploy:'Deploy_Me'@bitbucket.org/wiziq/vc.git /home/$WIZIQ_USER/vc
chown -R $WIZIQ_USER /home/$WIZIQ_USER/vc
chgrp -R $WIZIQ_USER /home/$WIZIQ_USER/vc
