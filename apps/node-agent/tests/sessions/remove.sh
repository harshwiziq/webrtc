#!/bin/bash

if [ $# -lt 1 ]; then
	echo 'USAGE: <sess_id> [hostname]'
	exit -1;
fi

SESS_ID=$1; shift;
HOST=$1;

#
# use default in case it is not specified
#
[ "$HOST" == "" ] && HOST="http://localhost:2178"

echo 'hitting host $HOST'

curl -k -X DELETE $HOST/agent/session/v1/$SESS_ID | python -m json.tool


