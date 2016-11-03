var promise                   = require('bluebird');
var moment                    = require('moment');
var ms_rest_azure             = require('ms-rest-azure');
var compute_management_client = require('azure-arm-compute');
var storage_management_client = require('azure-arm-storage');
var network_management_client = require('azure-arm-network');
var resource_management       = require('azure-arm-resource');
var azure                     = require('azure-storage');
var log                       = require('prov/app/common/log').child({ module : 'resources/azure' });

var resource_management_client     = resource_management.ResourceManagementClient;
var subscription_management_client = resource_management.SubscriptionClient;

var vm = {};

vm.create_vm = function (resource_config) {
	var _d = promise.pending();

	if (!resource_config || !resource_config.custom_config || !resource_config.class_config) {
		_d.reject('null or incomplete resource config');
		return _d.promise;
	}

	var vm_config    = resource_config.custom_config;
	var class_config = resource_config.class_config;
	
	var config = _set_variables (vm_config, class_config);
	if (!config) {
		_d.reject('bad config');
		return _d.promise;
	}

	/*
	 * Getting azure account credentials */
	var acc_config = vm_config.acc_config;
	ms_rest_azure.loginWithServicePrincipalSecret (
		acc_config.client_id,
		acc_config.secret_id,
		acc_config.tenant_id,
		function (err, _credentials) {

			if (err) 	
				return _d.reject (err);

			config.env.credentials = _credentials;
			config.clients         = create_clients (config.env.credentials, config.env.subscriptionId);

			vm_create (config)
				.then (
					function (_vm_info) {
						log.info ({vm_info : _vm_info }, 'vm create ok');
						/*
						 * DISCUSS THIS - what to do if pip_info fails, coz vm is created
						 * but pip info somehow failed
						 * how to tell provisioning what the public_ip of vm is?
						 */
						pip_info (config.vm.resource_group_name, config.vm.public_ip_name, config.clients.network_client)
							.then (
								function (_pip_info) {
									return _d.resolve ({
										vm_info         : _vm_info,
										pip_info        : _pip_info,
										resource_config : resource_config
									});
								},
								_d.reject.bind(_d)
							);
					},
					function (aggregate) {
						log.error ({error : aggregate.err}, 'vm create error');
						_delete_resources(aggregate);
						return _d.reject(aggregate.err);
					});
		});

	return _d.promise;
};

vm.list_all = function (custom_config, options) {
	var p = promise.pending ();

	var acc_config = custom_config.acc_config;
	ms_rest_azure.loginWithServicePrincipalSecret (
		acc_config.client_id,
		acc_config.secret_id,
		acc_config.tenant_id,
		function (err, _credentials) {

			if (err) 	
				return p.reject (err);

			var _clients = new compute_management_client (_credentials, acc_config.subscription_id);

			vm_list (_clients).then (
				function (_vm_array) {
					/*
					 * Just filter out some informatino */
					p.resolve (
						_vm_array.map (function (curr, index) {
							return {
								name  : curr.name,
								state : curr.provisioningState
							};
						})
					);
				},
				p.reject.bind(p)
			);
		});

	return p.promise;
};

function create_clients (credentials, subscriptionId) {
	var clients = {};

	clients.resource_client = new resource_management_client(credentials, subscriptionId);
	clients.compute_client  = new compute_management_client(credentials, subscriptionId);
	clients.storage_client  = new storage_management_client(credentials, subscriptionId);
	clients.network_client  = new network_management_client(credentials, subscriptionId);

	return clients;
}

function vm_create (config) {
	var _d = promise.pending();
	/*Task: Create VM. This is a fairly complex task.*/

		/*
		 * For now just rejecting if any error, will include delete resource functionality once it's properly written*/
	create_resource_group (config)
		.then (create_storage_account,     _d.reject.bind(_d))
		.then (create_vnet,                _d.reject.bind(_d))
		.then (get_subnet_info,            _d.reject.bind(_d))
		.then (create_public_ip,           _d.reject.bind(_d))
		.then (create_nic, 	               _d.reject.bind(_d))
		.then (create_virtual_machine,     _d.reject.bind(_d))
		.then (_d.resolve.bind(_d),        _d.reject.bind(_d))
	;

	return	_d.promise;
}

