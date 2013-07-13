# em-webfiles

http files middleware for ee-webservice



	var  Webfiles 	= require( "ee-webfiles" )
	   , log 		= require( "ee-log" );


	var files = new Webfiles();



	// plugin module for ee-webfiles, you may use this to minify js / css or prerender templates or whatever
	var SomeCompilerModule = function(){

		// a file / folder was removed from the filesystem
		this.remove = function( parentPath, filename, subtree, tree, next ){
			// parentPath 	-> the folder that contains the removed file / folder
			// filename 	-> file or foldername of the removed file / folder
			// subtree 		-> the removed subtree
			// tree 		-> the tree representing the fs inside the memory
			// next 		-> call the next plugin module
		}


		// a file / folder was added to the filesystem
		this.add = function( parentPath, filename, subtree, tree, next ){
			// parentPath 	-> the folder that contains the added file / folder
			// filename 	-> file or foldername of the added file / folder
			// subtree 		-> the added subtree
			// tree 		-> the tree representing the fs inside the memory
			// next 		-> call the next plugin module
		}


		// initial load of the files from the fs
		this.load = function( path, tree, next ){
			// path 		-> the path of the directory to be laoded
			// tree 		-> the tree representing the fs inside the memory
			// next 		-> call the next plugin module
		}
	};


	// add submodule to stack
	files.use( new SomeCompilerModule() );


	// load  a directory into memory
	files.load( __dirname + "/var/www", function( err ){
		if ( err ) throw err;
		log.dir( files.tree );
	} );