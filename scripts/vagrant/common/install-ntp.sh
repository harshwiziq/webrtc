#!/bin/bash

sudo apt-get update -y
sudo apt-get dist-upgrade -y
sudo apt-get install -y ntp ntpdate

# The above makes it run on startup by default

#
# Set up the time servers according to our reguion 
# which is 'Asia Pacific (Tokyo)' on teh AWS. I am assuming
# this implies that we are geolocated around Tokyo.
#
# A list of servers in that region is available on this page:
#       http://www.pool.ntp.org/zone/jp
#
sudo sed -ibak 's@ubuntu.pool.ntp.org@jp.pool.ntp.org@g' /etc/ntp.conf
sudo service ntp restart
ntpq -cpe -cas
