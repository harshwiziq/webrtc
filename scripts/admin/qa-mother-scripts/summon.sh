#!/bin/bash -x

#set -e errexit -o pipefail

BACK_BANNER="
 ___   _   ___ _  _____ _  _ ___    ___ ___   _   _ ___ _ 
| _ ) /_\ / __| |/ / __| \| |   \  |_ _/ __| | | | | _ \ |
| _ \/ _ \ (__| ' <| _|| .\ | |) |  | |\__ \ | |_| |  _/_|
|___/_/ \_\___|_|\_\___|_|\_|___/  |___|___/  \___/|_| (_)"


PROV_BANNER=" 
 ___ ___  _____   __  ___ ___   _   _ ___ _ 
| _ \ _ \/ _ \ \ / / |_ _/ __| | | | | _ \ |
|  _/   / (_) \ V /   | |\__ \ | |_| |  _/_|
|_| |_|_\\\\___/ \_/   |___|___/  \___/|_| (_)"

NODE_BANNER="
 _  _  ___  ___  ___   ___ ___   _   _ ___ _ 
| \| |/ _ \|   \| __| |_ _/ __| | | | | _ \ |
| .  | (_) | |) | _|   | |\__ \ | |_| |  _/_|
|_|\_|\___/|___/|___| |___|___/  \___/|_| (_)"

#Variables to use as server names

BACKEND='backend-vcqa.wiziq.com'
LANDING='backend-vcqa.wiziq.com'
AUTH='backend-vcqa.wiziq.com'

PROVISIONING='prov-vcqa.wiziq.com'
NODE='node-vcqa.wiziq.com'

CHAT='prov-vcqa.wiziq.com'
CONTENT='prov-vcqa.wiziq.com'

WIZ_AUTH_DOMAIN='http://auth.wizqe.authordm.com'
WIZ_DOMAIN='http://wizqe.authordm.com'

G_PROFILE_NAME='default'
G_CLIENT_ID='1043689258262-ahrmg2q3uuj3u5vn3ojo0u3j6a54585d.apps.googleusercontent.com'
G_CLIENT_SECRET='uqax_Q-eg5SPtT7Hu4AEU-qs'
G_CALLBACK_URL='https://'"$BACKEND"'/auth/auth/google/callback'

F_PROFILE_NAME='default'
F_CLIENT_ID='232742830428814'
F_CLIENT_SECRET='91d78a81695dbd54eb39d87bb61e5168'
F_CALLBACK_URL='https://'"$BACKEND"'/auth/auth/fb/callback'

W_PROFILE_NAME='default'
W_CLIENT_ID='W4VJL5P/mcPXKhIfK/KLyYWO5yCaw9pcEHm1KfSmyvA='
W_CLIENT_SECRET='T/KrtsSQkDjlI2qE6m0fxA=='
W_CALLBACK_URL='https://'"$BACKEND"'/auth/wiziq/callback'

W_AUTHORIZATION_URL="$WIZ_AUTH_DOMAIN"'/External/Account/GetExternalLogin'
W_TOKEN_URL="$WIZ_AUTH_DOMAIN"'/api/account/authorize'
W_PROFILE_URL="$WIZ_AUTH_DOMAIN"'/api/account/UserInfo'

W_END_POINT_URL="$WIZ_DOMAIN"'/Sessions/UpdateSessionStatus.aspx'

AV_TOX_API_KEY='45457782'
AV_TOX_SECRET='e5b2b08aba748e20b7cbedca4c878257c17b1634'


#server to start or build/provision
SERVER_NAME=''
SERVER_SERVICE_COMMAND=''

#concatenated command for extra services
EXTRA_SERVICE_COMMAND=''
EXTRA_ACTION=''
declare -a EXTRA_ACTION_ARRAY

#just a text lireral
SERVER_UNDER_ACTION=''

#Vagrant commands to start or build machine
VAG_BUILD='up --provider=aws'
VAG_START='up --provider=aws --no-provision'
VAG_ACTION=''

#Vagrant file path related variables
BACK_VAG_FILE_PATH=$HOME"/vc/scripts/vagrant/aws/qa-3machine-setup/back"
PROV_VAG_FILE_PATH=$HOME"/vc/scripts/vagrant/aws/qa-3machine-setup/prov"
NODE_VAG_FILE_PATH=$HOME"/vc/scripts/vagrant/aws/qa-3machine-setup/node01"

