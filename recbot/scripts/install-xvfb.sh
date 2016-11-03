#!/bin/bash

echo installing X-virtual framebuffer .....

wget -q -O - 'https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add '-
sudo sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get -y update
sudo apt-get --force-yes -y install xvfb
