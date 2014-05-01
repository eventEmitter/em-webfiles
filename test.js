

	var   Webfiles 		= require( "./" )
		, Webservice 	= require( "../ee-webservice" )
	   	, log 			= require( "ee-log" );


	var files = new Webfiles();


	// serve index.html, index.json & default.htm files as directory index
	files.addDirectoryIndex( [ "index.html", "index.json" ] );
	files.addDirectoryIndex( "default.htm" );


	// don't serve dot, mustache & .php files
	files.addFilter( [ /\.mustache$/, /^\/\./ ] );
	files.addFilter( /\.php$/ );
	

	var service = new Webservice( {
		webserver: {
			http: {
				  interface: 	Webservice.IF_ANY 
				, port: 		12001
			}
		}
	} );

	service.use( files );


	files.load( __dirname + "/test/files", function( err ){
		service.listen();
	} );




	


	


	