function vm_info (_resource_group_name, _vm_name, _client) {
	/*Get Information about the vm required Virtual Machine.*/
	var _d = promise.pending();

	log.info('Start of Task: Get VM Info about vm: ' + _vm_name);
	_client.virtualMachines.get(_resource_group_name, _vm_name, { expoand : 'instanceView' }, function (err, result) {
		if (err) {
			log.error({error : err}, 'error getting vm info :', _vm_name);
			return _d.reject(err);
		}
		return _d.resolve(result);
	});
	return _d.promise;
}

function pip_info (_resource_group, _pip_name, _client) {
	/*Get Information about the public ip of Virtual Machine.*/
	var _d = promise.pending();

	log.info('Start of Task: Get public ip info ' + _pip_name);
	_client.publicIPAddresses.get(_resource_group, _pip_name, function (err, result) {
		if (err) {
			log.error({error : err}, 'error getting public_ip info :', _pip_name);
			return _d.reject(err);
		}
		log.info ({ fqdn : result.dnsSettings.fqdn, ip : result.ipAddress }, 'remote ip information');
		return _d.resolve(result);
	});
	return _d.promise;
}


function create_resource_group (config) {
	var _d      = promise.pending();
	var vm      = config.vm;
	var clients = config.clients;
	var group_parameters = { location: vm.location };

	log.info('Creating resource group: ' + vm.resource_group_name);

	clients.resource_client.resourceGroups.createOrUpdate(vm.resource_group_name, group_parameters, function (err, result) {
		if (err) {
			log.error({error : err}, 'error creating resourcegroup :', vm.resource_group_name);
			return _d.reject (err);
		}

		return _d.resolve ({
			config : config,
			result : result
		});
	});
	return _d.promise;
}

function create_storage_account (aggregate) {
	var config  = aggregate.config;	
	var _d      = promise.pending();
	var vm      = config.vm;
	var clients = config.clients;

	log.info('Creating storage account: ' + vm.storage_account_name);
	var account_parameters = {
		location: vm.location,
		sku: {
			name: 'Standard_LRS'
		},
		kind: 'Storage',
	};
	clients.storage_client.storageAccounts.create(vm.resource_group_name, vm.storage_account_name, account_parameters, function (err, _storage_account_info) {
		if (err) {
			/*
			 * Storage should be created beforehand
			 * Because a custom_image is required to create VM's from.
			 * Which in turn requires a storage account
			 * Having no storage account at this point means
			 * Either no storage account and custom image (makes no sense)
			 * or badly configured prov-config-recording
			 */
			log.error({error : err}, 'Error creating storage :', vm.storage_account_name);
			return _d.reject ({
				err    :  err,
			   	config : config
			});
		}
		return _d.resolve ({
			config               : config,
		   	storage_account_info : 	_storage_account_info
		});
	});

	return _d.promise;
}

function create_vnet (aggregate) {
	var config  = aggregate.config;
	var _d      = promise.pending();
	var vm      = config.vm;
	var clients = config.clients;
	var dns1    = '8.8.8.8';
	var dns2    = '8.8.4.4';

	if (config.input_config.vm_config.vm_network.dns.length == 2)
		dns2 = config.input_config.vm_config.vm_network.dns[1];

	if (config.input_config.vm_config.vm_network.dns.length >= 1)
		dns1 = config.input_config.vm_config.vm_network.dns[0];

	var vnetParameters = {
		location: vm.location,
		addressSpace: {
			addressPrefixes: ['10.0.0.0/16']
		},
		dhcpOptions: {
			dnsServers: [ dns1, dns2 ]
		},
		subnets: [{ name: vm.subnet_name, addressPrefix: '10.0.0.0/24' }],
	};

	log.info('Creating vnet: ' + vm.vnet_name);

	clients.network_client.virtualNetworks.createOrUpdate(vm.resource_group_name, vm.vnet_name, vnetParameters, function (err, _vnet_info) {
		if (err) {
			log.error ({error : err}, 'Error creating vnet :', vm.vnet_name);
			return _d.reject ({
				err    :  err,
			   	config : config,
				which  : 'vnet',
			});
		}

		return _d.resolve ({
			config    : config,
		    vnet_info :	_vnet_info
		});
	});

	return _d.promise;
}

