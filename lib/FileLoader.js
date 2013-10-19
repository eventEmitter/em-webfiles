


	var   Class 	= require( "ee-class" )
		, Events 	= require( "ee-event" )
		, log 		= require( "ee-log" )
		, Waiter 	= require( "ee-waiter" )
		, mime 		= require( "mime" );


	var   fs 		= require( "fs" )
		, path 		= require( "path" )
		, crypto	= require( "crypto" );


	var File 		= require( "./File" );



	module.exports = new Class( {
		inherits: Events


		// root path of the dir
		, root: ""

		// cache for fs watch events
		, eventCache: {}



		, init: function( options ){
			this.persistent = options.persistent;			
		}



		, load: function( path, tree, next ){
			this.root = path;
			tree.isDirectory = true;

			this.__load( path, tree, "/", next );
		}


		// ignore this events since they are emitte by this module
		, remove: function( parentPath, filename, subtree, tree, next ){ next(); }
		, add: function( parentPath, filename, subtree, tree, next ){ next(); }



		, __load: function( dir, tree, basepath, callback ){

			// check if dir exists
			fs.exists( dir, function( exists ){
				if ( !exists ) callback( new Error( "dir [" + dir + "] doesnt exist!" ) );
				else {

					// add hash
					this.emit( "addHash", basepath, tree );

					// get file list for dir
					fs.readdir( dir, function( err, files ){
						if ( err ) callback( err );
						else {
							var waiter = new Waiter();

							// loop through all files
							files.forEach( function( file ){
								waiter.add( function( cb ){

									// stat each file
									fs.stat( path.join( dir, file ), function( err, stats ){
										if ( err ) callback( err );
										else {
											if ( stats.isDirectory() ){
												// recursively load directories
												tree[ file ] = Object.create( { isDirectory: true }, {} );
												this.__load( path.join( dir, file ), tree[ file ], basepath + file + "/", cb );
											}
											else {
												// load file from disk, store in tree
												fs.readFile( path.join( dir, file ), function( err, data ){
													if ( !err ) {
														var mimeType = mime.lookup( file );

														tree[ file ] = new File( { 
															  data: 		data
															, filename: 	file
															, path: 		path.join( basepath, file )
															, abspath: 		path.join( dir, file )
															, etag: 		this.__etag( data )
															, mimeType: 	mimeType
															, charset: 		mime.charsets.lookup( mimeType, "" )
														} );
														this.emit( "addHash", path.join( basepath, file ), tree[ file ] );
													}
													cb( err );
												}.bind( this ) );
											}
										}
									}.bind( this ) );
								}.bind( this ) );					
							}.bind( this ) );


							// start async loading
							waiter.start( function( err ){
								callback( err );
							}.bind( this ) );		
						}					
					}.bind( this ) );

					

					// wtahc dir for changes
					this.__addWatch( dir, tree, basepath );
				}
			}.bind( this ) );
		}


		// add watch to folder ( and collect events for 100msec so we have not to do to many duplicate jobs )
		// we're also ignoring the event type, emitting only the add && remove event
		, __addWatch: function( dir, tree, basepath ){
			var fswatch = fs.watch( dir, { persistent: this.persistent }, function( event, filename ){
				if ( !this.eventCache[ dir + filename ] ) this.eventCache[ dir + filename ] = {};
				if (this.eventCache[ dir + filename ] ) clearTimeout( this.eventCache[ dir + filename ].timer );

				this.eventCache[ dir + filename ].timer = setTimeout( function(){

					// do the actual event handling
					this.emit( "change" );
					this.__addWatchProxied( dir, tree, basepath, filename );
				}.bind( this ), 100 );
			}.bind( this ) );


			// store reference for watch
			Object.defineProperty( tree, "$__fswatch", { enumerable: false, configurable: true, writable: true, value: fswatch } );
		}




		, __addWatchProxied: function( dir, tree, basepath, filename ){
			var   file 			= tree[ filename ]
				, relativePath 	= "/" + dir.substr( this.root.length ).split( "/" ).filter( function( item ){ return typeof item === "string" && item.length > 0 } ).join( "/" );


			// deletes / moves are emitted as renames so we have to check for their existence
			fs.exists( path.join( dir, filename ), function( exists ){

				if ( exists ){

					// the file was loaded previously, remove it, load it new
					if ( file ) {
						delete tree[ filename ];
						this.__removeWatch( file );
						this.emit( "remove", relativePath, filename, file );
						this.emit( "removeHash", relativePath + "/" + filename, file );
					}

					// load the new file
					this.__loadFileOrDir( dir, filename, tree, basepath, relativePath );
				}
				else {
					// file / dir was removed
					if ( file ) {
						delete tree[ filename ];
						this.__removeWatch( file );
						this.emit( "remove", relativePath, filename, file );
						this.emit( "removeHash", relativePath + "/" + filename, file );
					}
				}
			}.bind( this ) );
		}




		, __loadFileOrDir: function( dir, filename, tree, basepath, relativePath ){
			fs.stat( path.join( dir, filename ), function( err, stats ){
				if ( !err ){
					if ( stats.isDirectory() ){

						// load directory
						tree[ filename ] = Object.create( { isDirectory: true }, {} );
						this.__load( path.join( dir, filename ), tree[ filename ], basepath + filename + "/", function( err ){
							this.emit( "add", relativePath, filename, tree[ filename ] );
						}.bind( this ) );
					}
					else {

						// load file
						fs.readFile( path.join( dir, filename ), function( err, data ){
							if ( !err ) {
								var mimeType = mime.lookup( filename );
								tree[ filename ] = new File( { 
									  data: 		data
									, filename: 	filename
									, path: 		path.join( basepath, filename )
									, abspath: 		path.join( dir, filename )
									, etag: 		this.__etag( data )
									, mimeType: 	mimeType
									, charset: 		mime.charsets.lookup( mimeType, "" )
								} );
								this.emit( "add", relativePath, filename, tree[ filename ] );
								this.emit( "addHash", path.join( basepath, filename ), tree[ filename ] );
							}
						}.bind( this ) );																								
					}
				}
			}.bind( this ) );
		}



		, __etag: function( data ){
			return crypto.createHash( "md5" ).update( data ).digest( "hex" );
		}



		, __removeWatch: function( file ){
			if ( file.isDirectory ){
				file.$__fswatch.close();

				var keys = Object.keys( file ), l = keys.length;
				while( l-- ) this.__removeWatch( file[ keys[ l ] ] );
			}
		}
	} );