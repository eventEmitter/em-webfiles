


	var   Class 	= require( "ee-class" )
		, Events 	= require( "ee-event" )
		, log 		= require( "ee-log" )
		, Waiter 	= require( "ee-waiter" );



	var FileLoader 	= require( "./FileLoader" );



	module.exports = new Class( {
		inherits: Events


		// the modules which are appleid to the file tree
		, modules: []

		// directory indexes
		, directoryIndex: []

		// filters ( files to not to serve via http )
		, filters: []

		// file tree
		, tree: Object.create( { isDirectory: true }, {} )

		// quiicktree access via hash
		, hashTree: {}




		, init: function( options ){
			// create loader
			var loader = new FileLoader( { 
				persistent: !!options.persistent
				, on: { 
					  remove: 		this.__remove.bind( this ) 
					, add: 			this.__add.bind( this )
					, removeHash: 	function( hash, file ){ delete this.hashTree[ hash ]; }.bind( this )
					, addHash: 		function( hash, file ){ this.hashTree[ hash ] = file; }.bind( this )
				} 
			} );


			// add as first modeul
			this.use( loader );

			// root path
			this.path = options.path || "";
		}




		, use: function( module ){
			this.modules.push( module );
		}



		, addDirectoryIndex: function( items ){
			if ( !Array.isArray( items ) ) items = [ items ];
			this.directoryIndex = this.directoryIndex.concat( items );
		}



		, addFilter: function( items ){
			if ( !Array.isArray( items ) ) items = [ items ];
			this.filters = this.filters.concat( items );
		}




		, request: function( request, response, next ){
			if ( this.hashTree[ request.pathname ] ){
				var file = this.hashTree[ request.pathname ];

				if ( file ){
					if ( file.isDirectory ){

						// serve the directory index
						for( var i = 0, l = this.directoryIndex.length; i < l; i++ ){
							if ( file[ this.directoryIndex[ i ] ] && !file[ this.directoryIndex[ i ] ].isDirectory ){
								file = file[ this.directoryIndex[ i ] ];

								// thats the file we're looking for
								
								// check for etag
								if ( request.getHeader( "if-none-match" ) === file.etag ){
									response.send( "", { Etag: file.etag, "Content-Type": file.contentType }, 304 );
								}
								else {
									response.send( file.data, { Etag: file.etag, "Content-Type": file.contentType }, 200 );
								}
								return;
							}
						}
					}
					else {
						// check if the file mustn't be sent
						var i = this.filters.length;
						while( i-- ){
							if ( this.filters[ i ].test( file.filename ) ){
								next();
								return;
							}
						}


						// serve file
						if ( request.getHeader( "If-None-Match" ) === file.etag ){
							response.send( "", { Etag: file.etag, "Content-Type": file.contentType }, 304 );
						}
						else {
							response.send( file.data, { Etag: file.etag, "Content-Type": file.contentType }, 200 );
						}
						return;
					}
				}
			}


			// no file matched ..
			next();
		}




		// add a file / folder
		, __add: function( parentPath, filename, subtree ){
			var i = 0;

			// update all modules
			var execute = function(){
				this.modules[ i ].add( parentPath, filename, subtree, this.tree, function( err ){
					if ( !err ){
						i++;
						if ( this.modules.length > i ) execute();
					}
				}.bind( this ) );
			}.bind( this )

			// start updating
			execute();
		}



		// remove file / folder
		, __remove: function( parentPath, filename, subtree ){
			var i = 0;

			// update all modules
			var execute = function(){
				this.modules[ i ].remove( parentPath, filename, subtree, this.tree, function( err ){
					if ( !err ){
						i++;
						if ( this.modules.length > i ) execute();
					}
				}.bind( this ) );
			}.bind( this )

			// start updating
			execute();
		}




		// load files
		, load: function( path, callback ){
			if ( typeof path === "function" ) callback = path;
			else if ( typeof path === "string" ) this.path = path;

			var i = 0;

			// load all modules
			var execute = function(){
				this.modules[ i ].load( this.path, this.tree, function( err ){
					if ( err ){
						if ( typeof callback === "function" ) callback( err ); 					
					}
					else {
						i++;
						if ( this.modules.length > i ) execute();
						else {
							if ( typeof callback === "function" ) callback();
						}
					}
				}.bind( this ) );
			}.bind( this )

			// start loading
			execute();
		}
	} );