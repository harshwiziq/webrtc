#!/bin/bash

echo "Gingering-up the all 3 ROCKETS........"
{
x-terminal-emulator -geometry 65x70+0+0 --window-with-profile=DO_NOT_CLOSE -e bash -x setup-backend.sh ;
x-terminal-emulator -geometry 65x70-150+0 --window-with-profile=DO_NOT_CLOSE -e bash -x setup-prov.sh ;
x-terminal-emulator -geometry 65x70-0+0 --window-with-profile=DO_NOT_CLOSE -e bash -x setup-node.sh ;
} && \
{echo "Blast Off.......to Clouds....."} || {echo 'Some thing creashed ......... :('}

