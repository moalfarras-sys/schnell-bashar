declare module "docusign-esign" {
  export class ApiClient {
    setOAuthBasePath(basePath: string): void;
    setBasePath(basePath: string): void;
    addDefaultHeader(header: string, value: string): void;
    getUserInfo(accessToken: string): Promise<{
      accounts?: Array<{
        accountId?: string;
        baseUri?: string;
        isDefault?: string | boolean;
      }>;
    }>;
    requestJWTUserToken(
      integrationKey: string,
      userId: string,
      scopes: string[],
      privateKey: string,
      expiresIn: number,
    ): Promise<{ body: { access_token: string; expires_in: number; token_type?: string } }>;
  }

  export class EnvelopesApi {
    constructor(client: ApiClient);
    createEnvelope(
      accountId: string,
      opts: { envelopeDefinition: EnvelopeDefinition },
    ): Promise<{ envelopeId: string }>;
    createRecipientView(
      accountId: string,
      envelopeId: string,
      opts: { recipientViewRequest: RecipientViewRequest },
    ): Promise<{ url: string }>;
    update(
      accountId: string,
      envelopeId: string,
      opts: { resendEnvelope: string; envelope: { status: string } },
    ): Promise<unknown>;
    getDocument(
      accountId: string,
      envelopeId: string,
      documentId: string,
    ): Promise<unknown>;
  }

  export class EnvelopeDefinition {
    emailSubject: string;
    status: string;
    documents: Document[];
    recipients: Recipients;
    eventNotification: EventNotification;
  }

  export class Document {
    documentBase64: string;
    name: string;
    fileExtension: string;
    documentId: string;
  }

  export class Signer {
    email: string;
    name: string;
    recipientId: string;
    routingOrder: string;
    clientUserId?: string;
    tabs: Tabs;
  }

  export class SignHere {
    documentId: string;
    pageNumber: string;
    recipientId: string;
    tabLabel: string;
    xPosition: string;
    yPosition: string;
  }

  export class Tabs {
    signHereTabs: SignHere[];
  }

  export class Recipients {
    signers: Signer[];
  }

  export class RecipientViewRequest {
    returnUrl: string;
    authenticationMethod: string;
    email: string;
    userName: string;
    clientUserId?: string;
  }

  export class EventNotification {
    url: string;
    loggingEnabled: string;
    requireAcknowledgment: string;
    useSoapInterface: string;
    includeCertificateWithSoap: string;
    signMessageWithX509Cert: string;
    includeDocuments: string;
    includeEnvelopeVoidReason: string;
    includeTimeZone: string;
    includeSenderAccountAsCustomField: string;
    includeDocumentFields: string;
    includeCertificateOfCompletion: string;
    envelopeEvents: EnvelopeEvent[];
  }

  export class EnvelopeEvent {
    envelopeEventStatusCode: string;
  }

  const _default: {
    ApiClient: typeof ApiClient;
    EnvelopesApi: typeof EnvelopesApi;
    EnvelopeDefinition: typeof EnvelopeDefinition;
    Document: typeof Document;
    Signer: typeof Signer;
    SignHere: typeof SignHere;
    Tabs: typeof Tabs;
    Recipients: typeof Recipients;
    RecipientViewRequest: typeof RecipientViewRequest;
    EventNotification: typeof EventNotification;
    EnvelopeEvent: typeof EnvelopeEvent;
  };
  export default _default;
}
