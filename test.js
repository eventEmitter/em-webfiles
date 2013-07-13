

	var  Webfiles 	= require( "./" )
	   , log 		= require( "ee-log" );


	var files = new Webfiles();


	files.load( __dirname + "/test/files", function( err ){
		if ( err ) throw err;
		log.dir( files.hashTree );
		log.dir( files.tree );
	} );