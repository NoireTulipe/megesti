

The Flow Service API allows to:

    Upload a flow.
    Retrieve information related to a set of flows.
    Download a flow given its identifier

The resources of the API are :

    /flows : with creation and retrieval methods.
    /webhooks : creation, update, delete, list

Worflow example:

    POST /flows : provide the flow information & content
    POST /flows/search : retrieve flows given multiple criterias.
    GET /flows/{id} : download a flow based on its id.
    POST /webhooks : subscribe to a channel of event

History:

    1.0.0 : First release
    1.0.1 : Fixes following 2025/04/15 SG5 plenary meeting
        Remove AcknowledgementXXX enumerates from FlowType
        Acknowledgement is now based upon details (level, item, reason)
        Add the attachment number in the flow information
        Add query parameters docType & docIndex to aim a specific download
        Change pagination method, from cursors to offsets
    1.0.2 : Fixes following 2025/05/06 SG5 plenary meeting
        FlowId & TrackingId as not only UUID for more flexibility
        Add sha256 fingerprint to allow integrity check
        Add trackingId as a filter criteria and in the Flow object
        Add full FlowInfo object + submission date in POST response
        Add comments
    1.1.0 : Fixes following 2025/05/20 SG5 meeting
        Get operation: allows also to return the flow data when docType is set to Metadata
        Search operation: flowId is no longer a criteria, prefer too use the Get by Id operation
        Remove any reference to any attached document to the flow
        Refactor FullFlowInfo schema
        FlowType update (FRR 10.*) for reporting
        AcknowledgementDetail update to add a message and a code
        offset removal, do pagination using updatedAfter
        remove 206 status code
        Add StateInvoice & associated LC in FlowType enum
        Add extensible reason codes related to Life cycle errors
        Add ProcessingRule to the flow object & criteria
        Add webhooks callback contents
    1.2.0 :
        Webhook management, create, update, list, delete, get
        Add new flow types: B2G, B2GInt, B2GOutOfScope
        Add new client credentials OAuth2 workflow
        Optimized FlowInfo/FullFlowInfo/Flow schemas
        Add name in Flow schema
        Add OAuth2 securityScheme
        Add Header parameter Organization-Id to ease delegation

Server
Server:https://api.superpdp.tech/afnor-flow

Use authorization code to access data of another user after he gives his consent. Use client credentials to access your own data (similar to api key).

When initiating the Authorization Code Flow, you can pre-fill specific user and company details by appending the following query parameters to the /oauth2/authorize endpoint:

    login_hint: Prefills the user's email address. superpdp_company_number: Prefills the identification number of the company. Required if superpdp_company_number_scheme is provided superpdp_company_number_scheme: one of sandbox, fr_siren, be_numero_entreprise. Required if superpdp_company_number is provided 

Auth URL
:
/oauth2/authorize
	
Token URL
:
/oauth2/token
Redirect URL
:
https://galaxy.scalar.com/callback
Client ID
:
12345
Client Secret
:
Use PKCE
:
Credentials Location
:
Client Libraries
Shell Curl
Flow ​

Flow management
Flow Operations

    post/v1/flows
    post/v1/flows/search
    get/v1/flows/{flowId}

createFlow
Submit a new flow​

Submit a flow. A flow is a single-invoice file, with :

    an XML/PDF file with the data of the invoice

The flow is created with a flowInfo object, allowing to qualify the flow.

A flow can be :

    an invoice (CII, UBL, Factur-X,...)
    a lifecycle (CDAR)
    or a e-reporting file

Headers

    Request-Id
    Type: stringFormat: uuid

    Header parameter used to correlate logs from several components
    Organization-Id
    Type: string

    The organization that is aimed in a multi tenancy context

Body
multipart/form-data

    file
    Type: string
    required

    Flow file: Max size = 100 MB
    flowInfo
    required

    Signaling of the flow
        flowSyntax
        Type: string · FlowSyntaxenum
        required

        Syntax of the original file belonging to a flow
        values
            CII
            UBL
            Factur-X
            CDAR
            FRR
        name
        Type: string
        max length:  
        255
        required

        Name of the file
        flowProfile
        Type: string · FlowProfileenum
        values
            Basic
            CIUS
            Extended-CTC-FR
        processingRule
        Type: string · ProcessingRuleenum
            B2B : e-invoicing
            B2BInt : International B2B e-reporting
            B2C : B2C e-reporting
            B2G : e-invoicing for B2G sales
            B2GInt
            OutOfScope : Out of scope (not regulated flow)
            B2GOutOfScope
            ArchiveOnly : Archive only, no transmission
            NotApplicable : Not Applicable
        values
            B2B
            B2BInt
            B2C
            B2G
            B2GInt
            OutOfScope
            B2GOutOfScope
            ArchiveOnly
            NotApplicable
        sha256
        Type: string • base64
        Pattern: ^[a-f0-9]{64}$

        The sha256 is the fingerprint of the attached file:
            if provided in the request: it should be checked once received
            if not provided in the request: it may be computed and returned in the response
        trackingId
        Type: string · NotOnlyUuid
        max length:  
        36

        The tracking id is an external identifier and is used to track the flow by the sender