#combined Vagrant command
VAG_COMMAND=''

#Git related variables
GIT_ACTION=''
GIT_PULL='echo getting latest code ; git pull ;'
GIT_COMMAND=''

#Services related variables

PROXY_COMMAND="echo Starting Proxy.... ;
		cd ~/vc/apps/proxy ;
		authbind --deep pm2 start --name proxy app.js -- --host "

BACK_SERVICES_COMMAND="$PROXY_COMMAND  "$BACKEND" ;
			echo Starting backend ,auth and landing..... ;
			cd ~/vc/apps ;
			pm2 start --name apps-alb app.js -- --backend --auth --landing --sess-ip "$BACKEND" --sess-port 443 --ssl true ;"

PROV_SERVICES_COMMAND="$PROXY_COMMAND  "$PROVISIONING" ;
		echo Starting Provisioning..... ;
		cd ~/vc/apps ;
		pm2 start --name provisioning app.js -- --prov --sess-ip "$PROVISIONING" --sess-port 443 --ssl true ;"

NODE_SERVICES_COMMAND="$PROXY_COMMAND "$NODE" ;
		echo Starting Agent..... ;
		cd ~/vc/apps ;
		pm2 start --name agent app.js -- --agent --sess-ip "$NODE" --sess-port 443 --ssl true ;"
#extra services related variables
CMS_SERVICES_COMMAND="echo Starting CMS...... ;
			cd ~/vc/services/cms ; pm2 start --name cms app.js ;"

CHAT_SERVICES_COMMAND="echo Starting chat.... ;
			cd ~/vc/services/lets-chat ; npm install ; npm run migrate ; pm2 start --name chat app.js ;"

#Configuration related variables
CONFIG_ACTION=''
CONFIG_COMMAND=''
CONFIGS_CHOOSEN=''

BACK_CONFIGS="echo setting configurations....... ;
		cd ~/vc/scripts/admin ;
		./backend-set-config-perms --name wiziq-presenter -h "$BACKEND" ;
		./backend-set-config-perms --name default -h "$BACKEND" ;
		./backend-set-config-landing --name default --host "$LANDING" --proto https --port 443 -h "$BACKEND" ;
		./backend-set-config-prov --name default --host "$PROVISIONING" --proto https --port 443 -h "$BACKEND" ;
		./backend-set-config-wiziq-end-pts --status-url "$W_END_POINT_URL"
		./landing-set-config-backend --host "$BACKEND" --port https --port 443 -h "$LANDING" ;
		./landing-set-config-auth --host "$AUTH" --port https --port 443 -h "$LANDING" ;
		./auth-set-facebook --profile-name "$G_PROFILE_NAME"  --client-id "$G_CLIENT_ID" --client-secret "$G_CLIENT_SECRET" --callback-url \ 			"$G_CALLBACK_URL" ;
		./auth-set-google  --profile-name "$F_PROFILE_NAME"  --client-id "$F_CLIENT_ID" --client-secret "$F_CLIENT_SECRET" --callback-url "$F_CALLBACK_URL" ;
		./auth-set-wiziq  --profile-name "$W_PROFILE_NAME"  --client-id "$W_CLIENT_ID" --client-secret "$W_CLIENT_SECRET" --callback-url "$W_CALLBACK_URL" \
		--authorization-url "$W_AUTHORIZATION_URL" --token-url "$W_TOKEN_URL" --profile-name "$W_PROFILE_URL" ;"

PROV_CONFIGS="echo setting configurations....... ;
		cd ~/vc/scripts/admin ;
		./prov-set-config-backend --host "$BACKEND" --proto https --port 443 ;
		./prov-set-config-provisioning --host "$PROVISIONING" --proto https --port 443 ;
		./prov-set-config-chat --server "$CHAT" –timeout 10000 ;
		./prov-set-config-content --content_server_uri "$CONTENT" ;
		./prov-set-config-av-tokbox-v2 --apikey 45457782 --apisecret e5b2b08aba748e20b7cbedca4c878257c17b1634 ;
		./prov-acquire-node --id node01 --host "$NODE" --proto https --port 443 -h "$PROVISIONING" ;" 

