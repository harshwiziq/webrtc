#!/bin/bash
HOST="http://localhost:2178"

if [ $1 ]; then
	HOST=$1
fi

echo "hitting host $HOST"

curl -k -X GET $HOST/agent/session/v1 | python -m json.tool



# support for filters is yet to be added
