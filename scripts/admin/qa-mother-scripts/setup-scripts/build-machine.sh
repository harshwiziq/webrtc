#!/bin/bash  

#set -o errexit 

#Vagrant file path related variables
SERVER_NAME=''
VAG_FILE_PATH=''
VAG_ACTION=''

#Parse the command line
function usage {
       echo Usage : $0 ' [--action | -a] [--vag-path | -p ] ';
       echo "	--action | -a (MANDATORY)  : pass 'build' to build a new machine. pass 'start' to just wake it up."
       echo "	--vag-path   | -p (Mandatory) : pass Vagrant file's directory path."
       echo "	--help | -h prints this help."
	exit 1;
}


#At least 4 paramters required t run script.
[ $# -lt 4 ] && { echo 'ERROR: Check no. of parameters!' ; usage; }

#extract the parameters
while [ $# -gt 0 ];
do
	#echo $@
        [ "$1" = '--action' -o "$1" = '-a' ] && { VAG_ACTION="$2"; shift; } 
	[ "$1" = '--vag-path' -o "$1" = '-p' ] && { VAG_FILE_PATH="$2"; shift; } 
	[ "$1" = '--help' -o "$1" = '-h' ] && { usage; }
	shift ;
done
#check Vag file path is directory.
[ -d $VAG_FILE_PATH ] || { echo "ERROR: Vagrant file path provided is not a directoy!" ; usage; }

#check whether to build or to start machine
[ "$VAG_ACTION" = 'build' ] && { cd "$VAG_FILE_PATH"; vagrant up --provider=aws ; } || \
 { [ "$VAG_ACTION" = 'start' ] && { cd "$VAG_FILE_PATH" ; vagrant up --provider=aws --no-provision ; } } \
 || { echo 'ERROR: Pass either 'build' or 'start' as --action' ; usage; }


echo "INFO Message: Built $SERVER_NAME using Vagrant file from directory $VAG_FILE_PATH"
