
	
	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log')
		, fs 			= require('fs')
		, assert 		= require('assert')
		, FSLoader 		= require('em-webfiles-loader-filesystem');



	var   WebFiles = require('../')
		, loader
		, files;


	var Request = new Class({

		init: function(file) {
		  this.pathname = file;
		}

		, getHeader: function(){
			return null;
		}
	});


	var Response = new Class({

		init: function(cb){
			this.cb = cb;
		}

		, setHeader: function(){}
		

		, send: function(){
			this.cb.apply(null, Array.prototype.slice.call(arguments));
		}
	});




	describe('WebFiles', function(){
		it('should not throw when instantiated', function(){
			files = new WebFiles();
		});

		it('should accept a fs loader instance', function(done){
			loader = new FSLoader({path: __dirname+'/files'});
			loader.on('load', function(err){
				if (err) done(err);
				else {
					files.use(loader);
					done();
				}
			});
		});

		it('should return the correct file on a request', function(done){
			files.request(new Request('/dir1/dir1_1/test.txt'), new Response(function(file, headers, status){
				assert.equal(file.toString().length, 5);
				assert.equal(JSON.stringify(headers), '{"Etag":"a2b2d66938b1f023dec6394f12b782b5","Content-Type":"text/plain; charset=UTF-8"}');
				assert.equal(status, 200);
				done();
			}), function(){
				done(new Error('file was not found'));
			});
		});


		it('should serve the direcotry index when requested', function(done){
			files.addDirectoryIndex('index.html');

			files.request(new Request('/dir1/'), new Response(function(file, headers, status){
				assert.equal(file.toString().length, 75);
				assert.equal(JSON.stringify(headers), '{"Etag":"4f5f6a5e6fcdee16bf222f1d18c120ec","Content-Type":"text/html; charset=UTF-8"}');
				assert.equal(status, 200);
				done();
			}), function(){
				done(new Error('file was not found'));
			});
		});
	});
	