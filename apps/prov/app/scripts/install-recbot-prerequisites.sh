#!/bin/bash

echo installing git .....
sudo apt-get install --force-yes -y git

echo
echo cloning vc repository .....
git clone https://shardul_3apples:bitbucketpassword@bitbucket.org/wiziq/vc

#below 3 lines will not be in the final code
#as the checked out branch should be master itself
cd vc
git checkout recording
cd

echo
echo installing nodejs .....
#confirm if we should use the checked out script of source code
#or copy one for ourselves too
bash -x ~/vc/scripts/vagrant/common/install-nodejs.sh

# install xvfb
bash -x ~/vc/apps/recbot/scripts/install-xvfb.sh

#install chrome
bash -x ~/vc/apps/recbot/scripts/install-chrome.sh

#install ffmpeg
bash -x ~/vc/apps/recbot/scripts/install-ffmpeg.sh

#starting recbot
cd ~/vc/apps/recbot/
npm start | bunyan
