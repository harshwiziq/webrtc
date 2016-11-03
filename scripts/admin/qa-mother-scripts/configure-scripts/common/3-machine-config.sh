#path of aws secret file. (.pem file)
PEM_SECRET="$HOME"'/pem/wiziq-ap-northeast1-tokyo.pem'

BACK_VAG="$HOME"'/vc/scripts/vagrant/aws/qa-3machine-setup/backend'
PROV_VAG="$HOME"'/vc/scripts/vagrant/aws/qa-3machine-setup/prov'
NODE_VAG="$HOME"'/vc/scripts/vagrant/aws/qa-3machine-setup/node01'

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
W_CALLBACK_URL='https://'"$BACKEND"'/auth/auth/wiziq/callback'

W_AUTHORIZATION_URL="$WIZ_AUTH_DOMAIN"'/External/Account/GetExternalLogin'
W_TOKEN_URL="$WIZ_AUTH_DOMAIN"'/api/account/authorize'
W_PROFILE_URL="$WIZ_AUTH_DOMAIN"'/api/account/UserInfo'

W_END_POINT_URL="$WIZ_DOMAIN"'/Sessions/UpdateSessionStatus.aspx'

AV_TOX_API_KEY='45457782'
AV_TOX_SECRET='e5b2b08aba748e20b7cbedca4c878257c17b1634'