function get_subnet_info (aggregate) {
	var config  = aggregate.config;
	var _d      = promise.pending();
	var vm      = config.vm;
	var clients = config.clients;

	log.info('Getting subnet info for: ' + vm.subnet_name);

	clients.network_client.subnets.get(vm.resource_group_name, vm.vnet_name, vm.subnet_name, function (err, _subnet_info) {
		if (err) {
			log.error({error : err}, 'error getting subnet info :', vm.subnet_name, 'vnet :', vm.vnet_name);
			return _d.reject ({
				err    :  err,
				config : config,
				which  : 'vnet',
			});
		}

		return _d.resolve ({
			config      : config,
			subnet_info : _subnet_info,
		});
	});

	return _d.promise;
}

function create_public_ip (aggregate) {
	var config             = aggregate.config;
	var _subnet_info       = aggregate.subnet_info;
	var _d                 = promise.pending();
	var vm                 = config.vm;
	var clients            = config.clients;	
	var publicIPParameters = {
		location                : vm.location,
		publicIPAllocationMethod: 'Dynamic',
		dnsSettings             : {
			domainNameLabel     : vm.domain_name_label
		}
	};
	
	log.info('Creating public IP: ' + vm.public_ip_name);

	clients.network_client.publicIPAddresses.createOrUpdate(vm.resource_group_name, vm.public_ip_name, publicIPParameters, function (err, _pip_info) {

		if (err) {
			log.error({error : err}, 'error creating public ip :', vm.public_ip_name);

			return _d.reject ({
				err    :  err,
			   	config : config,
				which  : 'public_ip'
			});
		}

		return _d.resolve({
			config          : config,
			subnet_info     : _subnet_info,
			public_ip_info  : _pip_info
		});
	});

	return _d.promise;
}

function create_nic (aggregate) {
	var config  = aggregate.config;
	var _d      = promise.pending();
	var vm      = config.vm;
	var clients = config.clients;
	var nic_parameters = {
		location: vm.location,
		ipConfigurations: [
			{
				name                     : vm.ip_config_name,
				privateIPAllocationMethod: 'Dynamic',
				subnet                   : aggregate.subnet_info,
				publicIPAddress          : aggregate.public_ip_info
			}
		]
	};

	log.info('Creating Network Interface: ' + vm.network_interface_name);

	clients.network_client.networkInterfaces.createOrUpdate(vm.resource_group_name, vm.network_interface_name, nic_parameters, function (err, _nic_info) {

		if (err) {
			log.error ({error : err}, 'error creating NIC :', vm.network_interface_name);

			return _d.reject ({
				err    :  err,
				config : config,
				which  : 'nic',
			});
		}

		return _d.resolve ({
			config   : config,
		    nic_info : _nic_info,
		});
	});

	return _d.promise;
}

