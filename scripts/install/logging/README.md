The log-install script installs the logging infra based off EFK stack.
The script require sudo access for package installs.

As of now, the config scripts are simple and requires further changes for production release.

Usage : ./log-install logforward | logaggregate

Option 1.
Run log-install logforward if you want to create logging infra on a running node.
This method installs td-agent (stable fluentd version) on a machine.

fluentd config file is installed in the path /etc/td-agent/log-forward.conf
The central logging server details (IP, port) are configured here. 
Any changes in the config file can be reloaded dynamically without fluentd restart by running following command: sudo service td-agent reload

Option 2.
Run log-install logaggregate if you want to create logging infra for central logging server (rishikesh),
where logs are dumped for further analysis. 
This method install ElasticSearch and Kibana in addition to td-agent (fluentd).
In dev and QA environments, when everything is running off a single VM/ machine,
this option can be used.
In production, this option would install logging infra (EFK stack).

fluentd config file is installed in the path /etc/td-agent/log-aggregator.conf
Any changes in the config file can be reloaded dynamically without fluentd restart by running following command: sudo service td-agent reload

Accessing all session logs:
Point your browser at port 5601 to access the Kibana UI. For example,
localhost:5601 or http://YOURDOMAIN.com:5601 if Kibana is running behind a
proxy.
Further info:
https://www.elastic.co/guide/en/kibana/current/setup.html

TODO:
Proxy setup for Kibana
Remove the stdout copy commands from fluent scripts, which is only kept for
debugging purpose.
Addition of more sources and sinks in conf file.

