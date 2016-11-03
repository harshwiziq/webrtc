#!/bin/bash

function usage {

echo Usage: $0
echo options:
echo '  --date (MANDATORY) : in format (YYYY-MM-DD)'
echo ' --time(MANDATORY) : in format (HH:MM:SS)'
echo ' --classes (MANDATORY) : no of classes from 0 to 100'
echo ' --basename (MANDATORY) : basename of class: we append numeric value to your given class basename'
echo ' -d : duration: time in minutes'
echo
exit 1;
}

[ $# -lt 8 ] && { usage; };

while [ $# -gt 0 ];
do
[ "$1" == "--date" ] && { CLASSDATE=$2; shift;}
[ "$1" == "--time" ] && { CLASSTIME=$2; shift;}
[ "$1" == "--classes" ] && { N=$2; shift;}
[ "$1" == "--basename" ] && { BASENAME=$2; shift;}
[ "$1" == "-d" ] && { DURATION=$2;shift; }
shift;
done;
CLASSDATETIME=$CLASSDATE
CLASSDATETIME+='T'
CLASSDATETIME+=$CLASSTIME
CLASSDATETIME+='+0530';

echo 'CLASS START TIME IS'
echo $CLASSDATETIME


URL='https://backend-vcqa.wiziq.com:443/landing/session/v1/'
A=1
while [ $A -le $N ]; 
do
SESSNAME=$BASENAME$A
RES=$(./backend-create-class_load templates/class-basic-wiziq --class-id $SESSNAME --duration $DURATION --starts-in 10 --date $CLASSDATETIME -h backend-vcqa.wiziq.com)
SESSURL=$URL$SESSNAME
#echo $SESSURL
if [[ $RES == *"$SESSURL"* ]]; then
echo "class created ->  "$SESSURL
else
echo "class not created -> " $RES
break
fi
A=` expr $A + 1 `
done; 