function create_virtual_machine (aggregate) {
	var config  = aggregate.config;
	var _d      = promise.pending();
	var vm      = config.vm;
	var clients = config.clients;
	var vm_parameters = {
		location  : vm.location,
		osProfile : {
			computerName  : vm.vm_name,
			adminUsername : config.input_config.vm_config.user,
			adminPassword : config.input_config.vm_config.password
		},
		hardwareProfile : {
			vmSize : 'Standard_D3_V2'
		},
		storageProfile : {
			osDisk : {
				osType       : 'Linux',
				name         : vm.os_disk_name,
				caching      : 'None',
				createOption : 'fromImage',
				image : {
					uri      : config.input_config.vm_config.os.image_uri,
				},
				vhd : { 
					uri      : 'https://' + vm.storage_account_name + '.blob.core.windows.net/recbotvhds/' + vm.vhd_name + '.vhd' 
				}
			},
		},
		networkProfile : {
			networkInterfaces : [
				{
					id      : aggregate.nic_info.id,
					primary : true
				}
			]
		}
	};

	log.info('Creating Virtual Machine: ' + vm.vm_name);

	clients.compute_client.virtualMachines.createOrUpdate (vm.resource_group_name, vm.vm_name, vm_parameters, function (err, _vm_info) {

		if (err) {
			log.error ({error : err}, 'error creating vm:', vm.vm_name);

			return _d.reject ({
				err    : err,
			   	config : config,
				which  : 'vm',
			});
		}

		return _d.resolve (_vm_info);
	});

	return _d.promise;
}

vm.delete_vm = function (data) {
	var _d = promise.pending();

	var config = {
		vm      : {},
		clients : {},
		env     : data.custom_config.acc_config,
	};
	config.vm.vm_name             = data.custom_config.vm_config.name;
	config.vm.resource_group_name = data.custom_config.vm_config.resource_group_name;

	config = _create_vm_namespace (config);

	/*Getting azure account credentials*/
	ms_rest_azure.loginWithServicePrincipalSecret(config.env.client_id, config.env.secret_id, config.env.tenant_id, function (err, _credentials) {
		if (err) 	
			return _d.reject(err);

		config.env.credentials                = _credentials;
		config.clients                        = create_clients(config.env.credentials, config.env.subscription_id);
		config.input_config = data.custom_config;

		var aggregate = {
			config : config,
			which  : 'via-command',
		};

		_delete_resources(aggregate)
		.then (
			_d.resolve.bind(_d),
			_d.reject.bind(_d)
		);
	});

	return _d.promise;
};

function _delete_resources (aggregate) {
	var _d = promise.pending();

	var config = aggregate.config;
	var which  = aggregate.which;


	if (!which) {
		log.info ('No recording resource to delete');
		_d.reject('no resource to delete');
		return _d.promise;
	}

	if (which !== 'via-command')
		log.error ({ data : aggregate }, 'vm create failed at "' + which + '". deallocating recources');

	_delete_vm(config.vm.resource_group_name, config.vm.vm_name, config.clients.compute_client)
		.then(_delete_nic.bind     (null, config.vm.resource_group_name, config.vm.network_interface_name, config.clients.network_client),  _d.reject.bind(_d))
		.then(_delete_pip.bind     (null, config.vm.resource_group_name, config.vm.public_ip_name,         config.clients.network_client),  _d.reject.bind(_d))
		.then(_delete_vnet.bind    (null, config.vm.resource_group_name, config.vm.vnet_name,              config.clients.network_client),  _d.reject.bind(_d))
		.then(_delete_vhd.bind     (null, config.input_config.store.custom_info, config.vm.vhd_name),                                       _d.reject.bind(_d))
		.then(
			function () {
				log.info ({
					vm   : config.vm.vm_name,
					nic  : config.vm.network_interface_name,
					pip  : config.vm.public_ip_name,
					vnet : config.vm.vnet_name,
					vhd  : config.vm.vhd_name,
				}, 'delete ok');

				return _d.resolve('vm resources delete ok');
			},
			function (err) {
				/*
				 * This is fatal, this error will incur compute cost
				 * as the resource will keep on running on azure
				 * DO SOME NOTIFICATION HERE
				 */
					log.error ({error : err}, 'vm resource delete error');
					return _d.reject(err);
				})
	;
	return _d.promise;
}