Responses

    202

    Identified Flow info: flow info + id + timestamp
        flowId
        Type: string · NotOnlyUuid
        max length:  
        36
        required

        Unique identifier supporting UUID but not only, for flexibility purpose
        flowSyntax
        Type: string · FlowSyntaxenum
        required

        Syntax of the original file belonging to a flow
        values
            CII
            UBL
            Factur-X
            CDAR
            FRR
        name
        Type: string
        max length:  
        255
        required

        Name of the file
        submittedAt
        Type: stringFormat: date-time
        required

        The flow submission date and time (the date and time when the flow was created on the system) This property should be used by the API consumer as a time reference to avoid clock synchronization issues
        flowProfile
        Type: string · FlowProfileenum
        values
            Basic
            CIUS
            Extended-CTC-FR
        processingRule
        Type: string · ProcessingRuleenum
            B2B : e-invoicing
            B2BInt : International B2B e-reporting
            B2C : B2C e-reporting
            B2G : e-invoicing for B2G sales
            B2GInt
            OutOfScope : Out of scope (not regulated flow)
            B2GOutOfScope
            ArchiveOnly : Archive only, no transmission
            NotApplicable : Not Applicable
        values
            B2B
            B2BInt
            B2C
            B2G
            B2GInt
            OutOfScope
            B2GOutOfScope
            ArchiveOnly
            NotApplicable
        sha256
        Type: string • base64
        Pattern: ^[a-f0-9]{64}$

        The sha256 is the fingerprint of the attached file:
            if provided in the request: it should be checked once received
            if not provided in the request: it may be computed and returned in the response
        trackingId
        Type: string · NotOnlyUuid
        max length:  
        36

        The tracking id is an external identifier and is used to track the flow by the sender
    400
    Type: object · Error

    Error 400 : Bad request.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    401
    Type: object · Error

    Error 401 : Authentication error.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    403
    Type: object · Error

    Error 403 : Forbidden.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    413
    Type: object · Error

    Error 413 : Payload Too Large.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    422
    Type: object · Error

    Error 422 : Unprocessable entity.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    429
    Type: object · Error

    Error 429 : Too many requests.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    500
    Type: object · Error

    Error 500 : Server Internal Error.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    503
    Type: object · Error

    Error 503 : Unavailable Resource.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference

Request Example for post/v1/flows

curl https://api.superpdp.tech/afnor-flow/v1/flows \
  --request POST \
  --header 'Content-Type: multipart/form-data' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --form 'file=;type=application/pdf, application/xml' \
  --form 'flowInfo={"flowProfile":"Basic","flowSyntax":"CII","name":"","processingRule":"B2B","trackingId":"","sha256":""};type=application/json'

{
  "flowId": "string",
  "submittedAt": "2026-05-19T10:05:36.441Z",
  "flowProfile": "Basic",
  "flowSyntax": "CII",
  "name": "string",
  "processingRule": "B2B",
  "trackingId": "string",
  "sha256": "string"
}

OK - Response message once the flow has been uploaded.
searchFlows
Select flows upon criteria​

Retrieves a set of flows matching the provided search criteria:

    Need at least one criterion to be specified
    Assuming a logical AND when combining criteria
    Assuming a logical OR for criteria allowing a list of values

Pagination works with the updatedAfter property The comparison with current date is strict : updatedAt > updatedAfter
Headers

    Request-Id
    Type: stringFormat: uuid

    Header parameter used to correlate logs from several components
    Organization-Id
    Type: string

    The organization that is aimed in a multi tenancy context

Body
application/json

    where
    Type: object · SearchFlowFilters
    required

    Filtering criteria, at least one is required
    limit
    Type: integer
    max:  
    100

    Maximum number of results that may be returned

