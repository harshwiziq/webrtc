#!/bin/bash

 
[ "$1" ] && {
		{ echo 'INFO Message: Starting PROXY....' ; } && \
		{ cd ~/vc/apps/proxy ; authbind --deep pm2 start --name proxy app.js -- --host "$1" ;} && \
		{ echo "INFO Message: PROXY on $1 Started....." ; } || \
		{ echo 'ERROR: Unable to start PROXY.Something bad happened!' } 
	    } || \
{ echo "ERROR: Check the Backend Server Domain name/IP."}
