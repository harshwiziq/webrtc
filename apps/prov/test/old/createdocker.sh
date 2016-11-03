
curl -k \
	--header "Content-type: application/json" \
	--request POST \
	--data '{"url": "https://localhost", "sess_image":
"avinashwiziq/wiziq-session:2.2"}' \
	https://192.168.17.153/prov/api/provisioning/v1/config/docker
