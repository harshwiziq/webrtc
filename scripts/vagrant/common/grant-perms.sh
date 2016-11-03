#!/bin/bash

#
# Create a docker group and add yourself to it
#
id $WIZIQ_USER
groups $WIZIQ_USER
cat /etc/group
usermod -aG docker $WIZIQ_USER
exit
