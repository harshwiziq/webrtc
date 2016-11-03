/**
 *	create a queue of uploaded content.
 */ 
var queue = {};

var old_index = 1;
var new_index = 1;
var storage = {};
/*
 *	Method returns the size of the queue.
 */ 
queue.size  = function(){
	return (new_index - old_index);
};
/*
 *	Method add the item in queue.
 */ 
queue.add_item = function(data){
	storage[new_index] = data;
	new_index ++;
};
/*
 *	Method delete item from queue.
 */ 
queue.delete_item = function(){
	var _oldest_index = old_index;
	var _newest_index = new_index;
	if(_oldest_index !== _newest_index){
		delete storage[_oldest_index];
		old_index ++;
	}
};
/*
 *	Method used to get item from queue.
 */ 
queue.get_item = function(){
	if(old_index !== new_index){
		return storage[old_index];
	}
};
module.exports = queue;
