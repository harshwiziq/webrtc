#!/bin/bash

source ../common/3-machine-config.sh ;

cd ~/vc/scripts/admin ;
 ./backend-set-config-perms  wiziq-presenter --profile templates/perms-profile-wiziq-presenter -h "$BACKEND" ;
 ./backend-set-config-perms  default --profile templates/perms-profile-default -h "$BACKEND" ;
 ./backend-set-config-perms  anon-demo --profile templates/perms-profile-anon-demo -h "$BACKEND" ;
 ./backend-set-config-perms  anonymous --profile templates/perms-profile-anonymous -h "$BACKEND" ;

 ./backend-set-config-landing --name default --host "$LANDING" --proto https --port 443 -h "$BACKEND" ;
 ./backend-set-config-prov --name default --host "$PROVISIONING" --proto https --port 443 -h "$BACKEND" ;
 ./backend-set-config-wiziq-end-pts --status-url "$W_END_POINT_URL" ;

 ./landing-set-config-backend --host "$BACKEND" --proto https --port 443 -h "$LANDING" ;
 ./landing-set-config-auth --host "$AUTH" --proto https --port 443 -h "$LANDING" ;

 ./auth-set-google --profile-name "$G_PROFILE_NAME"  --client-id "$G_CLIENT_ID" --client-secret "$G_CLIENT_SECRET" --callback-url "$G_CALLBACK_URL" ;
 ./auth-set-facebook  --profile-name "$F_PROFILE_NAME"  --client-id "$F_CLIENT_ID" --client-secret "$F_CLIENT_SECRET" --callback-url "$F_CALLBACK_URL" ;
 ./auth-set-wiziq  --profile-name "$W_PROFILE_NAME"  --client-id "$W_CLIENT_ID" --client-secret "$W_CLIENT_SECRET" --callback-url "$W_CALLBACK_URL" --authorization-url "$W_AUTHORIZATION_URL" --token-url "$W_TOKEN_URL" --profile-url "$W_PROFILE_URL" ;

