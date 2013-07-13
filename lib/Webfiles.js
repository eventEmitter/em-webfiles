


	var   Class 	= require( "ee-class" )
		, Events 	= require( "ee-event" )
		, log 		= require( "ee-log" )
		, Waiter 	= require( "ee-waiter" );



	var FileLoader 	= require( "./FileLoader" );



	module.exports = new Class( {
		inherits: Events


		// the modules which are appleid to the file tree
		, modules: []

		// file tree
		, tree: Object.create( { isDirectory: true }, {} )


		, init: function( options ){
			// create loader
			var loader = new FileLoader( { 
				persistent: !!options.persistent
				, on: { 
					  remove: 	this.__remove.bind( this ) 
					, add: 		this.__add.bind( this ) 
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