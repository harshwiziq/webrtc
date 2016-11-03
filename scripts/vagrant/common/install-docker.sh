#!/bin/bash

#
# Update sources
#
sudo apt-get update
sudo apt-get install apt-transport-https ca-certificates -y
sudo apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D

# Create the '/etc/apt/sources.list.d/docker.list' if it does not exist and overwrite it.
sudo echo deb https://apt.dockerproject.org/repo ubuntu-trusty main > /etc/apt/sources.list.d/docker.list

sudo apt-get update
sudo apt-get purge lxc-docker
sudo apt-cache policy docker-engine

#
# Install more pre-requisites
#
sudo apt-get update
sudo apt-get install linux-image-extra-$(uname -r) -y
sudo apt-get install apparmor -y

#
# Now install docker
#
sudo apt-get update
sudo apt-get install docker-engine -y
sudo service docker start
sudo docker run hello-world

exit

#
# This is an older remenant of some fixes required for installation on 
# Ubuntu 15.x not need anymore
#
sudo sed -i '/wily/d' /etc/apt/sources.list.d/docker.list
sudo sed -i '/trusty/d' /etc/apt/sources.list.d/docker.list
sudo sed -i '/precise/d' /etc/apt/sources.list.d/docker.list
sudo apt-get update
sudo apt-get install docker-engine -y