NODE_CONFIGS="echo pulling docker image ; docker pull avinashwiziq/wiziq-session:2.2 ;"

#Parse the command line
function usage {
       echo Usage : $0 '[ --server | -s ] [--action | -a] [--pull | -p ] [--config | -c ] [--extra | -e ]';
       echo "	--server | -s (MANDATORY)  : pass back or prov or node"
       echo "	--action | -a (MANDATORY)  : pass 'build' to build a new machine. pass 'start' to just wake it up."
       echo "	--pull   | -p		   : pass 'yes' or 'no' to get git pull or to avoid it , on machine after start or build."
       echo "	--config | -c		   : pass 'yes' or 'no' to config machine or leave it as it after start or build."
       echo "	--extra	 | -e		   : pass comma seperated list, like 'chat,cms' .Takes only chat and cms as parameters.Runs the selected service on 
						the server you selected in --server parameter."
       exit 1;
}

#At least 4 paramters required t run script.
[ $# -lt 4 ] && { usage; }

#extract the parameters
while [ $# -gt 0 ];
do
	#echo $@
        [ "$1" = '--server' -o "$1" = '-s' ] && { SERVER_NAME="$2"; shift; }
        [ "$1" = '--action' -o "$1" = '-a' ] && { VAG_ACTION="$2"; shift; }
        [ "$1" = '--pull' -o "$1" = '-p' ] && { GIT_ACTION="$2"; shift; }
        [ "$1" = '--config' -o "$1" = '-c' ] && { CONFIG_ACTION="$2"; shift; }
        [ "$1" = '--extra' -o "$1" = '-e' ] && { EXTRA_ACTION="$2"; shift; }

        [ "$1" = '--auth-server' -o "$1" = '-A' ] && { AUTH_SERVER="$2"; shift; }
        [ "$1" = '--back-server' -o "$1" = '-B' ] && { BACK_SERVER="$2"; shift; }
        [ "$1" = '--land-server' -o "$1" = '-L' ] && { LAND_SERVER="$2"; shift; }

        [ "$1" = '--prov-server' -o "$1" = '-P' ] && { PROV_SERVER="$2"; shift; }

        [ "$1" = '--node-server' -o "$1" = '-N' ] && { NODE_SERVER="$2"; shift; }

        [ "$1" = '--chat-server' -o "$1" = '-C' ] && { CHAT_SERVER="$2"; shift; }
	[ "$1" = '--cms-server' -o "$1" = '-M' ] && { CMS_SERVER="$2"; shift; }
	

        [ "$1" = '--help' -o "$1" = '-h' ] && { usage; }
	shift;
done

#check and set server names required to configure backend server
function check_set_back_server {
	
	if [ "$AUTH_SERVER" -a "$BACK_SERVER" -a "$LAND_SERVER" -a "$PROV_SERVER" ] ; then
	
		AUTH="$AUTH_SERVER"
		BACKEND="$BACK_SERVER"
		LANDING="$PROV_SERVER" 

		PROVISIONING="$PROV_SERVER"
	else 
		echo " --auth-server , --back-server , --land-server , --prov-server are mandatory to run backend."
		usage;
	fi
}

#check and set server names required to configure provisioning server
function check_set_prov_server {

	if [ "$PROV_SERVER" -a "$BACK_SERVER" -a "$NODE_SERVER" -a "$CHAT_SERVER" -a "$CMS_SERVER" ] ; then
		
		BACKEND="$BACK_SERVER"
		NODE="$NODE_SERVER"
		PROVISIONING="$PROV_SERVER"
	else 
		echo "--node-server , --back-server , --prov-server  are mandatory to run provisioning."
		usage;
	fi
}

#check and set server names required to configure chat,cms server
function check_set_extra_server {
	
	if [ "$CHAT_SERVER" -o "$CMS_SERVER" ] ; then
		CHAT="$CHAT_SERVER"
		CONTENT="$CMS_SERVER"
	else
		echo "provide --chat-server , --cms-server as you have selected --extra option."
	fi
}


#prepare vagrant's build and ssh command before hand to pass to Vagrant.
#VAG_ACTION and SERVER_NAME are required.
if [ "$SERVER_NAME" -a "$VAG_ACTION" ] ; then

	#parse array and build the service command to be added to the the ssh command
	if [ "$EXTRA_ACTION" ] ; then

		EXTRA_ACTION_ARRAY=${EXTRA_ACTION//,/ }

		for service in ${EXTRA_ACTION_ARRAY[@]}
                do
		        if [ "$service" ] ; then

				case "$service" in
				                "chat")
							check_set_extra_server;
				                        EXTRA_SERVICE_COMMAND+="$CHAT_SERVICES_COMMAND"
				                ;;
				                "cms")
							check_set_extra_server;
				                        EXTRA_SERVICE_COMMAND+="$CMS_SERVICES_COMMAND"
				                        ;;
				                *)
							echo "Only 'chat' and 'cms' is accepted for --extra"		                        
							usage;
				                ;;
				esac
			fi
                done

	fi
	

	#prepare SSH COMMAND VARIABLES to pass to server selected.
	case "$SERVER_NAME" in
		"back")	
			check_set_back_server;
			SERVER_UNDER_ACTION='BACKEND'
			VAG_FILE_PATH="$BACK_VAG_FILE_PATH"
			CONFIGS_CHOOSEN="$BACK_CONFIGS"
			SERVER_SERVICE_COMMAND="$BACK_SERVICES_COMMAND"
			SHOW_BANNER="$BACK_BANNER"
		;;
		"prov")
			check_set_prov_server;
			SERVER_UNDER_ACTION='PROVISIONING'
			VAG_FILE_PATH="$PROV_VAG_FILE_PATH"
			CONFIGS_CHOOSEN="$PROV_CONFIGS"
			SERVER_SERVICE_COMMAND="$PROV_SERVICES_COMMAND"
			SHOW_BANNER="$PROV_BANNER"
			
		;;
		"node")
			SERVER_UNDER_ACTION='NODE'
			VAG_FILE_PATH="$NODE_VAG_FILE_PATH"
			CONFIGS_CHOOSEN="$NODE_CONFIGS"
			SERVER_SERVICE_COMMAND="$NODE_SERVICES_COMMAND"
			SHOW_BANNER="$NODE_BANNER"
			
		;;
		*)
			echo "Only 'back' , 'prov' and 'node' is accepted for --server."
			usage;
		;;
	esac		
		
	#parse --action paramater
		
	if [ "$VAG_ACTION" ] ; then

		case "$VAG_ACTION" in
				"build")
				      VAG_COMMAND=$VAG_BUILD
				      ;;
				 "start")
				      VAG_COMMAND=$VAG_START
				      ;;
				   *)
				      echo  "Only 'build' and 'start' is accepted for --action"
					usage;
					;;
		esac
	fi
	
	#parse --git paramater
	if [ "$GIT_ACTION" ] ; then

				case "$GIT_ACTION" in
				                "yes")
				                        GIT_COMMAND=$GIT_PULL
				                ;;
				                "no")
				                        GIT_COMMAND=''
				                ;;
				                *)
							GIT_COMMAND=''
						;;
				esac
	fi

	#parse --config paramater
	
	if [ "$CONFIG_ACTION" ] ; then

				case "$CONFIG_ACTION" in
				                "yes")
				                        CONFIG_COMMAND=$CONFIGS_CHOOSEN
				                ;;
				                "no")
				                        CONFIG_COMMAND=''
				                ;;
				                *)
							CONFIG_COMMAND=''
						;;
				esac
	fi

else 
	echo "--server and --action are mandatory"
	usage;
fi

#command to send to the server through SSH.
SSH_COMMAND="cd ~/vc ; 
		"$GIT_COMMAND" 
		"$SERVER_SERVICE_COMMAND"
		"$EXTRA_SERVICE_COMMAND"
		"$CONFIG_COMMAND"
		echo Done....! ;"

cd $VAG_FILE_PATH ; set_aws_keys ;

echo "$VAG_ACTION"ing "$SERVER_UNDER_ACTION" by Running : vagrant "$VAG_COMMAND" ;

#run vagrant command to star or build machine.
vagrant $VAG_COMMAND ; 

echo ------------------------------------------- ;

#After the machine is build started then just ssh into it and give config commands.
#vagrant ssh -c "$SSH_COMMAND" ;

echo $SERVER_UNDER_ACTION is up....... ;

#echo "$SHOW_BANNER" ;

#vagrant ssh ;
#set +x;
