#!/bin/bash

#check for pulseaudio 
pulseaudio --check
[ $? -ne 0 ] || pulseaudio –D


#creating a sink
pactl load-module module-null-sink sink_name=MySink

echo exporting the display
export DISPLAY=:$__DISPLAY

echo exporting the pulsesink
export PULSE_SINK=MySink

echo starting chrome and redirecting the chrome to url: $URL
google-chrome --no-first-run --ignore-certificate-errors --test-type --window-postion=0,0 --window-size=1920,1080 --kiosk $URL
