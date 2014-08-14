!function() {


	var   Class 			= require('ee-class')
		, EventsEmitter		= require('ee-event-emitter')
		, log 				= require('ee-log')
		, async 			= require('ee-async')
		, type 				= require('ee-types')
		, argv 				= require('ee-argv');


	var debug = argv.has('dev-webfiles');




	module.exports = new Class({
		inherits: EventsEmitter

		
		, init: function(options) {
			Class.define(this, '_modules' 		, Class([]));
			Class.define(this, '_loaders' 		, Class([]));
			Class.define(this, '_directoryIndex', Class([]));
			Class.define(this, '_filters' 		, Class([]));

			if ((argv.has('live') || argv.has('webfiles-test')) && options && options.maxAge) this._maxAge = options.maxAge;
		}




		, request: function(request, response, next) {
			var index = 0;

			if (debug) log.info('Request on «'+request.pathname+'» ...');

			var execute = function() {
				if (this._loaders.length > index) {
					index++;
					this._handleRequestOnTree(this._loaders[index-1], request, response, execute);
				}
				else next();
			}.bind(this);
			
			execute();
		}


		, _handleRequestOnTree: function(loader, request, response, next) { 
			if (loader.hasFile(request.pathname)) {
				var file = loader.getFile(request.pathname);

				if (debug) log.debug('Hash for «'+request.pathname+'» found...');

				if (file.isDirectory) {
					if (debug) log.debug('Hash  «'+request.pathname+'» is a directory ...');

					// serve the directory index
					for(var i = 0, l = this._directoryIndex.length; i < l; i++) {
						if (file[this._directoryIndex[i]] && !file[this._directoryIndex[i]].isDirectory) {
							file = file[this._directoryIndex[i]];

							// thats the file we're looking for
							if (debug) log.debug('Found a directory index file for hash «'+request.pathname+'» ...');
							
							// check for etag
							if (request.getHeader('if-none-match') === file.etag) {
								if (debug) log.debug('Sending 304 for hash «'+request.pathname+'» ...');
								if (this._maxAge) response.setHeader('Cache-Control', 'max-age='+this._maxAge);
								response.send('', { Etag: file.etag, 'Content-Type': file.contentType }, 304);
							}
							else {
								if (debug) log.debug('Sending 200 for hash «'+request.pathname+'» ...');
								if (this._maxAge) response.setHeader('Cache-Control', 'max-age='+this._maxAge);
								response.send(file.data, {Etag: file.etag, 'Content-Type': file.contentType}, 200);
							}
							return;
						}
					}
				}
				else {
					if (debug) log.debug('Hash  «'+request.pathname+'» is a file ...');

					// check if the file mustn't be sent
					var i = this._filters.length;
					while(i--) {
						if (this._filters[i].test(file.filename)) {
							if (debug) log.warn('Hash  «'+request.pathname+'» is blacklisted, skipping ...');
							next();
							return;
						}
					}


					// serve file
					if (request.getHeader('If-None-Match') === file.etag) {
						if (debug) log.debug('Sending 304 for hash «'+request.pathname+'» ...');
						if (this._maxAge) response.setHeader('Cache-Control', 'max-age='+this._maxAge);
						response.send('', {Etag: file.etag, 'Content-Type': file.contentType}, 304);
					}
					else {
						if (debug) log.debug('Sending 200 for hash «'+request.pathname+'» ...');
						if (this._maxAge) response.setHeader('Cache-Control', 'max-age='+this._maxAge);
						response.send(file.data, { Etag: file.etag, 'Content-Type': file.contentType}, 200);
					}
					return;
				}
			}
			else {
				if (debug) log.debug('Hash for «'+request.pathname+'» NOT found...');
			}

			// no file matched ..
			next();
		}



		, addDirectoryIndex: function(hash) {
			if (type.array(hash)) {
				hash.forEach(function(item){
					if (debug) log('Adding directory index «'+item+'» ...');
					this._directoryIndex.push(item)
				}.bind(this));
			}
			else if (type.string(hash)) {
				if (debug) log('Adding directory index «'+hash+'» ...');
				this._directoryIndex.push(hash);
			}
			else throw new Error('Cannot add directory index hash «'+hash+'»');
		}



		, addFilter: function(filter){
			if (type.array(filter)) {
				hash.forEach(function(item){
					if (debug) log('Adding filter «'+item+'» ...');
					this._filters.push(item)
				}.bind(this));
			}
			else if (type.string(filter)) {
				if (debug) log('Adding filter «'+filter+'» ...');
				this._filters.push(filter);
			}
			else throw new Error('Cannot add filter «'+filter+'»');
		}



		, use: function(module) {
			if (type.function(module.isLoader) && module.isLoader()) {
				if (debug) log.warn('Adding loader ...');

				module.on('removeHash'	, this._handleHashRemove.bind(this));
				module.on('addHash'		, this._handleHashAdd.bind(this));

				this._loaders.push(module);
			}
			else {
				if (debug) log.warn('Adding module ...');
				this._modules.push(module);
			}
		}

		


		, _handleHashRemove: function(hash, file) {
			if (debug) log.debug('File «'+hash+'» was removed ...');

			async.each(this._modules, function(module, next){
				module.remove(hash, file, next);
			}.bind(this), function(){});
		}


		, _handleHashAdd: function(hash, file) {
			if (debug) log.debug('File «'+hash+'» was added ...');

			async.each(this._modules, function(module, next){
				module.add(hash, file, next);
			}.bind(this), function(){});
		}


		// load files
		, load: function(callback) {
			// intialize laoders
			async.each(this._loaders, function(loader, next){
				loader.load(function(err){
					if (err) next(err);
					else {
						async.each(this._modules, function(module, next){
							module.load(loader.tree, next);
						}.bind(this), next);
					}
				}.bind(this));
			}.bind(this), function(err){
				if (err && debug) {
					log.warn('Failed to load files: '+err);
				}
				callback(err);
			}.bind(this));
		}
	});
}();
