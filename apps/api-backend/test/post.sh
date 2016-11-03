HOST=$1
DATA_FILE=$2
CLASS_ID=`cat $DATA_FILE | grep ClassID | awk '{ print $2 }' | sed  's@,$@@g'`
#
# Change dynamaic params
#
TMP_FILE=$$.DATA_FILE
cp $DATA_FILE $TMP_FILE
CURR_TIME=`date +"%m/%d/%y %H:%M:%S"`
#
# Change Start time to NOW
#
sed -i bak 's@__START_TIME@"'"$CURR_TIME"'"@g' $TMP_FILE

#
# Change Class ID to random
#
sed -i bak 's@__CLASS_ID@'$RANDOM'@g' $TMP_FILE

curl -k \
	--header "Content-type: application/json" \
	--request POST \
	-v -d @$TMP_FILE \
	https://$HOST/backend/wiziq/$CLASS_ID/config
