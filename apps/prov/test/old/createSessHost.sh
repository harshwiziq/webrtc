curl -k \
	--header "Content-type: application/json" \
	--request POST \
	--data '{"id": "localvm_home", "host":
"192.168.1.37", "port": 443, "protocol": "https://"}' \
	https://192.168.1.37/prov/api/provisioning/v1/config/sess_host/localvm_home