Responses

    200
    Type: object · SearchFlowContent

    OK - Response message when returning the results of a search request.
        filters
        Type: object · SearchFlowFilters

        Filtering criteria, at least one is required
        limit
        Type: integer

        Integer numbers.
        results
        Type: array · Flow[]
    400
    Type: object · Error

    Error 400 : Bad request.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    401
    Type: object · Error

    Error 401 : Authentication error.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    403
    Type: object · Error

    Error 403 : Forbidden.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    429
    Type: object · Error

    Error 429 : Too many requests.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    500
    Type: object · Error

    Error 500 : Server Internal Error.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    503
    Type: object · Error

    Error 503 : Unavailable Resource.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference

Request Example for post/v1/flows/search

curl https://api.superpdp.tech/afnor-flow/v1/flows/search \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "limit": 25,
  "where": {
    "ackStatus": "Pending",
    "flowDirection": [
      "Out"
    ],
    "flowType": [
      "SupplierInvoice"
    ],
    "processingRule": [
      "B2B"
    ],
    "trackingId": "",
    "updatedAfter": "",
    "updatedBefore": ""
  }
}'

{
  "filters": {
    "ackStatus": "Pending",
    "flowDirection": [
      "Out"
    ],
    "flowType": [
      "SupplierInvoice"
    ],
    "processingRule": [
      "B2B"
    ],
    "trackingId": "string",
    "updatedAfter": "2026-05-19T10:05:36.441Z",
    "updatedBefore": "2026-05-19T10:05:36.441Z"
  },
  "limit": 1,
  "results": [
    {
      "flowProfile": "Basic",
      "flowSyntax": "CII",
      "name": "string",
      "processingRule": "B2B",
      "trackingId": "string",
      "flowId": "string",
      "submittedAt": "2026-05-19T10:05:36.441Z",
      "acknowledgement": {
        "details": [
          {
            "item": "string",
            "level": "Error",
            "reasonCode": "EmptyAttachement",
            "reasonMessage": "string"
          }
        ],
        "status": "Pending"
      },
      "flowDirection": "Out",
      "flowType": "SupplierInvoice",
      "processingRuleSource": "Input",
      "updatedAt": "2026-05-19T10:05:36.441Z"
    }
  ]
}

OK - Response message when returning the results of a search request.
getFlow
Download the file of a flow​

Download a file related to a given flow:

    an invoice
    a life cycle
    an e-reporting

Path Parameters

    flowId
    Type: string · NotOnlyUuid
    max length:  
    36
    required

    Flow identifier

Query Parameters

    docType
    Type: stringenum

    This parameter allows to provide the type of file to be downloaded, can be either one:
        Metadata [Default]: provides the flow metadata as a JSON payload, no download
        Original: the document that has been initially sent/provided by the emitter
        Converted: the document that has been optionally converted by the system
        ReadableView: the document that has been optionally generated as the readable file
    values
        Metadata
        Original
        Converted
        ReadableView

Headers

    Request-Id
    Type: stringFormat: uuid

    Header parameter used to correlate logs from several components
    Organization-Id
    Type: string

    The organization that is aimed in a multi tenancy context

