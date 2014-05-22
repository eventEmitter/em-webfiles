# em-webfiles

http files middleware for ee-webservice

## installation 
	
	npm install em-webfiles

## build status


[![Build Status](https://travis-ci.org/eventEmitter/em-webfiles.png?branch=master)](https://travis-ci.org/eventEmitter/em-webfiles)



	var   Webfiles 	= require('ee-webfiles')
	    , FSLoader 	= require();


	var   files = new Webfiles()
		, loader = new FSLoader({path: '/path/to/files'});


	loader.on('load', function(err) {
		files.use(loader);
	});


	// serve index.html, index.json & default.htm files as directory index
	files.addDirectoryIndex( "default.htm" );
	

	webservice.use(files);