AFNOR Directory Service
Spécifications externes du PPF v3.0
SUPER PDP

The Directory Service API allows you to:

    View and search for companies (SIREN)
    View and search for establishments (SIRET)
    View, and search for routing codes
    View, and search for directory entries

Authentication : Each endpoint must be called with an access token (Bearer). This token is retrieved by a call to a token URL.
Siren

Company by Siren number

    POST /siren/search => Search for companies (legal unit) meeting all the criteria passed as parameters, potentially multiple results returned.
        Permissions : according to your permissions
        Request Body : { <search criteria in JSON format> }
            filters : the list of filters to apply to the search.
            sorting : sorting criteria by field with ascending or descending value.
            fields : the list of fields expected in the response.
            limit : the maximum number of results to return.
            ignore : a number designating the offset to apply to the returned results. Useful for pagination.
        Réponse : a paginated list of siren resources (legal unit).

    GET /siren/code-insee:{siren} => Consult a siren (legal unit) identified by a siren passed as a parameter.
        Permissions : according to your permissions
        Mandatory parameter: a SIREN number.
        Response : the details of a siren resource (legal unit).

Scenarios

Example scenarios :

    POST /siren/search => Search for companies (legal units) meeting all the criteria passed as parameters, potentially returning multiple results.

    GET /siren/code-insee:{siren} => Get company details.

Siret

Facility by SIRET number

    POST /siret/search => Search for establishments meeting all of the criteria passed as parameters, potentially returning multiple results.
        Permissions : according to your permissions
        Request body : { <search criteria in JSON format> }
            filters: the list of filters to apply to the search.
            sorting: sort criteria by field with ascending or descending value.
            fields: the list of fields expected in the response.
            include: the list of relationships (siren) to include in the returned results.
            limit: the maximum number of results to return.
            ignore: A number designating the offset to apply to the returned results. Useful for pagination.
        Response : a paginated list of SIRET (facility) resources.

    GET /siret/code-insee:{siret} => Get a SIRET (facility) identified by SIRET.
        Permissions : according to your permissions
        Mandatory parameter: a SIRET number.
        Response : the details of a SIRET resource (facility).

Scenarios

Example scenarios :

    POST /siret/search => Search for establishments meeting all of the criteria passed as parameters, potentially returning multiple results.

    GET /siret/code-insee:{siret} => Get the facility details.

Routing Code

    POST /routing-code/search => Search for routing codes that meet all the criteria passed as parameters, potentially returning multiple results.
        Permissions : according to your permissions
        Request body : { <search criteria in JSON format> }
            filters: the list of filters to apply to the search.
            sorting: sort criteria by field with ascending or descending value.
            fields: the list of fields expected in the response.
            limit: the maximum number of results to return
            ignore: A number designating the offset to apply to the returned results. Useful for pagination.
        Response : a paginated list of routing code resources.

    GET /routing-code/siret:{siret}/code:{routing-identifier} => Consult the routing code identified by the SIRET and a routing identifier.
        Permissions : according to your permissions
        Mandatory parameter: the SIRET number of the routing code for which you wish to obtain details.
        Mandatory parameter: the routing identifier for which you want to obtain details.
        Response : the detail of a routing code.

Scenarios

Example scenarios :

    POST /routing-code/search => Search for routing codes that meet all the criteria passed as parameters, potentially returning multiple results.

    GET /routing-code/siret:{siret}/code:{routing-identifier} => Get the details of a routing code by SIRET and a routing identifier.

Directory Line

The directory line is the location at which the recipient wishes to receive his invoices (SIREN or SIREN/SIRET or SIREN/SIRET/routingIdentifier). The routing identifier can be a service code, a GLN 0224 code, an ODETTE 0088 code or an internal management code used by the recipient.

    POST /directory-line/search => Search for directory lines that meet all the criteria passed as parameters, potentially returning multiple results.
        Permissions : according to your permissions
        Request body : { <search criteria in JSON format> }
            filters: the list of filters to apply to the search.
            sorting: sort criteria by field with ascending or descending value.
            fields: the list of fields expected in the response.
            limit: the maximum number of results to return
            ignore: A number designating the offset to apply to the returned results. Useful for pagination.
        Response : a paginated list of directory-line resources

    GET /directory-line/code:{addressing-identifier} => Get a line in the directory identified by an address identifier.
        Permissions : according to your permissions -Mandatory parameter: un identifiant addressage.
        Response : the detail of a directory line.

Scenarios

Example scenarios :

    POST /directory-line/search => Search for directory lines that meet all the criteria passed as parameters, potentially returning multiple results.

    GET /directory-line/code:{addressing-identifier} => Get a directory line.

Supervisor

    GET /healthcheck => Check if the Directory API is online.
        Permissions : according to your permissions

History:

    1.0.0 : First release
    1.1.0 : Fixes following SG5 meeting
        Remove the concept of history
        Remove the platformRegistrationNumber, effectiveEndDate, dateFrom and dateTo from the available filters, the payloads and the responses
        Remove PUT /v1/directory-line/id-instance:{id-instance}
        Add the major version number in the path
        Remove the PPF-affiliations from the headers
        Standardize the language so that no French remains in the SWAGGER
        Standardize the responses from GET /v1/siret/id-instance:{id-instance} and GET /v1/siret/code-insee:{siren}
        Modify the routingCode regex
        Change PDP to PA
        Translate PPF and PA into a UNTDID 3035 code
    1.2.0 : Fixes following 2026/01/12 SG5 meeting
        WARNING: Breaking changes occured in this version
        Remove POST /v1/directory-line
        Remove DELETE /v1/directory-line/id-instance:{id-instance}
        Remove PATCH /v1/directory-line/id-instance:{id-instance}
        Remove GET /v1/siren/id-instance:{id-instance}
        Remove GET /v1/siret/id-instance:{id-instance}
        Remove GET /v1/routing-code/id-instance:{id-instance}
        Remove GET /v1/directory-line/id-instance:{id-instance}
        Remove id-instance from the ressource fields
        Change platformStatus into directoryLineStatus
        Add Upcoming as a directoryLineStatus option
        Add OAuth2 security scheme
        Remove Accept-language and Content-Language from the header
        Change diffusible into salesProspectingForbidden
        Add 204 response for search routes

