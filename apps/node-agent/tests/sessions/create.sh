#!/bin/bash

if [ $# -lt 1 ]; then
	echo 'USAGE: <session-info path> [hostname]';
	exit -1;
fi

FILE_PATH=$1; shift;
HOST=$1;

#
# use default values if not given
#
[ "$HOST" == "" ] && HOST=http://127.0.0.1:2178
SESS_ID=$RANDOM
TMP_FILE=$SESS_ID.session
cp $FILE_PATH $TMP_FILE
#
# change session_id to some random number
#
sed -i 's@__SESS_ID@'$SESS_ID'@g' $TMP_FILE

echo "hitting host $HOST"

curl										\
	-k 										\
	-H "Content-Type: application/json" 	\
	-X POST  								\
	-d @$TMP_FILE 	 						\
	$HOST/agent/session/v1 				\
	| python -m json.tool

