#!/bin/bash

LOG=~/install.log

echo recbot -- installation script PID : $$

{
	#
	# Get all the running processes in the log
	#
	
	ps -fe | grep apt

	#
	# extracting recbot
	#

	echo extracting recbot files
	tar -xzf ~/recbot.tar.gz -C ~/ --strip-components=3

#	echo recbot -- installing nodejs

	#confirm if we should use the checked out script of source code
	#or copy one for ourselves too
#	bash ~/vc/scripts/vagrant/common/install-nodejs.sh  
#	[ $? -ne 0 ] && { exit 1; }

	# install xvfb
#	echo recbot -- installing Xvfb
#	bash ~/vc/apps/recbot/scripts/install-xvfb.sh  
#	[ $? -ne 0 ] && { exit 1; }

	#install chrome
#	echo recbot -- installing Chrome 
#	bash ~/vc/apps/recbot/scripts/install-chrome.sh  
#	[ $? -ne 0 ] && { exit 1; }

	#install ffmpeg
#	bash ~/vc/apps/recbot/scripts/install-ffmpeg.sh  
#	[ $? -ne 0 ] && { exit 1; }

	#
	# Due to certificate issues, we create a dummy host to point to the localhost
	#
	echo recbot - patching /etc/hosts
	echo '127.0.1.1       recbot-localhost.wiziq.com' | sudo tee --append /etc/hosts

} | tee $LOG

#starting recbot
cd ~/recbot/
echo recbot -- starting recbot server | tee --append $LOG
pm2 start --name recbot-server bin/www 
#nohup npm start &

echo recbot installation done
exit 0
