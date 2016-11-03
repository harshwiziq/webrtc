#!/bin/bash

# set -x   -- used when debugging

[ $# -lt 2 ] && { echo Usage : `basename $0` '<prov-base-url> <config.info path> [-n <node-base-url>] [-f]'; exit -1; }

PROV=$1; shift;
FILE_PATH=$1; shift;

TMP_FILE=/tmp/acquire.tmp.$$
trap "rm -f $TMP_FILE" SIGHUP SIGINT SIGTERM EXIT
cp $FILE_PATH $TMP_FILE

#
# Handle optional arguments
#
while [ $# -gt 0 ];
do
        [ "$1" == "-n" ] && { HOST=$2; shift; }
        [ "$1" == "-f" ] && { FORCE='force=true'; }
		shift;
done;

#
# Set defaults
#
[ "$HOST" == "" ] && HOST=http://localhost:2178

#
# enter prov_ip
#
sed -i 's@__PROV_IP@'$PROV'@g' $TMP_FILE

echo $HOST

curl     \
	-k      \
	-H "Content-Type: application/json"   \
	-X POST   \
	-d @$TMP_FILE   \
	$HOST/agent/node/v1?$FORCE | python -m json.tool

