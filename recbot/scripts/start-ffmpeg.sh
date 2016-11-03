#!/bin/bash

ffmpeg -f alsa -i pulse -f x11grab -draw_mouse 0 -acodec pcm_s16le -video_size 1920x1080 -framerate 30 -i :0.0 -c:v libx264  -segment_time 600 -f segment -qp 0 -preset ultrafast -threads 0 $FILENAME