Responses

    200

    The properties of a Flow resource
        acknowledgement
        Type: object · Acknowledgement
        required
        flowDirection
        Type: string · FlowDirectionenum
        required

        Direction of the flow:
            In: Incoming flow, from the PDP to the OD
            Out: Outgoing flow, from the OD to the PDP
        values
            In
            Out
        flowId
        Type: string · NotOnlyUuid
        max length:  
        36
        required

        Unique identifier supporting UUID but not only, for flexibility purpose
        flowSyntax
        Type: string · FlowSyntaxenum
        required

        Syntax of the original file belonging to a flow
        values
            CII
            UBL
            Factur-X
            CDAR
            FRR
        flowType
        Type: string · FlowTypeenum
        required
            CustomerInvoice: a non-self-billed outgoing invoice or a self-billed incoming invoice
            SupplierInvoice: a non-self-billed incoming invoice or self-billed outgoing invoice
            StateInvoice: an invoice Flow sent to DFH
            CustomerInvoiceLC: a lifecycle (CDAR) related to a customer invoice
            SupplierInvoiceLC: a lifecycle (CDAR) related to supplier invoice
            StateCustomerInvoiceLC: a customer invoice LC sent to DFH
            StateSupplierInvoiceLC: a supplier invoice LC sent to DFH
            AggregatedCustomerTransactionReport : a transaction E-Reporting flow containing aggregated B2C sales (FRR 10.3)
            IndividualCustomerTransactionReport: a transaction E-Reporting flow containing international B2B sales or a B2C transaction flow reported individually (FRR 10.1)
            AggregatedCustomerPaymentReport : a E-Reporting of collections flow containing collections linked to B2C sales (FRR 10.4)
            UnitaryCustomerPaymentReport : an E-Reporting of collections flow containing collections linked to unit international B2B sales or B2C sales (FRR 10.2)
            UnitarySupplierTransactionReport: a transaction E-Reporting flow containing international B2B purchases (FRR 10.1)
            MultiFlowReport: an E-Reporting flow which contains at least 2 different flow types (FRR 10)
        values
            CustomerInvoice
            SupplierInvoice
            StateInvoice
            CustomerInvoiceLC
            SupplierInvoiceLC
        name
        Type: string
        max length:  
        255
        required

        Name of the file
        processingRuleSource
        Type: stringenum
        required

        Says whether the processing rule has been computed or the processing rule was an input parameter
        values
            Input
            Computed
        submittedAt
        Type: stringFormat: date-time
        required

        The flow submission date and time (the date and time when the flow was created on the system) This property should be used by the API consumer as a time reference to avoid clock synchronization issues
        updatedAt
        Type: stringFormat: date-time
        required

        The last update date and time of the flow. When the flow is submitted updatedAt is equal to submittedAt. When the flow acknowledgment status is changed updatedAt date and time is updated.
        flowProfile
        Type: string · FlowProfileenum
        values
            Basic
            CIUS
            Extended-CTC-FR
        processingRule
        Type: string · ProcessingRuleenum
            B2B : e-invoicing
            B2BInt : International B2B e-reporting
            B2C : B2C e-reporting
            B2G : e-invoicing for B2G sales
            B2GInt
            OutOfScope : Out of scope (not regulated flow)
            B2GOutOfScope
            ArchiveOnly : Archive only, no transmission
            NotApplicable : Not Applicable
        values
            B2B
            B2BInt
            B2C
            B2G
            B2GInt
            OutOfScope
            B2GOutOfScope
            ArchiveOnly
            NotApplicable
        trackingId
        Type: string · NotOnlyUuid
        max length:  
        36

        The tracking id is an external identifier and is used to track the flow by the sender
    400
    Type: object · Error

    Error 400 : Bad request.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    401
    Type: object · Error

    Error 401 : Authentication error.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    403
    Type: object · Error

    Error 403 : Forbidden.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    404
    Type: object · Error

    Error 404 : Resource Not Found.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    429
    Type: object · Error

    Error 429 : Too many requests.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    500
    Type: object · Error

    Error 500 : Server Internal Error.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    503
    Type: object · Error

    Error 503 : Unavailable Resource.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference

Request Example for get/v1/flows/{flowId}

curl 'https://api.superpdp.tech/afnor-flow/v1/flows/{flowId}' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'

{
  "flowProfile": "Basic",
  "flowSyntax": "CII",
  "name": "string",
  "processingRule": "B2B",
  "trackingId": "string",
  "flowId": "string",
  "submittedAt": "2026-05-19T10:05:36.441Z",
  "acknowledgement": {
    "details": [
      {
        "item": "string",
        "level": "Error",
        "reasonCode": "EmptyAttachement",
        "reasonMessage": "string"
      }
    ],
    "status": "Pending"
  },
  "flowDirection": "Out",
  "flowType": "SupplierInvoice",
  "processingRuleSource": "Input",
  "updatedAt": "2026-05-19T10:05:36.441Z"
}

OK - Response message once the flow has been downloaded.
Supervisor ​

Service supervision
Supervisor Operations

    get/v1/healthcheck

getHealth
Check whether the API service is up and running.​
Headers

    Request-Id
    Type: stringFormat: uuid

    Header parameter used to correlate logs from several components
    Organization-Id
    Type: string

    The organization that is aimed in a multi tenancy context

Responses

    200

    OK - Operation succeeded
    500
    Type: object · Error

    Error 500 : Server Internal Error.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference
    503
    Type: object · Error

    Error 503 : Unavailable Resource.
        errorCode
        Type: string
        required

        Short numerical or alphanumerical code that identifies precisely a unique error.
        details
        Type: string
        errorMessage
        Type: string

        Contains information on the error. Not intended to be displayed to an end user. For security reasons, a tradeoff between clarity & security shall be found.
        instance
        Type: stringFormat: uri-reference
        type
        Type: stringFormat: uri-reference

Request Example for get/v1/healthcheck

curl https://api.superpdp.tech/afnor-flow/v1/healthcheck \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'

No Body

OK - Operation succeeded
Models

    authentication

    The authentication mode required for the callback call
        userId
        Type: string
        required
        userPassword
        Type: stringFormat: password
        required

        a hint to UIs to mask the input
    headers
    Type: array object[]
    signature
    Type: object