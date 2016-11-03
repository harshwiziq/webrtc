#!/bin/bash

wget -q http://download.redis.io/releases/redis-3.0.7.tar.gz
tar zxf redis-3.0.7.tar.gz
cd redis-3.0.7
make 
make install

#
# Daemonize Redis
#
mkdir /etc/redis
mkdir /var/redis
mkdir /var/redis/6379

cp utils/redis_init_script /etc/init.d/redis_6379
cp ../configs/redis/redis.conf /etc/redis/6379.conf

#
# Set to run by default and start it
#
sudo update-rc.d redis_6379 defaults
/etc/init.d/redis_6379 start
