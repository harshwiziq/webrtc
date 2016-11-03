
curl -k \
	--header "Content-type: application/json" \
	--request POST \
	--data '{"branch": "https://bitbucket.org/wiziq/vc"}' \
	https://192.168.17.153/prov/api/provisioning/v1/config/git