function _delete_vm (resource_group, name, client) {
	var _d = promise.pending();

	log.info({vm : name}, 'deleting vm');

	client.virtualMachines.deleteMethod(resource_group, name, function (err, result) {
		if (err) {
			log.error({vm : name, resource_group : resource_group, error : err}, 'vm delete error');
			return _d.reject(err);
		}
		return _d.resolve();
	});
	return _d.promise;
}

function _delete_nic (resource_group, name, client) {
	var _d = promise.pending();

	log.info({nic : name}, 'deleting network interface card');

	client.networkInterfaces.deleteMethod(resource_group, name, function (err, result) {
		if (err) {
			log.error ({nic : name, resource_group : resource_group, error : err}, 'Network Interface Card delete error');
			return _d.reject(err);
		}
		return _d.resolve();
	});
	return _d.promise;
}

function _delete_pip (resource_group, name, client) {
	var _d = promise.pending();

	log.info({pip : name}, 'deleting public ip');

	client.publicIPAddresses.deleteMethod(resource_group, name, function (err, result) {
		if (err) {
			log.error ({pip : name, resource_group : resource_group, error : err}, 'publicIP delete error');
			return _d.reject(err);
		}
		return _d.resolve();
	});
	return _d.promise;
}

function _delete_vnet (resource_group, name, client) {
	var _d = promise.pending();

	log.info({vnet : name}, 'deleting virtual network');

	client.virtualNetworks.deleteMethod(resource_group, name, function (err, result) {
		if (err) {
			log.error ({vnet : name, resource_group : resource_group, error : err}, 'vnet delete error');
			return _d.reject(err);
		}
		return _d.resolve();
	});
	return _d.promise;
}

function _delete_vhd (blob_config, vhd_name) {
	var p = promise.pending();
	var blob;

	log.info ({vhd : vhd_name}, 'deleting vhd');

	try {
		blob = azure.createBlobService (blob_config.azure_strg_name, blob_config.azure_strg_key);
	} catch (e) {
		log.error ({ err : e, blob_config : blob_config }, 'create blob service error');
		p.reject (e);
		return p.promise;
	}

	blob.deleteBlob ('recbotvhds', vhd_name, function (err, result) {
		if (err && err.code !== 'BlobNotFound') {
			log.error ({ err : err, blob : blob_config, vhd : vhd_name }, 'vhd delete error');
			return p.reject (err);
		}

		return p.resolve ();
	});

	return p.promise;
}

function __seed_name (class_id) {
	/*
	 * Create seed for Azure resources (24 chars long):
	 *    RRRRC{20}
	 *        - RRRR is reserved for prefixes and such
	 *    C{20} --> X{10}YYmmddHHMMss
	 *        - where X{10} is the first 10 characters of class id
	 */
	var d_str = moment().format ('YYMMDDHHmmss');
	var class_id_split = class_id.substring (0, 8);

	return class_id_split.replace (/[^0-9a-zA-Z]/g, 'x').toLowerCase() + d_str;
}

