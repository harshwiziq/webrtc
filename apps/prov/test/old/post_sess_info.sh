
curl -k \
	--header "Content-type: application/json" \
	--request POST \
	--data @/home/saurabh/vc/apps/prov/test/content-session.info \
	https://localhost/prov/api/provisioning/v1/config/sess_info

curl -k \
	--header "Content-type: application/json" \
	--request POST \
	--data @/home/saurabh/vc/apps/prov/test/chat-session.info \
	https://localhost/prov/api/provisioning/v1/config/sess_info

curl -k \
	--header "Content-type: application/json" \
	--request POST \
	--data @/home/saurabh/vc/apps/prov/test/av-session.info \
	https://localhost/prov/api/provisioning/v1/config/sess_info