function _set_variables (vm_config, class_config) {

	/* Check if credentials are specified */
	if (!vm_config ||
	    !vm_config.acc_config ||
	    !vm_config.acc_config.client_id ||
		!vm_config.acc_config.secret_id ||
		!vm_config.acc_config.tenant_id ||
		!vm_config.acc_config.subscription_id
	   ) {
		   log.error ('environment parameters missing');
		   return null;
	   }

	/* Check if VM variables exist */
	if (!vm_config.vm_config ||
	    !vm_config.vm_config.location ||
		!vm_config.vm_config.resource_group_name ||
		!class_config.class_id
	   ) {
		   log.error ('vm parameters missing');
		   return null;
	   }

	/*
	 * Modify class id to suit Azure resttrictions. Copy/Pasting verbatim:
	 *     "Resource account name must be between 3 and 24 characters in length
	 *      and use numbers and lower-case letters only."
	 */
	var __seed = __seed_name (class_config.class_id);

	var _vm    = {};

	_vm.location               = vm_config.vm_config.location;
	_vm.resource_group_name    = vm_config.vm_config.resource_group_name;
	_vm.storage_account_name   = vm_config.store.custom_info.azure_strg_name;
	_vm.class_id               = vm_config.vm_config.class_id;

	/*
	 * Remove storage account hardcoding from here, this will come from provisioning*/
	_vm.vhd_name               = 'vhd'  + __seed;
	_vm.vnet_name              = 'vnet' + __seed;
	_vm.subnet_name            = 'snet' + __seed;
	_vm.public_ip_name         = 'pip'  + __seed;
	_vm.network_interface_name = 'nic'  + __seed;
	_vm.ip_config_name         = 'ip'   + __seed;
	_vm.domain_name_label      = 'dom'  + __seed;
	_vm.os_disk_name           = 'disk' + __seed;
	_vm.vm_name                = 'vm'   + __seed;

	var config = {};
	config.vm  = _vm;
	config.env = {
		clientId       : vm_config.acc_config.client_id,
		secret         : vm_config.acc_config.secret_id,
		tenant         : vm_config.acc_config.tenant_id,
		subscriptionId : vm_config.acc_config.subscription_id,
	};

	/*
	 * Store this anyways as anything could be used downstream */
	config.input_config = vm_config;

	return config;
}

function _create_vm_namespace (_config) {
	/*
	 * Creating names of other resources from vm_name 
	 * as all resources share same __seed only prefix are different
	 */
	var __seed = _config.vm.vm_name.substring(2);

	_config.vm.vnet_name              = 'vnet' + __seed;
	_config.vm.public_ip_name         = 'pip'  + __seed;
	_config.vm.network_interface_name = 'nic'  + __seed;
	_config.vm.vhd_name               = 'vhd'  + __seed + '.vhd';

	return _config;
}

/* These functions are not used as of now
 * left in case future use arise
 */
function vm_shutdown (_resource_group_name, _vm_name, _client) {
	/*Poweroff the VM.This will still incur computation costs, since the machine is not deprovisioned*/
	var _d = promise.pending();

	log.info('Start of Task: Poweroff the vm: ' + _vm_name);
	_client.virtualMachines.powerOff(_resource_group_name, _vm_name, function (err, result) {
		if (err) {
			log.error({error : err}, 'Error in vm shutdown :', _vm_name);
			return _d.reject(err);
		}
		return _d.resolve(result);
	});
	return _d.promise;
}

function vm_start (_resource_group_name, _vm_name, _client) {
	/*Start the vm*/
	var _d = promise.pending();

	log.info('Start of Task: Start the vm: ' + _vm_name);
	_client.virtualMachines.start(_resource_group_name, _vm_name, function (err, result) {
		if (err) {
			log.error({error : err}, 'Error starting vm :', _vm_name);
			return _d.reject(err);
		}
		return _d.resolve(result);
	});
	return _d.promise;
}

function vm_list (_client) {
	/*Lisitng All the VMs under the subscription.*/
	var _d = promise.pending();

	_client.virtualMachines.listAll (function (err, result) {
		if (err) {
			log.error({error : err}, 'Error listing vms');
			return _d.reject(err);
		}
		return _d.resolve(result);
	});
	return _d.promise;
}


function vm_delete_resource_group (_resoure_group_name, _client) {
	/*Task7: Deleting the resourcegroup.*/
	log.info('Start of Task: Delete the resourcegroup :', _resource_group_name);
	_client.resourceGroups.beginDeleteMethod(_resource_group_name, function (err, result) {
		if (err) {
			log.error({error : err}, 'error deleting resource group :', _resource_group_name);
			return _d.reject(err);
		}
		return _d.resolve(result);
	});
	return _d.promise;
}

module.exports = vm;
